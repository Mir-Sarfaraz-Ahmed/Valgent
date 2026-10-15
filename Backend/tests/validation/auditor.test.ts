import { ReportAuditor } from '../../src/validation/auditor';
import { ValidationResult, Evidence, Claim, RemediationTask } from '../../src/shared/types';

describe('ReportAuditor V0.5', () => {
  const mockClaims: Claim[] = [
    { claim_id: 'CLM-001', text: 'Tests pass' },
    { claim_id: 'CLM-002', text: 'Builds fine' }
  ];

  const mockEvidence: Evidence[] = [
    {
      evidence_id: 'EVD-1', type: 'COMMAND_OUTPUT', location: 'test', content_hash: '123', description: 'desc', source: 'sandbox',
      metadata: { phase: 'TEST', exit_code: 1, duration_ms: 100, timed_out: false, network_enabled: false }
    },
    {
      evidence_id: 'EVD-2', type: 'COMMAND_OUTPUT', location: 'build', content_hash: '456', description: 'desc', source: 'sandbox',
      metadata: { phase: 'BUILD', exit_code: 0, duration_ms: 100, timed_out: false, network_enabled: false }
    },
    {
      evidence_id: 'EVD-3', type: 'SOURCE_CODE', location: 'src/index.ts', content_hash: '789', description: 'desc', source: 'repository'
    }
  ];

  it('1. Should downgrade invalid status mappings to INSUFFICIENT_EVIDENCE', () => {
    const validations: ValidationResult[] = [
      { claim_id: 'CLM-001', text: '', status: 'ALMOST_DONE' as any, conclusion: 'looks good', evidence_refs: ['EVD-3'], graph_refs: [], limitations: [], missing_evidence: [], requirement_refs: [], checks: [] }
    ];
    const { validations: audited, audit_warnings } = ReportAuditor.audit(validations, [], mockEvidence, mockClaims);
    expect(audited[0].status).toBe('INSUFFICIENT_EVIDENCE');
    expect(audit_warnings.some(w => w.includes('Invalid status'))).toBe(true);
  });

  it('2. Should catch non-matching exit codes (VERIFIED but cited failed execution)', () => {
    const validations: ValidationResult[] = [
      { claim_id: 'CLM-001', text: '', status: 'VERIFIED', conclusion: 'The routes are implemented.', evidence_refs: ['EVD-1'], graph_refs: [], limitations: [], missing_evidence: [], requirement_refs: [], checks: [] }
    ];
    const { validations: audited, audit_warnings } = ReportAuditor.audit(validations, [], mockEvidence, mockClaims);
    expect(audited[0].status).toBe('PARTIALLY_VERIFIED'); // Or INSUFFICIENT_EVIDENCE
    expect(audit_warnings.some(w => w.includes('execution failed'))).toBe(true);
  });

  it('3. Should catch fabricated execution claims (claims execution passed but no successful execution cited)', () => {
    const validations: ValidationResult[] = [
      { claim_id: 'CLM-001', text: '', status: 'VERIFIED', conclusion: 'The test execution completed successfully.', evidence_refs: ['EVD-3'], graph_refs: [], limitations: [], missing_evidence: [], requirement_refs: [], checks: [] }
    ];
    const { validations: audited, audit_warnings } = ReportAuditor.audit(validations, [], mockEvidence, mockClaims);
    expect(audited[0].status).toBe('INSUFFICIENT_EVIDENCE');
    expect(audit_warnings.some(w => w.includes('fabricated execution'))).toBe(true);
  });
});
