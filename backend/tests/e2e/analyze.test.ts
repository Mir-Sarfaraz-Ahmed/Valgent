import request from 'supertest';
import express from 'express';
import * as path from 'path';

process.env.GEMINI_API_KEY = 'mock-key';

import apiRoutes from '../../src/api/routes';
import { GithubFetcher } from '../../src/github/fetcher';
import { LLMRouter } from '../../src/llm/router';
import { z } from 'zod';

describe('E2E Analysis Pipeline', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiRoutes);
  
  jest.setTimeout(60000); 

  let fetchSpy: jest.SpyInstance;
  let cleanupSpy: jest.SpyInstance;
  let analyzeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    const fixturePath = path.join(__dirname, '../fixtures/e2e-node-project');
    fetchSpy = jest.spyOn(GithubFetcher, 'fetch').mockResolvedValue({
      repository_url: 'https://github.com/test/passing',
      commit_sha: '123456',
      local_path: fixturePath,
      branch: 'main',
      fetched_at: new Date().toISOString()
    });
    cleanupSpy = jest.spyOn(GithubFetcher, 'cleanup').mockResolvedValue(undefined);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    cleanupSpy.mockRestore();
    if (analyzeSpy) analyzeSpy.mockRestore();
  });

  it('1. Gemini success -> normal report', async () => {
    analyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockResolvedValue({
      architecture: { components: ['c1'], entry_points: ['e1'], api_routes: [], databases: [] },
      features: ['Mock Feature'],
      warnings: []
    });

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/passing' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('COMPLETED');
    expect(response.body.report.analysis.status).toBe('COMPLETED');
    expect(response.body.report.llm.status).toBe('SUCCESS');
    expect(response.body.report.evidence.length).toBeGreaterThan(0);
  });

  it('2. Gemini 429 -> report generated, llm unavailable, retryable true, evidence preserved', async () => {
    analyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockRejectedValue(new Error('429 QUOTA_EXCEEDED'));

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/passing' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('COMPLETED');
    const report = response.body.report;
    expect(report.analysis.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(report.llm.status).toBe('UNAVAILABLE');
    expect(report.llm.error_code).toBe('QUOTA_EXCEEDED');
    expect(report.llm.retryable).toBe(true);
    expect(report.evidence.length).toBeGreaterThan(0);
  });

  it('3. Gemini 503 -> report generated, llm unavailable, retryable true, evidence preserved', async () => {
    analyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockRejectedValue(new Error('503 SERVICE_UNAVAILABLE high demand'));

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/passing' });

    expect(response.status).toBe(200);
    const report = response.body.report;
    expect(report.llm.error_code).toBe('SERVICE_UNAVAILABLE');
    expect(report.llm.retryable).toBe(true);
  });

  it('4. Invalid Gemini response -> deterministic report preserved, llm.status = UNAVAILABLE', async () => {
    analyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockRejectedValue(new z.ZodError([]));

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/passing' });

    expect(response.status).toBe(200);
    const report = response.body.report;
    expect(report.llm.error_code).toBe('INVALID_RESPONSE');
    expect(report.evidence.length).toBeGreaterThan(0);
  });

  it('5. Authentication failure -> report preserved, retryable false', async () => {
    analyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockRejectedValue(new Error('401 API_KEY_INVALID'));

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/passing' });

    expect(response.status).toBe(200);
    const report = response.body.report;
    expect(report.llm.error_code).toBe('AUTHENTICATION_FAILED');
    expect(report.llm.retryable).toBe(false);
  });

  it('6. Execution failure + Gemini unavailable -> both failures represented', async () => {
    fetchSpy.mockRestore();
    const fixturePath = path.join(__dirname, '../fixtures/e2e-node-project-fail');
    fetchSpy = jest.spyOn(GithubFetcher, 'fetch').mockResolvedValue({
      repository_url: 'https://github.com/test/failing',
      commit_sha: '654321',
      local_path: fixturePath,
      branch: 'main',
      fetched_at: new Date().toISOString()
    });

    analyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockRejectedValue(new Error('429 QUOTA_EXCEEDED'));

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/failing' });

    expect(response.status).toBe(200);
    const report = response.body.report;
    
    // Execution failure represented
    expect(report.execution.telemetry.phases).toContainEqual(expect.objectContaining({ phase: 'TEST', status: 'SKIPPED' }));
    // Gemini unavailable represented
    expect(report.llm.status).toBe('UNAVAILABLE');
    expect(report.analysis.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('7. Evidence integrity -> evidence IDs remain valid, execution evidence remains present', async () => {
    analyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockRejectedValue(new Error('503'));
    
    // Mock sandbox to avoid needing a real docker daemon for this test
    const { DockerSandbox } = require('../../src/sandbox/docker');
    jest.spyOn(DockerSandbox.prototype, 'runCommand').mockResolvedValue({
      exit_code: 0,
      duration_ms: 100,
      stdout: 'Mocked output',
      stderr: '',
      timed_out: false,
      image: 'node:20-slim',
      network_enabled: false
    });

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/passing' });

    expect(response.status).toBe(200);
    const report = response.body.report;
    
    const evidence = report.evidence;
    const executionEvidence = evidence.filter((e: any) => e.type === 'COMMAND_OUTPUT' && e.source === 'sandbox');
    expect(executionEvidence.length).toBeGreaterThan(0);
    expect(executionEvidence[0].evidence_id).toMatch(/^EVD-/); // Evidence ID format
  });
});
