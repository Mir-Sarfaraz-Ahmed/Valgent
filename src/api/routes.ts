import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { GithubFetcher } from '../github/fetcher';
import { ProjectMapper } from '../analyzers/mapper';
import { DocumentAnalyzer } from '../analyzers/document';
import { StaticAnalyzer } from '../analyzers/static';
import { EvidenceEngine } from '../evidence/engine';
import { LLMRouter } from '../llm/router';
import { GeminiProvider } from '../llm/gemini';
import { OpenRouterProvider } from '../llm/openrouter';
import { ExecutionOrchestrator } from '../agents/execution';
import { ValidationEngine } from '../validation/engine';
import { ValidationOrchestrator } from '../validation/orchestrator';
import { ProjectReport, AnalysisStage } from '../shared/types';
import { PipelineTracker } from '../shared/pipeline';
import { redactSecrets, classifyLlmError, classifyError, AnalysisError } from '../shared/errors';
import { ContextDigester } from '../context/digest';
import { ProjectStore } from './project-store';

const router = Router();

const AnalyzeRequestSchema = z.object({
  repository_url: z.string().url(),
  commit_sha: z.string().optional(),
  project_id: z.string().optional(),
  claims: z.array(z.object({
    claim_id: z.string(),
    text: z.string()
  })).optional(),
  analysis_options: z.object({
    skip_llm: z.boolean().optional(),
    skip_execution: z.boolean().optional(),
    timeout_ms: z.number().positive().optional()
  }).optional(),
  execution_policy: z.object({
    allow_install: z.boolean().optional(),
    allow_build: z.boolean().optional(),
    allow_tests: z.boolean().optional(),
    timeout_ms: z.number().positive().optional(),
    memory_limit_mb: z.number().positive().optional()
  }).optional(),
  llm_policy: z.object({
    preferred_providers: z.array(z.string()).optional(),
    timeout_ms: z.number().positive().optional()
  }).optional()
});

/**
 * Structured pipeline log. Prefixes every message with analysis_id.
 * Never logs secrets.
 */
function plog(analysisId: string, message: string): void {
  console.log(`[${analysisId}] ${redactSecrets(message)}`);
}

function perr(analysisId: string, message: string, error?: any): void {
  const errMsg = error ? `: ${redactSecrets(String(error?.message || error))}` : '';
  console.error(`[${analysisId}] ${redactSecrets(message)}${errMsg}`);
}

router.post('/analyze', async (req: Request, res: Response) => {
  const analysisId = crypto.randomUUID();
  const tracker = new PipelineTracker(analysisId, req.body?.repository_url || 'unknown', req.body?.commit_sha);
  let descriptor: any = null;

  tracker.enterStage('INITIALIZED');
  plog(analysisId, 'Starting analysis for request');

  try {
    // Validate request
    const body = AnalyzeRequestSchema.parse(req.body);

    const execPolicy = {
      allowDependencyInstall: body.execution_policy?.allow_install ?? true,
      allowBuild: body.execution_policy?.allow_build ?? true,
      allowTests: body.execution_policy?.allow_tests ?? true,
      timeoutMs: body.execution_policy?.timeout_ms ?? 120000,
      memoryLimit: body.execution_policy?.memory_limit_mb ?? 1024,
      cpuLimit: 2
    };
    const orchestrator = new ExecutionOrchestrator(execPolicy);

    const llmTimeoutMs = body.llm_policy?.timeout_ms ?? 30000;
    const providers = [];
    if (body.llm_policy?.preferred_providers) {
      for (const pref of body.llm_policy.preferred_providers) {
        if (pref === 'gemini') providers.push(new GeminiProvider(llmTimeoutMs));
        if (pref === 'openrouter') providers.push(new OpenRouterProvider(llmTimeoutMs));
      }
    }
    if (providers.length === 0) {
      providers.push(new GeminiProvider(llmTimeoutMs));
      providers.push(new OpenRouterProvider(llmTimeoutMs));
    }
    const llmRouter = new LLMRouter(providers);

    // 1. Fetch Repository
    tracker.enterStage('INGESTING');
    plog(analysisId, 'Fetching repository...');
    descriptor = await GithubFetcher.fetch(body.repository_url, body.commit_sha);
    plog(analysisId, `Fetched at ${descriptor.local_path} (commit: ${descriptor.commit_sha})`);

    const engine = new EvidenceEngine();

    // 2. Map Project
    tracker.enterStage('PROJECT_MAPPED');
    plog(analysisId, 'Mapping project...');
    const map = await ProjectMapper.map(descriptor);

    // 3. Extract Claims (record if present)
    if (body.claims && body.claims.length > 0) {
      tracker.enterStage('CLAIMS_EXTRACTED');
      plog(analysisId, `Extracted ${body.claims.length} claims from request`);
    }

    // 4. Document Analysis & Static Analysis
    tracker.enterStage('STATIC_ANALYSIS');
    plog(analysisId, 'Analyzing documentation & static analysis...');
    await DocumentAnalyzer.analyze(descriptor, engine);
    const semanticModel = await StaticAnalyzer.analyze(descriptor, map, engine);

    // 5. Dynamic Analysis (Execution)
    let executionResult: any = undefined;
    if (body.analysis_options?.skip_execution) {
      plog(analysisId, 'Skipping dynamic analysis (execution) per request options');
      executionResult = {
        supported: true,
        telemetry: {
          execution_id: `EXE-SKIPPED-${crypto.randomUUID().substring(0,8)}`,
          started_at: new Date().toISOString(),
          duration_ms: 0,
          package_manager: { name: 'unknown', confidence: 'LOW', detected_from: 'skip_execution', warnings: [] },
          container: { image: 'none', network_mode: 'none', cpu_limit: '0', memory_limit: '0', pid_limit: '0' },
          phases: [
            { phase: 'INSTALL', status: 'NOT_ATTEMPTED', duration_ms: 0, network_enabled: false, skip_reason: 'skip_execution=true' },
            { phase: 'BUILD', status: 'NOT_ATTEMPTED', duration_ms: 0, network_enabled: false, skip_reason: 'skip_execution=true' },
            { phase: 'TEST', status: 'NOT_ATTEMPTED', duration_ms: 0, network_enabled: false, skip_reason: 'skip_execution=true' }
          ]
        }
      };
    } else {
      tracker.enterStage('DYNAMIC_ANALYSIS');
      plog(analysisId, 'Performing dynamic analysis (execution)...');
      executionResult = await orchestrator.orchestrate(descriptor, map, engine);
      if (executionResult?.telemetry?.execution_id) {
        tracker.addExecutionId(executionResult.telemetry.execution_id);
      }
    }

    // 6. Build Evidence Graph
    tracker.enterStage('EVIDENCE_BUILT');
    plog(analysisId, 'Building evidence graph...');
    const { EvidenceGraphBuilder } = require('../evidence/graph-builder');
    const graphBuilder = new EvidenceGraphBuilder();
    const execResults = executionResult?.telemetry ? [executionResult.telemetry] : [];
    const evidenceGraphObj = graphBuilder.build(body.claims || [], engine.getEvidence(), semanticModel, execResults);
    const evidenceGraph = evidenceGraphObj.serialize();

    // Record evidence IDs
    for (const ev of engine.getEvidence()) {
      tracker.addEvidenceId(ev.evidence_id);
    }

    // Generate Context Digest
    plog(analysisId, 'Generating repository context digest...');
    const contextDigest = ContextDigester.generate({
      repoPath: descriptor.local_path,
      maxFileSize: 50 * 1024, // 50KB max per file
      ignorePatterns: []
    });

    // 7. AUTONOMOUS_VALIDATION
    let claimsValidation: any = { validations: [], roadmap: [], audit_warnings: [], audit_trail: [] };

    // We create a disabled provider for skip_llm so that the ValidationEngine degrades gracefully
    const effectiveLlmRouter = body.analysis_options?.skip_llm ?
      {
        name: 'disabled',
        analyzeEvidence: async () => { throw new Error('LLM skipped by policy'); },
        validateClaims: async () => { throw new Error('LLM skipped by policy'); }
      } : llmRouter;

    if (body.claims && body.claims.length > 0) {
      tracker.enterStage('AUTONOMOUS_VALIDATION');
      plog(analysisId, body.analysis_options?.skip_llm ? 'Autonomous validation (LLM skipped)...' : 'Autonomous validation...');
      const valOrch = new ValidationOrchestrator(engine, descriptor.local_path, body.analysis_options?.skip_execution);

      try {
        claimsValidation = await valOrch.orchestrate(body.claims, evidenceGraphObj, effectiveLlmRouter as any, contextDigest);
      } catch (err: any) {
        perr(analysisId, 'Autonomous validation failed', err);
        claimsValidation.audit_warnings.push({ message: err.message });
      }
    }

    // Record validation action IDs
    if (claimsValidation.audit_trail) {
      for (const action of claimsValidation.audit_trail) {
        if (action.decision_id) tracker.addValidationActionId(action.decision_id);
      }
    }

    // 8. LLM_SYNTHESIS
    let analysis: any = {
      architecture: { components: [], entry_points: [], api_routes: [], databases: [] },
      features: [],
      warnings: []
    };
    let llmStatus: any = { status: 'SUCCESS', provider: llmRouter.lastUsedProvider || 'unknown', stage: 'LLM_SYNTHESIS' };
    let llmFailed = false;

    if (body.analysis_options?.skip_llm) {
      plog(analysisId, 'LLM reasoning skipped by policy');
      llmFailed = true;
      llmStatus = {
        status: 'UNAVAILABLE',
        provider: 'none',
        stage: 'LLM_SYNTHESIS',
        error_code: 'SERVICE_UNAVAILABLE',
        retryable: false
      };
    } else {
      tracker.enterStage('LLM_SYNTHESIS');
      plog(analysisId, 'Sending to LLM for reasoning...');

      try {
        // Use updated evidence (execution may have added some) and evidence graph
        analysis = await llmRouter.analyzeEvidence(engine.getEvidence(), evidenceGraphObj.serialize());
        llmStatus.provider = llmRouter.lastUsedProvider;
        tracker.setLlmInfo(llmRouter.lastUsedProvider);
      } catch (llmError: any) {
        perr(analysisId, 'LLM synthesis failed', llmError);
        llmFailed = true;

        const llmClass = classifyLlmError(llmError);
        llmStatus = {
          status: 'UNAVAILABLE',
          provider: 'none',
          stage: 'LLM_SYNTHESIS',
          error_code: llmClass.error_code,
          retryable: llmClass.retryable
        };
      }
    }

    // 8. Generate Report
    tracker.enterStage('REPORT_AUDITED');
    plog(analysisId, 'Generating report...');

    const analysisStartTime = tracker.getMetadata().started_at;
    const warnings = [...(analysis.warnings || []), ...(claimsValidation.audit_warnings || [])];

    const report: ProjectReport = {
      schema_version: "1.0",
      analysis_run_id: analysisId,
      project: {
        id: body.project_id || `PROJ-${crypto.createHash('sha256').update(body.repository_url).digest('hex').substring(0, 8)}`,
        name: body.repository_url.split('/').pop() || 'unknown',
        repository_url: descriptor.repository_url,
        repository_commit: descriptor.commit_sha || 'unknown',
        context_metrics: {
           total_files: contextDigest.summary.totalFiles,
           eligible_files: contextDigest.summary.eligibleFiles,
           estimated_tokens: contextDigest.summary.estimatedTokens
        },
        package_manager: (map.packageManagers && map.packageManagers.length > 0) ? map.packageManagers[0] : 'unknown',
        architecture: {
          components: analysis.architecture?.components || [],
          entry_points: map.entryPoints.length > 0 ? map.entryPoints : (analysis.architecture?.entry_points || []),
          api_routes: analysis.architecture?.api_routes || [],
          databases: analysis.architecture?.databases || [],
          dependencies: Object.keys(map.dependencies)
        },
        features: analysis.features || []
      },
      analysis: {
        started_at: analysisStartTime,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(analysisStartTime).getTime(),
        status: llmFailed ? "INSUFFICIENT_EVIDENCE" : "COMPLETED",
        stages: tracker.getCompletedStageNames() as AnalysisStage[]
      },
      summary: body.claims && body.claims.length > 0 ? ValidationEngine.calculateSummary(claimsValidation.validations) : {
        claims_total: 0,
        verified: 0,
        partially_verified: 0,
        not_verified: 0,
        insufficient_evidence: 0
      },
      requirements: claimsValidation.validations || [],
      claims: claimsValidation.validations || [],
      evidence: engine.getEvidence(),
      evidence_graph: evidenceGraph,
      validation_actions: claimsValidation.audit_trail || [],
      roadmap: claimsValidation.roadmap || [],
      diagnostics: {
        warnings: warnings,
        errors: [],
        execution_failures: executionResult?.telemetry?.phases.filter((p: any) => p.status === 'FAILED').map((p: any) => p.stderr || p.stdout || '') || [],
        provider_failures: llmFailed ? [llmStatus.error_code] : [],
        unsupported_features: []
      },
      analysis_metadata: tracker.complete(),
      llm: llmStatus,
      execution: {
        supported: true,
        telemetry: executionResult?.telemetry
      }
    };

    // 9. Cleanup
    tracker.enterStage('COMPLETED');
    if (descriptor) {
      plog(analysisId, 'Cleaning up workspace...');
      await GithubFetcher.cleanup(descriptor);
    }

    // Persist report in project store if applicable
    try {
      const targetProjectId = body.project_id || report.project.id;
      ProjectStore.attachReport(targetProjectId, report);
    } catch (storeErr) {
      console.warn(`[${analysisId}] Non-fatal error attaching report to project store:`, storeErr);
    }

    plog(analysisId, 'Analysis completed');
    res.status(200).json({
      analysis_id: analysisId,
      status: "COMPLETED",
      report
    });

  } catch (error: any) {
    const stage = tracker.currentStage || 'INITIALIZED';
    tracker.failStage(error?.message || 'Unknown error');
    perr(analysisId, `Error at stage ${stage}`, error);

    if (descriptor) {
       await GithubFetcher.cleanup(descriptor).catch(() => {});
    }

    if (error instanceof z.ZodError) {
      const analysisError: AnalysisError = {
        code: 'INVALID_REQUEST',
        message: 'Request validation failed',
        stage: String(stage),
        retryable: false,
        details: (error as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
      return res.status(400).json({ error: analysisError });
    }

    const analysisError = classifyError(error, String(stage));
    res.status(500).json({
      error: analysisError,
      analysis_metadata: tracker.complete()
    });
  }
});

/**
 * Health check on API v1 prefix
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'valgent-agent', api_version: 'v1' });
});

/**
 * List all projects with latest report and status
 */
router.get('/projects', (_req: Request, res: Response) => {
  try {
    const projects = ProjectStore.getAll();
    res.status(200).json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve projects', details: err?.message });
  }
});

/**
 * Create a new project
 */
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  repositoryUrl: z.string().url('A valid repository URL is required'),
  branch: z.string().optional().default('main'),
  description: z.string().optional().default('')
});

router.post('/projects', (req: Request, res: Response) => {
  try {
    const parsed = CreateProjectSchema.parse(req.body);
    const project = ProjectStore.create(parsed);
    res.status(201).json(project);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const messages = (err as any).issues?.map((e: any) => e.message) || (err as any).errors?.map((e: any) => e.message) || ['Validation failed'];
      return res.status(400).json({ error: 'Invalid project payload', details: messages });
    }
    res.status(500).json({ error: 'Failed to create project', details: err?.message });
  }
});

/**
 * Retrieve single project by ID
 */
router.get('/projects/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const project = ProjectStore.getById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get project', details: err?.message });
  }
});

/**
 * Update project fields
 */
router.patch('/projects/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const updated = ProjectStore.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project', details: err?.message });
  }
});

/**
 * Delete project
 */
router.delete('/projects/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const deleted = ProjectStore.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete project', details: err?.message });
  }
});

/**
 * Retrieve historical reports for a project
 */
router.get('/projects/:id/reports', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const project = ProjectStore.getById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const reports = project.reports || (project.latestReport ? [project.latestReport] : []);
    res.status(200).json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve reports', details: err?.message });
  }
});

/**
 * Retrieve single analysis report by analysis_id
 */
router.get('/analyses/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const report = ProjectStore.findAnalysisById(id);
    if (!report) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    res.status(200).json({
      analysis_id: id,
      status: "COMPLETED",
      report
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve analysis', details: err?.message });
  }
});

/**
 * Poll analysis status
 */
router.get('/analyses/:id/status', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const report = ProjectStore.findAnalysisById(id);
    if (!report) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    res.status(200).json({
      status: 'COMPLETED',
      stage: 'REPORT_AUDITED'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve analysis status', details: err?.message });
  }
});

export default router;
