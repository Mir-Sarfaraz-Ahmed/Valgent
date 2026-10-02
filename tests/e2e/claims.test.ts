import request from 'supertest';
import express from 'express';
import * as path from 'path';

process.env.GEMINI_API_KEY = 'mock-key';

jest.mock('../../src/validation/auditor', () => ({
  ReportAuditor: {
    audit: jest.fn().mockImplementation((validations: any, roadmap: any, evidenceStore: any, claims: any, graph: any) => {
       const v = validations.map((val: any) => {
          if (val.claim_id === 'CLM-005') return { ...val, status: 'INSUFFICIENT_EVIDENCE', evidence_refs: [] };
          return val;
       });
       return { validations: v, roadmap, audit_warnings: [] };
    })
  }
}));

import apiRoutes from '../../src/api/routes';
import { GithubFetcher } from '../../src/github/fetcher';
import { LLMRouter } from '../../src/llm/router';

describe('Claim Validation Engine', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiRoutes);
  
  jest.setTimeout(60000);

  let fetchSpy: jest.SpyInstance;
  let cleanupSpy: jest.SpyInstance;
  let routerAnalyzeSpy: jest.SpyInstance;
  let routerValidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    const fixturePath = path.join(__dirname, '../fixtures/claim-validation-project');
    fetchSpy = jest.spyOn(GithubFetcher, 'fetch').mockResolvedValue({
      repository_url: 'https://github.com/test/claim-project',
      commit_sha: '123456',
      local_path: fixturePath,
      branch: 'main',
      fetched_at: new Date().toISOString()
    });
    cleanupSpy = jest.spyOn(GithubFetcher, 'cleanup').mockResolvedValue(undefined);
    
    routerAnalyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockResolvedValue({
      architecture: { components: [], entry_points: [], api_routes: [], databases: [] },
      features: [],
      warnings: []
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Should validate claims and return the four expected statuses', async () => {
    const originalGetEvidence = require('../../src/evidence/engine').EvidenceEngine.prototype.getEvidence;
    jest.spyOn(require('../../src/evidence/engine').EvidenceEngine.prototype, 'getEvidence').mockImplementation(function(this: any) {
        const ev = originalGetEvidence.call(this);
        ev.push({
            evidence_id: 'EVD-KNOWN-VALID',
            type: 'SOURCE_CODE',
            classification: 'IMPLEMENTATION',
            source: 'static',
            location: 'test',
            description: 'test',
            content_hash: '123',
            metadata: {}
        });
        ev.push({
            evidence_id: 'EXEC-EVIDENCE',
            type: 'COMMAND_OUTPUT',
            classification: 'EXECUTION',
            source: 'exec',
            location: 'test',
            description: 'test build',
            content_hash: '1234',
            metadata: { phase: 'BUILD', exit_code: 0, status: 'PASSED' }
        });
        return ev;
    });

    routerValidateSpy = jest.spyOn(LLMRouter.prototype, 'validateClaims').mockImplementation(async (packages: any[]) => {
      let validId = 'EVD-KNOWN-VALID';

      return {
        validations: [
          {
            claim_id: 'CLM-001',
            text: 'Users can submit reports.',
            status: 'VERIFIED',
            conclusion: 'test execution completed successfully',
            evidence_refs: [validId, 'EXEC-EVIDENCE'],
            graph_refs: [],
            limitations: [],
            missing_evidence: [],
            requirement_refs: [],
            checks: []
          },
          {
            claim_id: 'CLM-002',
            text: 'Reports receive persistent priority scores.',
            status: 'PARTIALLY_VERIFIED',
            conclusion: 'Mock partial',
            evidence_refs: [validId],
            graph_refs: [],
            limitations: [],
            missing_evidence: [],
            requirement_refs: [],
            checks: []
          },
          {
            claim_id: 'CLM-003',
            text: 'Users can sign in with Google.',
            status: 'NOT_VERIFIED',
            conclusion: 'Mock not verified',
            evidence_refs: [validId],
            graph_refs: [],
            limitations: [],
            missing_evidence: [],
            requirement_refs: [],
            checks: []
          },
          {
            claim_id: 'CLM-004',
            text: 'The application is deployed to production.',
            status: 'INSUFFICIENT_EVIDENCE',
            conclusion: 'Mock insufficient',
            evidence_refs: [],
            graph_refs: [],
            limitations: [],
            missing_evidence: [],
            requirement_refs: [],
            checks: []
          },
          {
            claim_id: 'CLM-005', // Will be downgraded by auditor
            text: 'Invented claim',
            status: 'VERIFIED',
            conclusion: 'Fake',
            evidence_refs: ['FAKE-EVD-ID'],
            graph_refs: [],
            limitations: [],
            missing_evidence: [],
            requirement_refs: [],
            checks: []
          }
        ],
        roadmap: [
          {
            task_id: 'TASK-001',
            claim_id: 'CLM-002',
            title: 'Fix score',
            problem: 'Not saved',
            evidence_refs: [validId],
            recommended_actions: [],
            acceptance_criteria: []
          }
        ]
      };
    });


    const claimsPayload = [
      { claim_id: 'CLM-001', text: 'Users can submit reports.' },
      { claim_id: 'CLM-002', text: 'Reports receive persistent priority scores.' },
      { claim_id: 'CLM-003', text: 'Users can sign in with Google.' },
      { claim_id: 'CLM-004', text: 'The application is deployed to production.' },
      { claim_id: 'CLM-005', text: 'Invented claim' }
    ];

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/claim-project', claims: claimsPayload });

    expect(response.status).toBe(200);
    const report = response.body.report;

    expect(report.claims).toBeDefined();
    expect(report.claims.length).toBe(5);

    // Verify exactly 4 expected statuses and 1 auditor downgrade
    console.log("TEST 1 CLAIMS:", JSON.stringify(report.claims, null, 2));
    const c1 = report.claims.find((c: any) => c.claim_id === 'CLM-001');
    expect(c1.status).toBe('VERIFIED');
    const c2 = report.claims.find((c: any) => c.claim_id === 'CLM-002');
    expect(c2.status).toBe('PARTIALLY_VERIFIED');

    const c3 = report.claims.find((c: any) => c.claim_id === 'CLM-003');
    expect(c3.status).toBe('NOT_VERIFIED');

    const c4 = report.claims.find((c: any) => c.claim_id === 'CLM-004');
    expect(c4.status).toBe('INSUFFICIENT_EVIDENCE');

    const c5 = report.claims.find((c: any) => c.claim_id === 'CLM-005');
    expect(c5.status).toBe('INSUFFICIENT_EVIDENCE'); // Audited
    expect(c5.evidence_refs.length).toBe(0);

    expect(report.roadmap).toBeDefined();
    expect(report.roadmap.length).toBe(1);

    expect(report.summary).toEqual({
      claims_total: 5,
      verified: 1,
      partially_verified: 1,
      not_verified: 1,
      insufficient_evidence: 2
    });
  });

  it('2. Should handle Gemini failure and fallback validation safely', async () => {
    routerAnalyzeSpy = jest.spyOn(LLMRouter.prototype, 'analyzeEvidence').mockRejectedValue(new Error('429 TEST 2 EXCEEDED'));
    routerValidateSpy = jest.spyOn(LLMRouter.prototype, 'validateClaims').mockRejectedValue(new Error('429 TEST 2 EXCEEDED'));

    const claimsPayload = [
      { claim_id: 'CLM-001', text: 'Users can submit reports.' }
    ];

    const response = await request(app)
      .post('/api/v1/analyze')
      .send({ repository_url: 'https://github.com/test/claim-project', claims: claimsPayload });

    expect(response.status).toBe(200);
    const report = response.body.report;

    expect(report.llm.status).toBe('UNAVAILABLE');
    expect(report.analysis.status).toBe('INSUFFICIENT_EVIDENCE');
    
    const c1 = report.claims.find((c: any) => c.claim_id === 'CLM-001');
    expect(c1.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(report.summary.insufficient_evidence).toBe(1);
  });
});
