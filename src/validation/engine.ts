import { Evidence, Claim, ValidationResult, RemediationTask, ProjectReport } from '../shared/types';
import { LLMProvider } from '../llm/provider';
import { ReportAuditor } from './auditor';
import { z } from 'zod';
import { EvidenceGraphQuery } from '../evidence/graph-query';
import { ContextDigest, ContextSelector } from '../context';

export class ValidationEngine {
  public static async validate(
    claims: Claim[],
    evidenceStore: Evidence[],
    provider: LLMProvider,
    graph?: any,
    digest?: ContextDigest
  ): Promise<{ validations: ValidationResult[], roadmap: RemediationTask[], audit_warnings: string[] }> {
    if (!claims || claims.length === 0) {
      return { validations: [], roadmap: [], audit_warnings: [] };
    }

    let packages: any[] = [];
    try {

      let query: EvidenceGraphQuery | undefined;
      if (graph) {
         const { EvidenceGraph } = require('../evidence/graph');
         let graphInst = graph;
         if (!(graph instanceof EvidenceGraph)) {
            graphInst = new EvidenceGraph();
            if (graph.nodes) graph.nodes.forEach((n: any) => graphInst.addNode(n));
            if (graph.edges) graph.edges.forEach((e: any) => graphInst.addEdge(e));
         }
         query = new EvidenceGraphQuery(graphInst);
      }

      for (const claim of claims) {
         let subgraph = { nodes: [], edges: [], claim_chains: [], graph_version: '1.0' };
         let relEvidence: Evidence[] = [];

         if (query) {
            const sub = query.getClaimSubgraph(claim.claim_id, { maxDepth: 10, maxNodes: 100, maxEvidenceBytes: 50000 });
            subgraph.nodes = sub.nodes as any;
            subgraph.edges = sub.edges as any;
            (subgraph as any).truncated = sub.truncated;

            // extract evidence subset
            const evidenceIds = new Set<string>();
            sub.nodes.filter(n => n.type === 'evidence').forEach(n => evidenceIds.add(n.id));
            sub.edges.forEach(e => {
               if (e.evidence_refs) e.evidence_refs.forEach(r => evidenceIds.add(r));
            });

            relEvidence = evidenceStore.filter(e => evidenceIds.has(e.evidence_id));
         } else {
            relEvidence = evidenceStore;
         }

         const { ClaimEvidenceEvaluator } = require('./evaluator');
         const { GraphRoadmapGenerator } = require('./roadmap');

         const reqId = (graph?.getNodesByType ? graph.getNodesByType('requirement') : (graph?.nodes || [])).find((n: any) => n.metadata?.claim_id === claim.claim_id)?.id;

         const evaluation = ClaimEvidenceEvaluator.evaluate(claim, reqId, subgraph as any, relEvidence);
         const roadmap = GraphRoadmapGenerator.generate(claim, reqId, subgraph as any, evaluation, relEvidence);

         let contextSelection;
         if (digest) {
           contextSelection = ContextSelector.select(digest, relEvidence, subgraph as any, { tokenBudget: 12000 });
         }

         packages.push({
           claim,
           requirement_id: reqId,
           subgraph,
           evidence: relEvidence,
           context: contextSelection,
           deterministic_evaluation: evaluation,
           deterministic_roadmap: roadmap
         });
      }

      // 1. Ask provider to perform validation
      const providerResult = await provider.validateClaims(packages);

      const combinedRoadmap = [...providerResult.roadmap];
      packages.forEach(p => {
        if (p.deterministic_roadmap) {
           p.deterministic_roadmap.forEach((task: any) => combinedRoadmap.push(task));
        }
      });

      // 2. Audit the results to ensure NO hallucinated evidence IDs
      const audited = ReportAuditor.audit(providerResult.validations, combinedRoadmap, evidenceStore, claims, graph);

      return audited;
    } catch (error) {
      console.error('[ValidationEngine] Caught error:', error);
      // If provider fails, we degrade gracefully for all claims, using deterministic fallback
      const validations: ValidationResult[] = claims.map(c => {
        const pkg = packages.find((p: any) => p.claim.claim_id === c.claim_id);
        const evalStatus = pkg ? pkg.deterministic_evaluation : null;
        let finalStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'NOT_VERIFIED' | 'INSUFFICIENT_EVIDENCE' = 'INSUFFICIENT_EVIDENCE';

        if (evalStatus) {
           if (evalStatus.evidence_sufficiency === 'SUFFICIENT') finalStatus = 'VERIFIED';
           else if (evalStatus.implementation_status === 'PARTIAL' || evalStatus.implementation_status === 'PRESENT') finalStatus = 'PARTIALLY_VERIFIED';

           if (evalStatus.contradiction_status === 'CONTRADICTED') finalStatus = 'NOT_VERIFIED';
           if (evalStatus.implementation_status === 'ABSENT' && evalStatus.execution_status === 'NOT_ATTEMPTED') finalStatus = 'INSUFFICIENT_EVIDENCE';
        }

        return {
          claim_id: c.claim_id,
          text: c.text,
          status: finalStatus,
          conclusion: 'Deterministic evidence was collected, but semantic synthesis was unavailable.',
          evidence_refs: [],
          graph_refs: [],
          limitations: [],
          missing_evidence: [],
          requirement_refs: [],
          checks: []
        };
      });

      return { validations, roadmap: [], audit_warnings: ['Provider validation failed, defaulted to deterministic analysis'] };
    }
  }

  public static calculateSummary(validations: ValidationResult[]) {
    const summary = {
      claims_total: validations.length,
      verified: 0,
      partially_verified: 0,
      not_verified: 0,
      insufficient_evidence: 0
    };

    validations.forEach(v => {
      if (v.status === 'VERIFIED') summary.verified++;
      else if (v.status === 'PARTIALLY_VERIFIED') summary.partially_verified++;
      else if (v.status === 'NOT_VERIFIED') summary.not_verified++;
      else if (v.status === 'INSUFFICIENT_EVIDENCE') summary.insufficient_evidence++;
    });

    return summary;
  }
}
