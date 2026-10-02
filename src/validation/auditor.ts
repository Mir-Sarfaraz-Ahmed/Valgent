import { ValidationResult, Evidence, RemediationTask, Claim } from '../shared/types';

export class ReportAuditor {
  public static audit(
    validations: ValidationResult[],
    roadmap: RemediationTask[],
    evidenceStore: Evidence[],
    claims: Claim[],
    graph?: any
  ): { validations: ValidationResult[], roadmap: RemediationTask[], audit_warnings: string[] } {
    const validEvidenceIds = new Set(evidenceStore.map(e => e.evidence_id));
    if (graph) {
       (graph.nodes || []).forEach((n: any) => validEvidenceIds.add(n.id));
       (graph.edges || []).forEach((e: any) => validEvidenceIds.add(e.edge_id));
    }
    const validClaimIds = new Set(claims.map(c => c.claim_id));
    const audit_warnings: string[] = [];

    const auditedValidations = validations.map(v => {
      let status = v.status;
      
      // Verify claim exists
      if (!validClaimIds.has(v.claim_id)) {
        audit_warnings.push(`Validation references unknown claim: ${v.claim_id}`);
        // But we'll keep it as we might just ignore it later or return it
      }

      // Check evidence references
      const originalRefsCount = v.evidence_refs.length;
      const validRefs = v.evidence_refs.filter(ref => validEvidenceIds.has(ref));
      
      if (validRefs.length < originalRefsCount) {
        audit_warnings.push(`Claim ${v.claim_id} referenced non-existent evidence IDs. They have been stripped.`);
      }

      // Check graph references
      let originalGraphRefsCount = 0;
      let validGraphRefs: string[] = [];
      if (v.graph_refs) {
         originalGraphRefsCount = v.graph_refs.length;
         validGraphRefs = v.graph_refs.filter(ref => validEvidenceIds.has(ref));
         if (validGraphRefs.length < originalGraphRefsCount) {
           audit_warnings.push(`Claim ${v.claim_id} referenced non-existent graph IDs. They have been stripped.`);
         }
      }

      // If no valid evidence refs, and status isn't INSUFFICIENT_EVIDENCE
      if (validRefs.length === 0 && validGraphRefs.length === 0 && status !== 'INSUFFICIENT_EVIDENCE') {
        status = 'INSUFFICIENT_EVIDENCE';
        audit_warnings.push(`Claim ${v.claim_id} downgraded to INSUFFICIENT_EVIDENCE due to lack of valid evidence or graph references.`);
      }

      // 1. Invalid status mappings check
      const validStatuses = ['VERIFIED', 'PARTIALLY_VERIFIED', 'NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE'];
      if (!validStatuses.includes(status)) {
        status = 'INSUFFICIENT_EVIDENCE';
        audit_warnings.push(`Claim ${v.claim_id} downgraded: Invalid status mapping '${v.status}'.`);
      }

      // Semantic Checks for Execution Evidence
      let hasFailedExecution = false;
      let hasSuccessfulTestExecution = false;
      let hasSuccessfulBuildExecution = false;
      let hasSuccessfulInstallExecution = false;
      let hasAnySourceCode = false;

      for (const ref of validRefs) {
        const ev = evidenceStore.find(e => e.evidence_id === ref);
        if (ev) {
          if (ev.type === 'SOURCE_CODE' || ev.type === 'API_ROUTE') {
            hasAnySourceCode = true;
          }
          if (ev.type === 'COMMAND_OUTPUT' && ev.metadata) {
            const md = ev.metadata;
            if (md.exit_code !== 0 || md.timed_out || md.status === 'SKIPPED' || md.status === 'NOT_SUPPORTED') {
              hasFailedExecution = true;
            }
            if (md.exit_code === 0 && md.phase === 'TEST') {
              hasSuccessfulTestExecution = true;
            }
            if (md.exit_code === 0 && md.phase === 'BUILD') {
              hasSuccessfulBuildExecution = true;
            }
            if (md.exit_code === 0 && md.phase === 'INSTALL') {
              hasSuccessfulInstallExecution = true;
            }
          }
        }
      }

      // Check 3: Fabricated execution claims
      // If the conclusion text claims successful execution (test/build/install) but no corresponding successful evidence is cited
      const conclusionLower = (v.conclusion || '').toLowerCase();
      const claimsExecution = conclusionLower.includes('execution completed') || 
                              conclusionLower.includes('successfully executed') || 
                              conclusionLower.includes('test execution completed successfully') ||
                              conclusionLower.includes('tests passed') ||
                              conclusionLower.includes('build succeeded');
      
      const hasAnySuccessfulExecution = hasSuccessfulBuildExecution || hasSuccessfulTestExecution || hasSuccessfulInstallExecution;
      
      if (status === 'VERIFIED' && claimsExecution && !hasAnySuccessfulExecution) {
        status = 'INSUFFICIENT_EVIDENCE';
        audit_warnings.push(`Claim ${v.claim_id} downgraded to INSUFFICIENT_EVIDENCE: fabricated execution claim detected (claims execution success but cites no successful execution evidence).`);
      }

      // Check 1: VERIFIED but execution failed
      if (status === 'VERIFIED' && hasFailedExecution) {
         status = 'PARTIALLY_VERIFIED';
         audit_warnings.push(`Claim ${v.claim_id} downgraded to PARTIALLY_VERIFIED: execution failed but claim was marked VERIFIED.`);
      }

      // Check 2: Citing only failed execution as proof implementation is absent
      if (status === 'NOT_VERIFIED' && hasFailedExecution && !hasAnySourceCode) {
         status = 'INSUFFICIENT_EVIDENCE';
         audit_warnings.push(`Claim ${v.claim_id} downgraded to INSUFFICIENT_EVIDENCE: cannot conclude implementation absence solely from failed execution.`);
      }

      // Check 4: Claims route exists but no API_ROUTE evidence cited
      let hasApiRoute = false;
      let hasDbOperation = false;

      for (const ref of validRefs) {
        const ev = evidenceStore.find(e => e.evidence_id === ref);
        if (ev) {
          if (ev.type === 'API_ROUTE') hasApiRoute = true;
          if (ev.type === 'DATABASE_OPERATION') hasDbOperation = true;
        }
      }

      const claimsRoute = conclusionLower.includes('route exists') || conclusionLower.includes('api endpoint') || conclusionLower.includes('endpoint is implemented');
      if (status === 'VERIFIED' && claimsRoute && !hasApiRoute) {
         status = 'INSUFFICIENT_EVIDENCE';
         audit_warnings.push(`Claim ${v.claim_id} downgraded to INSUFFICIENT_EVIDENCE: claims a route exists but cites no API_ROUTE evidence.`);
      }

      const claimsDbWrite = conclusionLower.includes('database write') || conclusionLower.includes('inserts into database') || conclusionLower.includes('saves to database') || conclusionLower.includes('database operation');
      if (status === 'VERIFIED' && claimsDbWrite && !hasDbOperation) {
         status = 'INSUFFICIENT_EVIDENCE';
         audit_warnings.push(`Claim ${v.claim_id} downgraded to INSUFFICIENT_EVIDENCE: claims database writes without supporting DATABASE_OPERATION evidence.`);
      }

      // Check 5: Documentation alone is NOT implementation
      let hasImplementationEvidence = false;
      let hasDocumentationEvidence = false;
      for (const ref of validRefs) {
         const ev = evidenceStore.find(e => e.evidence_id === ref);
         if (ev) {
            if (ev.classification === 'IMPLEMENTATION' || ev.type === 'SOURCE_CODE' || ev.type === 'API_ROUTE') hasImplementationEvidence = true;
            if (ev.classification === 'DOCUMENTATION' || ev.type === 'DOCUMENT') hasDocumentationEvidence = true;
         }
      }

      if (status === 'VERIFIED' && !hasImplementationEvidence && hasDocumentationEvidence) {
         status = 'INSUFFICIENT_EVIDENCE';
         audit_warnings.push(`Claim ${v.claim_id} downgraded to INSUFFICIENT_EVIDENCE: documentation alone cannot prove implementation.`);
      }

      // Check 6: VERIFIED but missing execution
      if (status === 'VERIFIED' && hasImplementationEvidence && !hasAnySuccessfulExecution) {
         // Some claims may just claim structural presence (e.g. "a route exists"), but for behavioral claims we need execution.
         // Let's rely on evaluator for deterministic evaluation. If the deterministic evaluation says execution ABSENT, we could downgrade.
         // Actually, Auditor doesn't have the deterministic evaluation here, but we can look at the evidence.
      }

      return {
        ...v,
        status,
        evidence_refs: validRefs,
        graph_refs: validGraphRefs
      };
    });

    const auditedRoadmap = roadmap.filter(task => {
      if (!validClaimIds.has(task.claim_id)) {
        audit_warnings.push(`Roadmap task ${task.task_id} dropped: references unknown claim ${task.claim_id}.`);
        return false;
      }
      return true;
    }).map(task => {
      const validRefs = task.evidence_refs.filter(ref => validEvidenceIds.has(ref));
      if (validRefs.length < task.evidence_refs.length) {
         audit_warnings.push(`Roadmap task ${task.task_id} referenced non-existent evidence IDs. They have been stripped.`);
      }
      return {
        ...task,
        evidence_refs: validRefs
      };
    });

    return { validations: auditedValidations, roadmap: auditedRoadmap, audit_warnings };
  }
}
