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

const router = Router();
const llmRouter = new LLMRouter([
  new GeminiProvider(),
  new OpenRouterProvider()
]);
const orchestrator = new ExecutionOrchestrator();

const AnalyzeRequestSchema = z.object({
  repository_url: z.string().url(),
  commit_sha: z.string().optional(),
  claims: z.array(z.object({
    claim_id: z.string(),
    text: z.string()
  })).optional()
});

router.post('/analyze', async (req: Request, res: Response) => {
  const analysisId = crypto.randomUUID();
  let currentStage: AnalysisStage = 'INITIALIZED';
  let descriptor: any = null;

  console.log(`[${analysisId}] Starting analysis for request`);

  try {
    const body = AnalyzeRequestSchema.parse(req.body);
    
    // 1. Fetch Repository
    currentStage = 'INGESTING';
    console.log(`[${analysisId}] Fetching repository...`);
    descriptor = await GithubFetcher.fetch(body.repository_url, body.commit_sha);
    console.log(`[${analysisId}] Fetched at ${descriptor.local_path} (commit: ${descriptor.commit_sha})`);

    const engine = new EvidenceEngine();

    // 2. Map Project
    currentStage = 'PROJECT_MAPPED';
    console.log(`[${analysisId}] Mapping project...`);
    const map = await ProjectMapper.map(descriptor);

    // 3. Document Analysis & Static Analysis
    currentStage = 'STATIC_ANALYSIS';
    console.log(`[${analysisId}] Analyzing documentation & static analysis...`);
    await DocumentAnalyzer.analyze(descriptor, engine);
    const semanticModel = await StaticAnalyzer.analyze(descriptor, map, engine);

    // 4. Execution Planning & Dynamic Analysis
    currentStage = 'EXECUTION_PLANNING';
    console.log(`[${analysisId}] Planning execution...`);
    
    currentStage = 'DYNAMIC_ANALYSIS';
    console.log(`[${analysisId}] Performing dynamic analysis (execution)...`);
    const executionResult = await orchestrator.orchestrate(descriptor, map, engine);

    // 5. Build Evidence Graph
    currentStage = 'EVIDENCE_BUILT';
    const { EvidenceGraphBuilder } = require('../evidence/graph-builder');
    const graphBuilder = new EvidenceGraphBuilder();
    const execResults = executionResult?.telemetry ? [executionResult.telemetry] : [];
    const evidenceGraphObj = graphBuilder.build(body.claims || [], engine.getEvidence(), semanticModel, execResults);
    const evidenceGraph = evidenceGraphObj.serialize();

    // 6. LLM Reasoning
    currentStage = 'LLM_SYNTHESIS';
    console.log(`[${analysisId}] Sending to Gemini for reasoning...`);
    let analysis: any = {
      architecture: { components: [], entry_points: [], api_routes: [], databases: [] },
      features: [],
      warnings: []
    };
    let llmStatus: any = { status: 'SUCCESS', provider: llmRouter.lastUsedProvider || 'unknown', stage: 'LLM_SYNTHESIS' };
    let llmFailed = false;
    
    // Validations & Roadmap
    let claimsValidation: any = { validations: [], roadmap: [], audit_warnings: [], audit_trail: [] };

    try {
      analysis = await llmRouter.analyzeEvidence(engine.getEvidence(), evidenceGraph);
      llmStatus.provider = llmRouter.lastUsedProvider;
      
      if (body.claims && body.claims.length > 0) {
         currentStage = 'AUTONOMOUS_VALIDATION';
         const valOrch = new ValidationOrchestrator(engine, descriptor.local_path);
         claimsValidation = await valOrch.orchestrate(body.claims, evidenceGraphObj, llmRouter);
      }
    } catch (llmError: any) {
      console.error(`[${analysisId}] Gemini synthesis failed:`, llmError);
      llmFailed = true;
      llmStatus = {
        status: 'UNAVAILABLE',
        provider: 'none',
        stage: 'LLM_SYNTHESIS',
        retryable: false
      };
      
      const errMsg = llmError.message || '';
      if (errMsg.includes('429') || errMsg.includes('QUOTA') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        llmStatus.error_code = 'QUOTA_EXCEEDED';
        llmStatus.retryable = true;
      } else if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('rate-limits')) {
        llmStatus.error_code = 'SERVICE_UNAVAILABLE';
        llmStatus.retryable = true;
      } else if (llmError instanceof z.ZodError || errMsg.includes('Unexpected token') || errMsg.includes('JSON')) {
        llmStatus.error_code = 'INVALID_RESPONSE';
      } else if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('API_KEY_INVALID')) {
        llmStatus.error_code = 'AUTHENTICATION_FAILED';
      } else {
        llmStatus.error_code = 'UNKNOWN';
      }

      // If we failed, fallback validations
      if (body.claims && body.claims.length > 0) {
         currentStage = 'AUTONOMOUS_VALIDATION';
         const valOrch = new ValidationOrchestrator(engine, descriptor.local_path);
         claimsValidation = await valOrch.orchestrate(body.claims, evidenceGraphObj, llmRouter);
      }
    }

    // 7. Generate Report
    currentStage = 'REPORT_GENERATED';
    console.log(`[${analysisId}] Generating report...`);
    
    const warnings = [...(analysis.warnings || []), ...(claimsValidation.audit_warnings || [])];

    // We keep deterministic facts
    const report: ProjectReport = {
      schema_version: "1.0",
      analysis_run_id: analysisId,
      project: {
        id: `PROJ-${crypto.randomUUID().substring(0,8)}`,
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
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 0,
        status: llmFailed ? "INSUFFICIENT_EVIDENCE" : "COMPLETED",
        stages: []
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
        execution_failures: executionResult?.telemetry?.phases.filter(p => p.status === 'FAILED').map(p => p.stderr || p.stdout || '') || [],
        provider_failures: llmFailed ? [llmStatus.error_code] : [],
        unsupported_features: []
      },
      llm: llmStatus,
      execution: {
        supported: true,
        telemetry: executionResult?.telemetry
      }
    };

    currentStage = 'CLEANUP';
    if (descriptor) {
      console.log(`[${analysisId}] Cleaning up workspace...`);
      await GithubFetcher.cleanup(descriptor);
    }
    
    currentStage = 'COMPLETED';
    res.status(200).json({
      analysis_id: analysisId,
      status: "COMPLETED",
      report
    });

  } catch (error: any) {
    console.error(`[${analysisId}] Error at stage ${currentStage}:`, error);
    
    if (descriptor) {
       await GithubFetcher.cleanup(descriptor).catch(() => {});
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: (error as any).errors,
          stage: currentStage
        }
      });
    }

    res.status(500).json({
      error: {
        code: "ANALYSIS_FAILED",
        message: error.message || "An unexpected error occurred",
        stage: currentStage
      }
    });
  }
});

export default router;
