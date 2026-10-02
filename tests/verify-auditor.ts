import { ReportAuditor } from '../src/validation/auditor';

const validations = [
  {
    claim_id: 'C1',
    text: 'Test',
    status: 'VERIFIED' as any,
    conclusion: 'Found stuff',
    evidence_refs: ['NODE-FAKE-999'],
    requirement_refs: [],
    checks: []
  }
];

const audited = ReportAuditor.audit(validations, [], [], [{ claim_id: 'C1', text: 'Test' }], { nodes: [], edges: [] });
console.log('Status:', audited.validations[0].status);
console.log('Warnings:', audited.audit_warnings);
