import { Claim, Evidence, DeterministicEvaluation } from '../shared/types';
import { GraphNode, EvidenceEdge } from '../evidence/graph-types';

export class ClaimEvidenceEvaluator {
  public static evaluate(
    claim: Claim,
    requirementId: string | undefined,
    subgraph: { nodes: GraphNode[]; edges: EvidenceEdge[]; truncated: boolean },
    evidenceStore: Evidence[]
  ): DeterministicEvaluation {
    let implementation_status: 'PRESENT' | 'PARTIAL' | 'ABSENT' = 'ABSENT';
    let execution_status: 'PASSED' | 'FAILED' | 'NOT_ATTEMPTED' | 'ABSENT' = 'ABSENT';
    let test_status: 'PASSED' | 'FAILED' | 'NOT_ATTEMPTED' | 'ABSENT' = 'ABSENT';
    let contradiction_status: 'CONTRADICTED' | 'NONE' = 'NONE';
    let evidence_sufficiency: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT' = 'INSUFFICIENT';
    const constraints: string[] = [];

    const evidenceMap = new Map(evidenceStore.map(e => [e.evidence_id, e]));

    let implementationNodes = 0;
    let docNodes = 0;

    for (const node of subgraph.nodes) {
      const ev = evidenceMap.get(node.id);
      if (ev) {
        if (ev.classification === 'IMPLEMENTATION') implementationNodes++;
        if (ev.classification === 'DOCUMENTATION') docNodes++;
      }
    }

    if (implementationNodes > 0) {
      implementation_status = implementationNodes >= 2 ? 'PRESENT' : 'PARTIAL';
    }

    let buildPassed = false;
    let buildFailed = false;
    let testPassed = false;
    let testFailed = false;

    for (const ev of evidenceStore) {
      if (ev.classification === 'EXECUTION' && ev.metadata?.phase === 'BUILD') {
        if (ev.metadata.exit_code === 0 || ev.metadata.status === 'PASSED') buildPassed = true;
        else buildFailed = true;
      }
      if (ev.classification === 'TEST' && ev.metadata?.phase === 'TEST') {
        if (ev.metadata.exit_code === 0 || ev.metadata.status === 'PASSED') testPassed = true;
        else testFailed = true;
      }
    }

    if (buildFailed) execution_status = 'FAILED';
    else if (buildPassed) execution_status = 'PASSED';
    else execution_status = 'NOT_ATTEMPTED';

    if (testFailed) test_status = 'FAILED';
    else if (testPassed) test_status = 'PASSED';
    else test_status = 'NOT_ATTEMPTED';

    if (implementation_status === 'PRESENT' && (execution_status === 'FAILED' || test_status === 'FAILED')) {
      contradiction_status = 'CONTRADICTED';
      constraints.push('Execution or test failed despite implementation presence.');
    }

    if (implementation_status === 'PRESENT' && execution_status === 'PASSED' && test_status === 'PASSED') {
      evidence_sufficiency = 'SUFFICIENT';
    } else if (implementation_status === 'PRESENT' || implementation_status === 'PARTIAL') {
      evidence_sufficiency = 'PARTIAL';
    }

    if (implementation_status === 'ABSENT' && docNodes > 0) {
      constraints.push('Documentation alone is NOT implementation evidence.');
    }

    if (implementation_status === 'PRESENT' && (execution_status as string === 'ABSENT' || execution_status === 'NOT_ATTEMPTED')) {
      constraints.push('Implementation exists but execution was not attempted or absent.');
    }

    return {
      implementation_status,
      execution_status,
      test_status,
      contradiction_status,
      evidence_sufficiency,
      deterministic_constraints: constraints
    };
  }
}
