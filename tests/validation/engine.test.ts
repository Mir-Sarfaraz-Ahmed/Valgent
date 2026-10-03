import { ValidationEngine } from '../../src/validation/engine';
import { LLMRouter } from '../../src/llm/router';
import { GeminiProvider } from '../../src/llm/gemini';
import { Evidence, Claim } from '../../src/shared/types';
import { z } from 'zod';

process.env.GEMINI_API_KEY = 'mock-key';

describe('Validation Engine & Auditor', () => {
  const mockRouter = new LLMRouter([new GeminiProvider()]);

  const mockEvidence: Evidence[] = [
    { evidence_id: 'EVD-001', type: 'SOURCE_CODE', source: 'static', location: 'app.js', description: 'route', content_hash: '1', metadata: {} },
    { evidence_id: 'EVD-002', type: 'COMMAND_OUTPUT', source: 'sandbox', location: 'test', description: 'passed', content_hash: '2', metadata: { exit_code: 0, phase: 'TEST' } },
    { evidence_id: 'EVD-003', type: 'SOURCE_CODE', source: 'static', location: 'prio.js', description: 'prio', content_hash: '3', metadata: {} }
  ];

  const claims: Claim[] = [
    { claim_id: 'CLM-001', text: 'Users can submit reports.' },
    { claim_id: 'CLM-002', text: 'Reports receive persistent priority scores.' },
    { claim_id: 'CLM-003', text: 'Users can sign in with Google.' },
    { claim_id: 'CLM-004', text: 'The application is deployed to production.' },
    { claim_id: 'CLM-005', text: 'Malicious claim without evidence.' }
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Should return correct statuses for claims and audit properly', async () => {
    jest.spyOn(mockRouter, 'validateClaims').mockResolvedValue({
      validations: [
        {
          claim_id: 'CLM-001',
          text: 'Users can submit reports.',
          status: 'VERIFIED',
          conclusion: 'Verified via route and tests',
          evidence_refs: ['EVD-001', 'EVD-002'],
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
          conclusion: 'Calculation exists, persistence missing',
          evidence_refs: ['EVD-003'],
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
          conclusion: 'Only email/password found',
          evidence_refs: ['EVD-001'],
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
          conclusion: 'No deployment config found',
          evidence_refs: [],
          graph_refs: [],
          limitations: [],
          missing_evidence: [],
          requirement_refs: [],
          checks: []
        },
        {
          claim_id: 'CLM-005',
          text: 'Malicious claim without evidence.',
          status: 'VERIFIED', // Intentionally wrong status to test auditor
          conclusion: 'I made this up',
          evidence_refs: ['EVD-FAKE-ID'], // Fake evidence
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
          title: 'Persist priority score',
          problem: 'Missing DB save',
          evidence_refs: ['EVD-003'],
          recommended_actions: [],
          acceptance_criteria: []
        }
      ]
    });

    const result = await ValidationEngine.validate(claims, mockEvidence, mockRouter);

    // Claim 1
    expect(result.validations.find(v => v.claim_id === 'CLM-001')?.status).toBe('VERIFIED');

    // Claim 2
    expect(result.validations.find(v => v.claim_id === 'CLM-002')?.status).toBe('PARTIALLY_VERIFIED');

    // Claim 3
    expect(result.validations.find(v => v.claim_id === 'CLM-003')?.status).toBe('NOT_VERIFIED');

    // Claim 4
    expect(result.validations.find(v => v.claim_id === 'CLM-004')?.status).toBe('INSUFFICIENT_EVIDENCE');

    // Claim 5 (Auditor should downgrade VERIFIED to INSUFFICIENT_EVIDENCE because evidence was fake)
    const claim5 = result.validations.find(v => v.claim_id === 'CLM-005');
    expect(claim5?.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(claim5?.evidence_refs.length).toBe(0);

    // Warnings should mention the downgrade
    expect(result.audit_warnings.some(w => w.includes('CLM-005 downgraded'))).toBe(true);

    // Roadmap task should be preserved
    expect(result.roadmap.length).toBe(1);
    expect(result.roadmap[0].task_id).toBe('TASK-001');
  });

  it('2. Should handle provider failure and fallback to INSUFFICIENT_EVIDENCE for all', async () => {
    jest.spyOn(mockRouter, 'validateClaims').mockRejectedValue(new Error('503 Unavailable'));

    const result = await ValidationEngine.validate(claims, mockEvidence, mockRouter);

    expect(result.validations.length).toBe(5);
    result.validations.forEach(v => {
      expect(v.status).toBe('INSUFFICIENT_EVIDENCE');
    });
    expect(result.roadmap.length).toBe(0);
    expect(result.audit_warnings).toContain('Provider validation failed, defaulted to deterministic analysis');
  });
});
