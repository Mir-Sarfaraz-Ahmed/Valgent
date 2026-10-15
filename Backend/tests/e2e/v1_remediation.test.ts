import { PipelineTracker } from '../../src/shared/pipeline';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import routes from '../../src/api/routes';
import { GithubFetcher } from '../../src/github/fetcher';
import { ProjectMapper } from '../../src/analyzers/mapper';
import { ExecutionOrchestrator } from '../../src/agents/execution';
import { LLMRouter } from '../../src/llm/router';
import { GeminiProvider } from '../../src/llm/gemini';
import { OpenRouterProvider } from '../../src/llm/openrouter';
import { DockerSandbox } from '../../src/sandbox/docker';
import { StaticAnalyzer } from '../../src/analyzers/static';

const app = express();
app.use(bodyParser.json());
app.use('/api', routes);

describe('V1.0-A Remediation Tests', () => {
  let fetchSpy: jest.SpyInstance;
  let cleanupSpy: jest.SpyInstance;
  let mapSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test_key';
    process.env.OPENROUTER_API_KEY = 'test_key';
    fetchSpy = jest.spyOn(GithubFetcher, 'fetch').mockResolvedValue({
      repository_url: 'https://github.com/mock/repo',
      commit_sha: '123456',
      local_path: '/tmp/mock',
      branch: 'main',
      fetched_at: new Date().toISOString()
    });
    cleanupSpy = jest.spyOn(GithubFetcher, 'cleanup').mockResolvedValue(undefined);
    mapSpy = jest.spyOn(ProjectMapper, 'map').mockResolvedValue({
      directories: [],
      packageManagers: ['npm'],
      dependencies: {},
      scripts: {},
      entryPoints: [],
      languages: ['TypeScript'],
      frameworks: []
    });
    jest.spyOn(DockerSandbox.prototype, 'runCommand').mockResolvedValue({
      stdout: '',
      stderr: '',
      exit_code: 0,
      duration_ms: 100,
      timed_out: false,
      network_enabled: false,
      image: 'mock-image'
    });
    jest.spyOn(StaticAnalyzer, 'analyze').mockResolvedValue({
      frameworks: [],
      components: [],
      architectural_patterns: [],
      routes: [],
      data_models: [],
      symbols: [],
      imports: [],
      exports: [],
      databaseOperations: [],
      calls: [],
      classes: [],
      functions: []
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('A & B. Pipeline Transition Rejection and Terminal State', () => {
    it('rejects illegal transitions and maintains state', () => {
      const tracker = new PipelineTracker('123', 'http://repo');
      tracker.enterStage('INITIALIZED');
      
      let error: any;
      try {
        tracker.enterStage('COMPLETED');
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(tracker.currentStage).toBe('INITIALIZED');
    });

    it('rejects transitions from COMPLETED', () => {
      const tracker = new PipelineTracker('123', 'http://repo');
      tracker.enterStage('INITIALIZED');
      tracker.enterStage('INGESTING');
      tracker.enterStage('PROJECT_MAPPED');
      tracker.enterStage('STATIC_ANALYSIS');
      tracker.enterStage('DYNAMIC_ANALYSIS');
      tracker.enterStage('EVIDENCE_BUILT');
      tracker.enterStage('REPORT_AUDITED');
      tracker.enterStage('COMPLETED');

      expect(tracker.currentStage).toBe('COMPLETED');
      
      let error: any;
      try {
        tracker.enterStage('CLEANUP');
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('C. skip_execution', () => {
    it('skips execution orchestrator and records NOT_ATTEMPTED', async () => {
      const orchestrateSpy = jest.spyOn(ExecutionOrchestrator.prototype, 'orchestrate');
      const res = await request(app).post('/api/analyze').send({
        repository_url: 'https://github.com/mock/repo',
        analysis_options: { skip_execution: true, skip_llm: true } // skip LLM to speed up
      });

      expect(res.status).toBe(200);
      expect(orchestrateSpy).not.toHaveBeenCalled();
      const report = res.body.report;
      expect(report.execution.telemetry.phases[0].status).toBe('NOT_ATTEMPTED');
    });
  });

  describe('D. execution_policy', () => {
    it('disables phases based on execution_policy', async () => {
      const res = await request(app).post('/api/analyze').send({
        repository_url: 'https://github.com/mock/repo',
        analysis_options: { skip_llm: true },
        execution_policy: {
          allow_install: false,
          allow_build: false,
          allow_tests: false
        }
      });

      expect(res.status).toBe(200);
      const phases = res.body.report.execution.telemetry.phases;
      const installPhase = phases.find((p: any) => p.phase === 'INSTALL');
      const buildPhase = phases.find((p: any) => p.phase === 'BUILD');
      const testPhase = phases.find((p: any) => p.phase === 'TEST');

      expect(installPhase.status).toBe('SKIPPED');
      expect(buildPhase.status).toBe('SKIPPED');
      expect(testPhase.status).toBe('SKIPPED');
    });
  });

  describe('E. llm_policy', () => {
    it('uses preferred providers and configures timeout', async () => {
      let openRouterCalled = false;
      jest.spyOn(OpenRouterProvider.prototype, 'analyzeEvidence').mockImplementation(async function(this: any) {
        openRouterCalled = true;
        expect(this.timeoutMs).toBe(5000);
        return { architecture: { components: [], entry_points: [], api_routes: [], databases: [] }, features: [], warnings: [] };
      });

      const res = await request(app).post('/api/analyze').send({
        repository_url: 'https://github.com/mock/repo',
        llm_policy: {
          preferred_providers: ['openrouter'],
          timeout_ms: 5000
        }
      });

      expect(res.status).toBe(200);
      expect(openRouterCalled).toBe(true);
    });
  });

  describe('G. backward compatibility', () => {
    it('processes simple request', async () => {
      jest.spyOn(GeminiProvider.prototype, 'analyzeEvidence').mockResolvedValue({
        architecture: { components: [], entry_points: [], api_routes: [], databases: [] }, features: [], warnings: []
      });

      const res = await request(app).post('/api/analyze').send({
        repository_url: 'https://github.com/mock/repo',
        commit_sha: '123'
      });

      expect(res.status).toBe(200);
      expect(res.body.report.analysis.status).toBe('COMPLETED');
    });
  });

  describe('F. concurrent request isolation', () => {
    it('does not leak execution_policy between requests', async () => {
      let res1, res2;

      jest.spyOn(GeminiProvider.prototype, 'analyzeEvidence').mockResolvedValue({
        architecture: { components: [], entry_points: [], api_routes: [], databases: [] }, features: [], warnings: []
      });

      // Run simultaneously
      const p1 = request(app).post('/api/analyze').send({
        repository_url: 'https://github.com/mock/repo',
        execution_policy: { allow_install: false }
      });

      const p2 = request(app).post('/api/analyze').send({
        repository_url: 'https://github.com/mock/repo2',
        execution_policy: { allow_install: true }
      });

      [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const p1Install = res1.body.report.execution.telemetry.phases.find((p: any) => p.phase === 'INSTALL');
      const p2Install = res2.body.report.execution.telemetry.phases.find((p: any) => p.phase === 'INSTALL');

      expect(p1Install.status).toBe('SKIPPED');
      expect(p2Install.status).not.toBe('SKIPPED');
    });
  });
});
