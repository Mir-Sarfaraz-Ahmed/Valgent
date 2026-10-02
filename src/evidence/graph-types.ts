export type GraphNodeType = 
  | 'claim' 
  | 'requirement' 
  | 'evidence' 
  | 'symbol' 
  | 'route' 
  | 'databaseOperation' 
  | 'test' 
  | 'executionResult';

export type EvidenceEdgeType =
  | 'CLAIM_REQUIRES'
  | 'REQUIREMENT_SUPPORTED_BY'
  | 'EVIDENCE_LOCATES'
  | 'EVIDENCE_DEFINES'
  | 'ROUTE_HANDLES'
  | 'SYMBOL_CALLS'
  | 'SYMBOL_IMPORTS'
  | 'SYMBOL_EXPORTS'
  | 'SYMBOL_PERSISTS'
  | 'TEST_COVERS'
  | 'EXECUTION_VALIDATES';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface EvidenceEdge {
  edge_id: string;
  from: string;
  to: string;
  type: EvidenceEdgeType;
  confidence: number;
  evidence_refs: string[];
}

export type CompletenessStatus = 'COMPLETE' | 'PARTIAL' | 'BROKEN' | 'UNRESOLVED';

export interface ClaimChain {
  claim_id: string;
  requirement_id?: string;
  completeness: CompletenessStatus;
  nodes: string[];
  edges: string[];
}

export interface EvidenceGraphData {
  graph_version: string;
  nodes: GraphNode[];
  edges: EvidenceEdge[];
  claim_chains: ClaimChain[];
}
