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
            const evidenceStoreMap = new Map(evidenceStore.map(e => [e.evidence_id, e]));
            const evidenceIds = new Set<string>();

            sub.nodes.forEach(n => {
               if (n.type === 'evidence' || evidenceStoreMap.has(n.id)) {
                  evidenceIds.add(n.id);
               }
               if (n.metadata?.evidence_id && evidenceStoreMap.has(n.metadata.evidence_id)) {
                  evidenceIds.add(n.metadata.evidence_id);
               }
            });
            sub.edges.forEach(e => {
               if (e.evidence_refs) {
                  e.evidence_refs.forEach(r => {
                     if (evidenceStoreMap.has(r)) evidenceIds.add(r);
                  });
               }
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
           if (evalStatus.evidence_sufficiency === 'SUFFICIENT' || evalStatus.implementation_status === 'PRESENT') {
              finalStatus = 'VERIFIED';
           } else if (evalStatus.implementation_status === 'PARTIAL') {
              finalStatus = 'PARTIALLY_VERIFIED';
           }

           if (evalStatus.contradiction_status === 'CONTRADICTED') finalStatus = 'NOT_VERIFIED';
           if (evalStatus.implementation_status === 'ABSENT' && evalStatus.execution_status === 'NOT_ATTEMPTED') finalStatus = 'INSUFFICIENT_EVIDENCE';
        }

        const relevantEvs = pkg?.evidence || [];
        const evRefs = relevantEvs.slice(0, 5).map((e: any) => e.evidence_id);
        const graphRefs = (pkg?.subgraph?.nodes || []).slice(0, 5).map((n: any) => n.id);

        let conclusion = 'Deterministic evidence was collected, but semantic synthesis was unavailable.';
        if (finalStatus === 'VERIFIED') {
           const locations = Array.from(new Set(relevantEvs.map((e: any) => e.location))).filter(Boolean).slice(0, 3).join(', ');
           conclusion = locations ? `Verified by deterministic AST inspection across implementation evidence: ${locations}.` : 'Verified by deterministic AST inspection.';
        } else if (finalStatus === 'PARTIALLY_VERIFIED') {
           const locations = Array.from(new Set(relevantEvs.map((e: any) => e.location))).filter(Boolean).slice(0, 3).join(', ');
           conclusion = locations ? `Partially verified through static symbols in ${locations}. Dynamic execution tests were not run.` : 'Partially verified through static symbols.';
        } else if (finalStatus === 'NOT_VERIFIED') {
           conclusion = 'Deterministic checks identified a direct contradiction in repository code or execution.';
        } else {
           conclusion = 'No matching AST symbols, routes, or implementation files were found for this claim.';
        }

        return {
          claim_id: c.claim_id,
          text: c.text,
          status: finalStatus,
          conclusion,
          evidence_refs: evRefs,
          graph_refs: graphRefs,
          limitations: evalStatus?.deterministic_constraints || [],
          missing_evidence: finalStatus === 'INSUFFICIENT_EVIDENCE' ? ['Matching AST symbol or route'] : [],
          requirement_refs: pkg?.requirement_id ? [pkg.requirement_id] : [],
          checks: ['AST Symbol Inspection', 'Route Table Analysis']
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
