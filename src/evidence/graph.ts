import { EvidenceGraphData, GraphNode, EvidenceEdge, GraphNodeType, EvidenceEdgeType, ClaimChain, CompletenessStatus } from './graph-types';

export class EvidenceGraph {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, EvidenceEdge>();
  private claimChains = new Map<string, ClaimChain>();

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  public getNodesByType(type: GraphNodeType): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  public addEdge(edge: EvidenceEdge): void {
    if (!edge.edge_id) {
      edge.edge_id = `EDGE-${edge.from}-${edge.to}-${edge.type}`;
    }
    this.edges.set(edge.edge_id, edge);
  }

  public getEdge(id: string): EvidenceEdge | undefined {
    return this.edges.get(id);
  }

  public getEdgesFrom(fromId: string): EvidenceEdge[] {
    return Array.from(this.edges.values()).filter(e => e.from === fromId);
  }

  public getEdgesTo(toId: string): EvidenceEdge[] {
    return Array.from(this.edges.values()).filter(e => e.to === toId);
  }

  public addClaimChain(chain: ClaimChain): void {
    this.claimChains.set(chain.claim_id, chain);
  }

  public getClaimChain(claimId: string): ClaimChain | undefined {
    return this.claimChains.get(claimId);
  }

  public serialize(): EvidenceGraphData {
    return {
      graph_version: '1.0',
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      claim_chains: Array.from(this.claimChains.values())
    };
  }

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.claimChains.clear();
  }
}
