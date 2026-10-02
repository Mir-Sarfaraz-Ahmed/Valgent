import { Claim, ValidationAction } from '../shared/types';
import { GraphNode, EvidenceEdge } from '../evidence/graph-types';
import * as crypto from 'crypto';

export class ValidationPlanner {
  public static plan(
    claim: Claim,
    requirement: string,
    claimSubgraph: { nodes: GraphNode[], edges: EvidenceEdge[], truncated: boolean },
    evaluation: any
  ): ValidationAction[] {
    const actions: ValidationAction[] = [];
    
    if (claim.text.toLowerCase().includes('build')) {
       if (evaluation.execution_status === 'NOT_ATTEMPTED' || evaluation.execution_status === 'ABSENT') {
         actions.push({
          action_id: `ACT-${crypto.randomUUID()}`,
          claim_id: claim.claim_id,
          type: 'BUILD',
          rationale: 'Claim directly requires build verification.',
          required_evidence: ['BUILD_RESULT'],
          risk_level: 'LOW',
          estimated_cost: 'MEDIUM',
          prerequisites: ['SOURCE_CODE']
        });
       }
    }

    if (evaluation.implementation_status === 'PRESENT' || evaluation.implementation_status === 'PARTIAL') {
        if (evaluation.execution_status === 'NOT_ATTEMPTED' || evaluation.execution_status === 'ABSENT') {
            const hasTest = claimSubgraph.nodes.some(n => n.type === 'evidence' && n.metadata && n.metadata.classification === 'TEST');
            
            actions.push({
                action_id: `ACT-${crypto.randomUUID()}`,
                claim_id: claim.claim_id,
                type: 'TEST',
                rationale: 'Claim has implementation evidence but lacks execution/test evidence.',
                required_evidence: ['TEST_RESULT'],
                risk_level: 'LOW',
                estimated_cost: 'MEDIUM',
                prerequisites: ['IMPLEMENTATION']
            });
            
            const testFiles = claimSubgraph.nodes
                .filter(n => n.type === 'evidence' && n.metadata && (n.metadata.location?.includes('.test.') || n.metadata.location?.includes('.spec.')))
                .map(n => n.metadata?.location)
                .filter(Boolean);
                
            if (testFiles.length > 0) {
                actions.unshift({
                action_id: `ACT-${crypto.randomUUID()}`,
                claim_id: claim.claim_id,
                type: 'TARGETED_TEST',
                target: testFiles[0],
                rationale: `Targeted test found in subgraph: ${testFiles[0]}`,
                required_evidence: ['TEST_RESULT'],
                risk_level: 'LOW',
                estimated_cost: 'LOW',
                prerequisites: ['IMPLEMENTATION']
                });
            }
        }
    }

    // Default to NONE if no action is clearly useful, to prevent unnecessary execution
    if (actions.length === 0) {
       // Only if we need to return something
    }

    return actions;
  }
}
