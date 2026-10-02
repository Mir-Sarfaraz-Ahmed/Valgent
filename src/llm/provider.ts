import { z } from 'zod';
import { Evidence, Claim } from '../shared/types';

// Zod schema for analysis
export const LLMAnalysisSchema = z.object({
  architecture: z.object({
    components: z.array(z.string()),
    entry_points: z.array(z.string()),
    api_routes: z.array(z.string()),
    databases: z.array(z.string()),
  }),
  features: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type LLMAnalysisResult = z.infer<typeof LLMAnalysisSchema>;

export const LLMValidationSchema = z.object({
  validations: z.array(z.object({
    claim_id: z.string(),
    text: z.string(),
    status: z.enum(['VERIFIED', 'PARTIALLY_VERIFIED', 'NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE']),
    conclusion: z.string(),
    evidence_refs: z.array(z.string()),
    graph_refs: z.array(z.string()),
    requirement_refs: z.array(z.string()),
    checks: z.array(z.string()),
    limitations: z.array(z.string()),
    missing_evidence: z.array(z.string())
  })),
  roadmap: z.array(z.object({
    task_id: z.string(),
    claim_id: z.string(),
    requirement_id: z.string().optional(),
    title: z.string(),
    problem: z.string(),
    evidence_refs: z.array(z.string()),
    recommended_actions: z.array(z.string()),
    acceptance_criteria: z.array(z.string())
  }))
});

export type LLMValidationResult = z.infer<typeof LLMValidationSchema>;

import { EvidenceGraphData } from '../evidence/graph-types';

export interface ClaimValidationPackage {
  claim: {claim_id: string, text: string};
  requirement_id?: string;
  subgraph: EvidenceGraphData;
  evidence: Evidence[];
}

export interface LLMProvider {
  readonly name: string;
  analyzeEvidence(evidenceStore: Evidence[], graph?: EvidenceGraphData): Promise<LLMAnalysisResult>;
  validateClaims(packages: ClaimValidationPackage[]): Promise<LLMValidationResult>;
}
