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

    // 7. LLM Reasoning
    let analysis: any = {
      architecture: { components: [], entry_points: [], api_routes: [], databases: [] },
      features: [],
      warnings: []
    };
    let llmStatus: any = { status: 'SUCCESS', provider: llmRouter.lastUsedProvider || 'unknown', stage: 'LLM_SYNTHESIS' };
    let llmFailed = false;
    let claimsValidation: any = { validations: [], roadmap: [], audit_warnings: [], audit_trail: [] };

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
        analysis = await llmRouter.analyzeEvidence(engine.getEvidence(), evidenceGraph);
        llmStatus.provider = llmRouter.lastUsedProvider;
        tracker.setLlmInfo(llmRouter.lastUsedProvider);

        if (body.claims && body.claims.length > 0) {
          tracker.enterStage('AUTONOMOUS_VALIDATION');
          plog(analysisId, 'Autonomous validation...');
          const valOrch = new ValidationOrchestrator(engine, descriptor.local_path, body.analysis_options?.skip_execution);
          claimsValidation = await valOrch.orchestrate(body.claims, evidenceGraphObj, llmRouter);
        }
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

        // If we failed LLM, still run validation with deterministic evidence
        if (body.claims && body.claims.length > 0) {
          tracker.enterStage('AUTONOMOUS_VALIDATION');
          plog(analysisId, 'Autonomous validation (LLM degraded)...');
          const valOrch = new ValidationOrchestrator(engine, descriptor.local_path, body.analysis_options?.skip_execution);
          claimsValidation = await valOrch.orchestrate(body.claims, evidenceGraphObj, llmRouter);
        }
      }
    }

    // Record validation action IDs
    if (claimsValidation.audit_trail) {
      for (const action of claimsValidation.audit_trail) {
        if (action.decision_id) tracker.addValidationActionId(action.decision_id);
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

// -------------------------------------------------------------
// In-Memory SaaS Project, Document & Analysis Run Store
// -------------------------------------------------------------

interface SaaSProjectRecord {
  id: string;
  name: string;
  description: string;
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  status: 'in_progress' | 'needs_review' | 'completed';
  createdAt: string;
  updatedAt: string;
  lastAnalyzedAt?: string;
  latestAnalysisId?: string;
  latestReport?: any;
}

interface UploadedDocumentRecord {
  id: string;
  projectId: string;
  name: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface AnalysisRunRecord {
  analysisId: string;
  projectId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  stage: string;
  createdAt: string;
  updatedAt: string;
  report?: any;
  error?: any;
}

// Initial starter projects matching reference specifications
const projectsStore: Map<string, SaaSProjectRecord> = new Map([
  [
    'proj-valgent-demo',
    {
      id: 'proj-valgent-demo',
      name: 'Valgent Demo',
      description: 'AI-powered project validation platform with AST semantic analysis',
      repositoryUrl: 'https://github.com/valgent/demo',
      branch: 'main',
      commitSha: '9f2a1c7',
      status: 'in_progress',
      createdAt: '2026-10-10T10:00:00Z',
      updatedAt: '2026-10-11T14:30:00Z',
      lastAnalyzedAt: '2026-10-11T14:30:00Z'
    }
  ],
  [
    'proj-civicpulse-ai',
    {
      id: 'proj-civicpulse-ai',
      name: 'CivicPulse AI',
      description: 'Civic engagement and feedback platform for municipal transparency',
      repositoryUrl: 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git',
      branch: 'main',
      commitSha: 'a3c7e9d',
      status: 'needs_review',
      createdAt: '2026-10-09T08:00:00Z',
      updatedAt: '2026-10-10T18:15:00Z',
      lastAnalyzedAt: '2026-10-10T18:15:00Z'
    }
  ],
  [
    'proj-campusconnect',
    {
      id: 'proj-campusconnect',
      name: 'CampusConnect',
      description: 'Student community and event platform with peer tutoring',
      repositoryUrl: 'https://github.com/campus/connect',
      branch: 'dev',
      commitSha: '5b8d2f1',
      status: 'completed',
      createdAt: '2026-10-08T12:00:00Z',
      updatedAt: '2026-10-09T11:20:00Z',
      lastAnalyzedAt: '2026-10-09T11:20:00Z'
    }
  ]
]);

const documentsStore: Map<string, UploadedDocumentRecord[]> = new Map([
  [
    'proj-valgent-demo',
    [
      {
        id: 'doc-1',
        projectId: 'proj-valgent-demo',
        name: 'PRD_Specification_v1.0.md',
        sizeBytes: 12374,
        uploadedAt: '2026-10-10T10:15:00Z'
      }
    ]
  ]
]);

const analysisRunsStore: Map<string, AnalysisRunRecord> = new Map();

// GET /api/v1/projects - List projects
router.get('/projects', (req: Request, res: Response) => {
  const list = Array.from(projectsStore.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  res.json({ projects: list, count: list.length });
});

// POST /api/v1/projects - Create project
router.post('/projects', (req: Request, res: Response) => {
  const { name, repositoryUrl, branch = 'main', description = '' } = req.body;
  if (!name || !repositoryUrl) {
    return res.status(400).json({ error: 'Name and repositoryUrl are required' });
  }

  const id = 'proj-' + crypto.randomUUID().substring(0, 8);
  const now = new Date().toISOString();
  const commitSha = crypto.randomUUID().substring(0, 7);

  const newProject: SaaSProjectRecord = {
    id,
    name,
    description: description || `Repository analysis for ${name}`,
    repositoryUrl,
    branch,
    commitSha,
    status: 'in_progress',
    createdAt: now,
    updatedAt: now
  };

  projectsStore.set(id, newProject);
  res.status(201).json(newProject);
});

// GET /api/v1/projects/:projectId - Get single project
router.get('/projects/:projectId', (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  const project = projectsStore.get(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

// PATCH /api/v1/projects/:projectId - Update project
router.patch('/projects/:projectId', (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  const project = projectsStore.get(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, description, branch, status, repositoryUrl } = req.body;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (branch !== undefined) project.branch = branch;
  if (status !== undefined) project.status = status;
  if (repositoryUrl !== undefined) project.repositoryUrl = repositoryUrl;
  project.updatedAt = new Date().toISOString();

  projectsStore.set(project.id, project);
  res.json(project);
});

// DELETE /api/v1/projects/:projectId - Delete project
router.delete('/projects/:projectId', (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  if (!projectsStore.has(projectId)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  projectsStore.delete(projectId);
  documentsStore.delete(projectId);
  res.json({ success: true, message: 'Project removed' });
});

// GET /api/v1/projects/:projectId/documents - List documents
router.get('/projects/:projectId/documents', (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  const docs = documentsStore.get(projectId) || [];
  res.json({ documents: docs });
});

// POST /api/v1/projects/:projectId/documents - Upload/register document
router.post('/projects/:projectId/documents', (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  const { name, sizeBytes = 1024 } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Document name is required' });
  }

  const doc: UploadedDocumentRecord = {
    id: 'doc-' + crypto.randomUUID().substring(0, 8),
    projectId,
    name,
    sizeBytes: Number(sizeBytes),
    uploadedAt: new Date().toISOString()
  };

  const list = documentsStore.get(projectId) || [];
  list.push(doc);
  documentsStore.set(projectId, list);
  res.status(201).json(doc);
});

// GET /api/v1/projects/:projectId/analyses - List analysis runs
router.get('/projects/:projectId/analyses', (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  const runs = Array.from(analysisRunsStore.values())
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ analyses: runs });
});

// GET /api/v1/projects/:projectId/reports - List reports
router.get('/projects/:projectId/reports', (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  const runs = Array.from(analysisRunsStore.values())
    .filter((r) => r.projectId === projectId && r.report)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ reports: runs.map((r) => r.report) });
});

// GET /api/v1/analyses/:analysisId/status - Check run status
router.get('/analyses/:analysisId/status', (req: Request, res: Response) => {
  const analysisId = String(req.params.analysisId);
  const run = analysisRunsStore.get(analysisId);
  if (!run) {
    return res.status(404).json({ error: 'Analysis run not found' });
  }
  res.json({
    analysisId: run.analysisId,
    projectId: run.projectId,
    status: run.status,
    stage: run.stage,
    updatedAt: run.updatedAt
  });
});

// GET /api/v1/analyses/:analysisId - Get report
router.get('/analyses/:analysisId', (req: Request, res: Response) => {
  const analysisId = String(req.params.analysisId);
  const run = analysisRunsStore.get(analysisId);
  if (!run) {
    return res.status(404).json({ error: 'Analysis run not found' });
  }
  if (run.status === 'COMPLETED' && run.report) {
    return res.json({ status: run.status, report: run.report });
  }
  res.json({ status: run.status, stage: run.stage, error: run.error });
});

// GET /api/v1/analyses/:analysisId/evidence-graph - Get evidence graph
router.get('/analyses/:analysisId/evidence-graph', (req: Request, res: Response) => {
  const analysisId = String(req.params.analysisId);
  const run = analysisRunsStore.get(analysisId);
  if (!run || !run.report?.evidence_graph) {
    return res.status(404).json({ error: 'Evidence graph not found' });
  }
  res.json(run.report.evidence_graph);
});

// GET /api/v1/analyses/:analysisId/roadmap - Get roadmap
router.get('/analyses/:analysisId/roadmap', (req: Request, res: Response) => {
  const analysisId = String(req.params.analysisId);
  const run = analysisRunsStore.get(analysisId);
  if (!run || !run.report?.roadmap) {
    return res.status(404).json({ error: 'Roadmap not found' });
  }
  res.json({ roadmap: run.report.roadmap });
});

export default router;
