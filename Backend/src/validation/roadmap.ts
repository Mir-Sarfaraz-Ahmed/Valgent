import { Claim, RemediationTask, DeterministicEvaluation, Evidence } from '../shared/types';
import { GraphNode, EvidenceEdge } from '../evidence/graph-types';
import * as crypto from 'crypto';

export class GraphRoadmapGenerator {
  public static generate(
    claim: Claim,
    requirementId: string | undefined,
    subgraph: { nodes: GraphNode[]; edges: EvidenceEdge[]; truncated: boolean },
    evaluation: DeterministicEvaluation,
    evidenceStore: Evidence[]
  ): RemediationTask[] {
    const tasks: RemediationTask[] = [];
    const evidenceMap = new Map(evidenceStore.map(e => [e.evidence_id, e]));

    // Deterministic roadmap tasks based on constraints and evaluation state
    if (evaluation.implementation_status === 'PARTIAL') {
      tasks.push({
        task_id: `TASK-${crypto.createHash('sha256').update(claim.claim_id + 'PARTIAL_IMPL').digest('hex').substring(0, 8)}`,
        claim_id: claim.claim_id,
        requirement_id: requirementId,
        title: 'Complete partial implementation',
        problem: 'The claim is only partially implemented based on evidence.',
        evidence_refs: subgraph.nodes.map(n => n.id).filter(id => {
            const ev = evidenceMap.get(id);
            return ev && ev.classification === 'IMPLEMENTATION';
        }),
        recommended_actions: ['Implement missing components required by the claim.'],
        acceptance_criteria: ['All required structural evidence (e.g. routes, handlers) is present.']
      });
    }

    if (evaluation.contradiction_status === 'CONTRADICTED' || evaluation.execution_status === 'FAILED' || evaluation.test_status === 'FAILED') {
      tasks.push({
        task_id: `TASK-${crypto.createHash('sha256').update(claim.claim_id + 'EXEC_FAIL').digest('hex').substring(0, 8)}`,
        claim_id: claim.claim_id,
        requirement_id: requirementId,
        title: 'Resolve execution/test failure',
        problem: 'Implementation exists but execution or test failed.',
        evidence_refs: subgraph.nodes.map(n => n.id).filter(id => {
            const ev = evidenceMap.get(id);
            return ev && (ev.classification === 'EXECUTION' || ev.classification === 'TEST');
        }),
        recommended_actions: ['Fix the build or test failure preventing validation.'],
        acceptance_criteria: ['Execution/tests pass successfully.']
      });
    }

    if (evaluation.implementation_status === 'PRESENT' && (evaluation.execution_status === 'ABSENT' || evaluation.execution_status === 'NOT_ATTEMPTED') && (evaluation.test_status === 'ABSENT' || evaluation.test_status === 'NOT_ATTEMPTED')) {
      tasks.push({
        task_id: `TASK-${crypto.createHash('sha256').update(claim.claim_id + 'MISSING_TESTS').digest('hex').substring(0, 8)}`,
        claim_id: claim.claim_id,
        requirement_id: requirementId,
        title: 'Add execution/test coverage',
        problem: 'Implementation exists but has no execution or test evidence.',
        evidence_refs: [],
        recommended_actions: ['Add targeted tests for this specific implementation.'],
        acceptance_criteria: ['A test exists and passes for this feature.']
      });
    }

    // Sort deterministically
    return tasks.sort((a, b) => a.task_id.localeCompare(b.task_id));
  }
}
