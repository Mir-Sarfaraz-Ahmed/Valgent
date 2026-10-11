export type ClaimStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'NOT_VERIFIED'
  | 'INSUFFICIENT_EVIDENCE';

export interface EvidenceReference {
  evidence_id: string;
  source: string;
  path: string;
  line_start?: number;
  line_end?: number;
  snippet?: string;
  classification: string;
  description: string;
}

export interface ClaimValidation {
  claim_id: string;
  text: string;
  status: ClaimStatus;
  reason: string;
  evidence_ids: string[];
  evidence_items?: EvidenceReference[];
  limitations?: string[];
  contradictions?: string[];
}

export interface RoadmapTask {
  id: string;
  claim_id?: string;
  title: string;
  problem: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence_refs: string[];
  recommended_actions: string[];
  acceptance_criteria: string[];
  dependencies?: string[];
  status?: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
}

export interface GraphNode {
  id: string;
  type: 'claim' | 'requirement' | 'evidence' | 'symbol' | 'route' | 'database' | 'execution';
  label: string;
  sublabel?: string;
  status?: ClaimStatus;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface EvidenceGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AnalysisSummary {
  total_claims: number;
  verified_count: number;
  partially_verified_count: number;
  not_verified_count: number;
  insufficient_evidence_count: number;
}

export interface ProjectReport {
  schema_version: string;
  analysis_run_id: string;
  project_id: string;
  repository_url: string;
  commit_sha: string;
  branch?: string;
  timestamp: string;
  duration_ms: number;
  status: 'COMPLETED' | 'DEGRADED' | 'FAILED';
  summary: AnalysisSummary;
  claims: ClaimValidation[];
  evidence: EvidenceReference[];
  graph: EvidenceGraphData;
  roadmap: RoadmapTask[];
  architecture?: {
    components: string[];
    entry_points: string[];
    api_routes: string[];
    databases: string[];
  };
  diagnostics?: {
    warnings: string[];
    errors: string[];
    provider_info?: string;
  };
}
