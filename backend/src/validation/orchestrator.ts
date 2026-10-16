import { Claim, ValidationResult, ActionDecisionRecord, ValidationStatus, ValidationAction, RemediationTask } from '../shared/types';
import { LLMProvider } from '../llm/provider';
import { EvidenceGraph } from '../evidence/graph';
import { EvidenceGraphQuery } from '../evidence/graph-query';
import { ValidationPlanner } from './planner';
import { ValidationSafetyPolicy } from './safety';
import { ClaimEvidenceEvaluator } from './evaluator';
import { DockerSandbox } from '../sandbox/docker';
import { EvidenceEngine } from '../evidence/engine';
import { ValidationEngine } from './engine';
import * as crypto from 'crypto';
import { ContextDigest } from '../context';

export class ValidationOrchestrator {
  private executedActions = new Set<string>();

  constructor(private engine: EvidenceEngine, private localPath: string, private skipExecution: boolean = false) {}

  public async orchestrate(
    claims: Claim[],
    graph: EvidenceGraph,
    provider: LLMProvider,
    digest?: ContextDigest
  ): Promise<{ validations: ValidationResult[], audit_warnings: string[], audit_trail: ActionDecisionRecord[], roadmap: RemediationTask[] }> {
    const audit_trail: ActionDecisionRecord[] = [];
    const MAX_ACTIONS_PER_CLAIM = 3;
    const query = new EvidenceGraphQuery(graph);

    let cachedBuildStatus = 'NOT_ATTEMPTED';

    for (const claim of claims) {
      let actionsTaken = 0;
      let claimVerified = false;

      while (actionsTaken < MAX_ACTIONS_PER_CLAIM && !claimVerified) {
        const sub = query.getClaimSubgraph(claim.claim_id, { maxDepth: 10, maxNodes: 100 });

        const reqId = graph.getNodesByType('requirement').find(n => n.metadata?.claim_id === claim.claim_id)?.id;
        const relEvidence = this.engine.getEvidence().filter(e => sub.nodes.some(n => n.id === e.evidence_id) || sub.edges.some(edge => edge.evidence_refs?.includes(e.evidence_id)));
        const evaluation = ClaimEvidenceEvaluator.evaluate(claim, reqId, sub as any, relEvidence);

        if (evaluation.evidence_sufficiency === 'SUFFICIENT') {
           claimVerified = true;
           break;
        }

        const candidates = ValidationPlanner.plan(claim, reqId || '', sub as any, evaluation);

        if (candidates.length === 0) {
           audit_trail.push({
             decision_id: crypto.randomUUID(),
             claim_id: claim.claim_id,
             candidate_actions: [],
             selection_reason: 'No useful action exists',
             safety_decision: 'REJECTED',
             result: 'ACTION_NOT_SELECTED',
             new_evidence: []
           });
           break;
        }

        let selectedAction: ValidationAction | undefined = undefined;
        for (const c of candidates) {
            const dedupeKey = `${c.type}:${c.target || ''}`;
            if (!this.executedActions.has(dedupeKey)) {
                selectedAction = c;
                this.executedActions.add(dedupeKey);
                break;
            }
        }

        if (!selectedAction) {
           audit_trail.push({
             decision_id: crypto.randomUUID(),
             claim_id: claim.claim_id,
             candidate_actions: candidates,
             selection_reason: 'All candidate actions have already been executed',
             safety_decision: 'REJECTED',
             result: 'ACTION_SKIPPED_CACHED',
             new_evidence: []
           });
           break;
        }

        if (selectedAction.type === 'BUILD' && cachedBuildStatus === 'PASSED') {
           audit_trail.push({
             decision_id: crypto.randomUUID(),
             claim_id: claim.claim_id,
             candidate_actions: candidates,
             selected_action: selectedAction,
             selection_reason: 'Build cached',
             safety_decision: 'ALLOWED',
             result: 'ACTION_SKIPPED_CACHED',
             new_evidence: []
           });
           continue;
        }

        const safety = ValidationSafetyPolicy.evaluate(selectedAction);
        if (safety.status === 'REJECTED') {
           audit_trail.push({
             decision_id: crypto.randomUUID(),
             claim_id: claim.claim_id,
             candidate_actions: candidates,
             selected_action: selectedAction,
             selection_reason: safety.reason || 'Safety rejected',
             safety_decision: 'REJECTED',
             result: 'ACTION_REJECTED',
             new_evidence: []
           });
           break;
        }

        let resultStatus: 'ACTION_FAILED' | 'ACTION_SUCCEEDED' = 'ACTION_FAILED';
        const newEvIds: string[] = [];

        if (safety.command) {
            if (this.skipExecution) {
               audit_trail.push({
                 decision_id: crypto.randomUUID(),
                 claim_id: claim.claim_id,
                 candidate_actions: candidates,
                 selected_action: selectedAction,
                 selection_reason: 'Execution skipped per request options',
                 safety_decision: 'REJECTED',
                 result: 'ACTION_NOT_ATTEMPTED',
                 new_evidence: []
               });
               break;
            }

            const sandbox = new DockerSandbox(this.localPath);
            const executionId = `EXE-${crypto.randomUUID()}`;
            const runRes = await sandbox.runCommand(safety.command, safety.sandboxOptions);

            resultStatus = runRes.exit_code === 0 ? 'ACTION_SUCCEEDED' : 'ACTION_FAILED';
            if (selectedAction.type === 'BUILD') cachedBuildStatus = resultStatus === 'ACTION_SUCCEEDED' ? 'PASSED' : 'FAILED';

            const evType = selectedAction.type === 'BUILD' ? 'BUILD_RESULT' : (selectedAction.type === 'STATIC_INSPECTION' ? 'SOURCE_CODE' : 'TEST_RESULT');
            const ev = this.engine.addEvidence(
               evType as any,
               'sandbox',
               runRes.stdout + '\n' + runRes.stderr,
               `${selectedAction.type} output`,
               'execution',
               undefined, undefined,
               { execution_id: executionId, exit_code: runRes.exit_code, phase: selectedAction.type }
            );

            newEvIds.push(ev.evidence_id);
            graph.addNode({ id: ev.evidence_id, type: 'evidence', label: ev.evidence_id, metadata: { classification: ev.classification } });
            graph.addEdge({ edge_id: `E-${crypto.randomUUID()}`, from: claim.claim_id, to: ev.evidence_id, type: 'CLAIM_REQUIRES', confidence: 1, evidence_refs: [] });
        }

        const subAfter = query.getClaimSubgraph(claim.claim_id, { maxDepth: 10, maxNodes: 100 });
        const relEvidenceAfter = this.engine.getEvidence().filter(e => subAfter.nodes.some(n => n.id === e.evidence_id) || subAfter.edges.some(edge => edge.evidence_refs?.includes(e.evidence_id)));
        const evaluationAfter = ClaimEvidenceEvaluator.evaluate(claim, reqId, subAfter as any, relEvidenceAfter);

        let reEvalStatus: ValidationStatus = 'NOT_VERIFIED';
        if (evaluationAfter.evidence_sufficiency === 'SUFFICIENT') reEvalStatus = 'VERIFIED';
        else if (evaluationAfter.implementation_status === 'PARTIAL' || evaluationAfter.implementation_status === 'PRESENT') reEvalStatus = 'PARTIALLY_VERIFIED';
        if (evaluationAfter.contradiction_status === 'CONTRADICTED') reEvalStatus = 'NOT_VERIFIED';
        if (evaluationAfter.implementation_status === 'ABSENT' && evaluationAfter.execution_status === 'NOT_ATTEMPTED') reEvalStatus = 'INSUFFICIENT_EVIDENCE';

        audit_trail.push({
             decision_id: crypto.randomUUID(),
             claim_id: claim.claim_id,
             candidate_actions: candidates,
             selected_action: selectedAction,
             selection_reason: 'Deterministic planning selected action',
             safety_decision: 'ALLOWED',
             execution_id: `EXE-${crypto.randomUUID()}`,
             result: resultStatus,
             new_evidence: newEvIds,
             re_evaluation_result: reEvalStatus
        });

        actionsTaken++;
      }
    }
    const { validations, audit_warnings, roadmap } = await ValidationEngine.validate(claims, this.engine.getEvidence(), provider, graph, digest);
    return { validations, audit_warnings, audit_trail, roadmap };
  }
}
