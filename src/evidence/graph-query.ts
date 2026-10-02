import { EvidenceGraph } from './graph';
import { GraphNode, EvidenceEdge, EvidenceEdgeType, GraphNodeType } from './graph-types';

export interface GraphQueryOptions {
  maxDepth?: number;
  allowedEdgeTypes?: EvidenceEdgeType[];
  allowedNodeTypes?: GraphNodeType[];
  maxNodes?: number;
  maxEvidenceBytes?: number;
}

export class EvidenceGraphQuery {
  constructor(private graph: EvidenceGraph) {}

  public getClaimSubgraph(claimId: string, options?: GraphQueryOptions): { nodes: GraphNode[], edges: EvidenceEdge[], truncated: boolean } {
    const maxDepth = options?.maxDepth ?? 10;
    const maxNodes = options?.maxNodes ?? 100;
    const allowedEdges = options?.allowedEdgeTypes;
    const allowedNodes = options?.allowedNodeTypes;

    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, EvidenceEdge>();
    let truncated = false;

    const claimNode = this.graph.getNode(claimId);
    if (!claimNode) return { nodes: [], edges: [], truncated };
    if (allowedNodes && !allowedNodes.includes(claimNode.type)) return { nodes: [], edges: [], truncated };

    nodes.set(claimId, claimNode);

    // Bounded BFS
    const queue: { id: string, depth: number }[] = [{ id: claimId, depth: 0 }];

    while(queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      if (nodes.size >= maxNodes) break;

      const outEdges = this.graph.getEdgesFrom(id);
      for (const e of outEdges) {
         if (allowedEdges && !allowedEdges.includes(e.type)) continue;
         
         const toNode = this.graph.getNode(e.to);
         if (!toNode) continue;
         if (allowedNodes && !allowedNodes.includes(toNode.type)) continue;

         edges.set(e.edge_id, e);
         if (!nodes.has(e.to)) {
            if (nodes.size >= maxNodes) break;
            nodes.set(e.to, toNode);
            queue.push({ id: e.to, depth: depth + 1 });
         }
      }
      
      // Look backward for evidence connecting to this node
      // E.g., EVIDENCE_LOCATES to -> current node
      const allEdges = this.graph.serialize().edges;
      for (const e of allEdges) {
          if (e.to === id && (e.type === 'EVIDENCE_LOCATES' || e.type === 'EXECUTION_VALIDATES')) {
             if (allowedEdges && !allowedEdges.includes(e.type)) continue;
             const fromNode = this.graph.getNode(e.from);
             if (!fromNode) continue;
             if (allowedNodes && !allowedNodes.includes(fromNode.type)) continue;
             
             edges.set(e.edge_id, e);
             if (!nodes.has(e.from)) {
                if (nodes.size >= maxNodes) break;
                nodes.set(e.from, fromNode);
                queue.push({ id: e.from, depth: depth + 1 });
             }
          }
      }
    }

    // Sort to maintain deterministic subgraph ordering
    let sortedNodes = Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id));
    let sortedEdges = Array.from(edges.values()).sort((a, b) => a.edge_id.localeCompare(b.edge_id));

    if (options?.maxEvidenceBytes) {
      let currentBytes = 0;
      const keepNodes: GraphNode[] = [];
      for (const node of sortedNodes) {
        const nodeBytes = Buffer.byteLength(JSON.stringify(node), 'utf8');
        if (currentBytes + nodeBytes > options.maxEvidenceBytes) {
          truncated = true;
          break;
        }
        currentBytes += nodeBytes;
        keepNodes.push(node);
      }
      sortedNodes = keepNodes;
      const validNodeIds = new Set(sortedNodes.map(n => n.id));
      sortedEdges = sortedEdges.filter(e => validNodeIds.has(e.from) && validNodeIds.has(e.to));
    }

    return { nodes: sortedNodes, edges: sortedEdges, truncated };
  }
}
