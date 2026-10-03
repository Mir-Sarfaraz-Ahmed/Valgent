import { useState } from 'react';
import type { EvidenceGraphData, GraphNode } from '../lib/types';

export default function EvidenceExplorerPanel({
  graph,
  claimId
}: {
  graph?: EvidenceGraphData;
  claimId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (!graph || !graph.claim_chains) {
    return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No verified relationship found (graph unavailable).</div>;
  }

  const chain = graph.claim_chains.find(c => c.claim_id === claimId);
  if (!chain) {
    return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No verified relationship found.</div>;
  }

  const nodes = chain.nodes.map(nodeId => graph.nodes.find(n => n.id === nodeId)).filter(Boolean) as GraphNode[];


  if (nodes.length === 0) {
    return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No verified relationship found.</div>;
  }

  // To build a visual chain, we'll just list the nodes sequentially for simplicity, connected by arrows.
  // We can sort them roughly by their intended sequence, or just the order they appear in chain.nodes.
  // Actually, we'll just display them vertically.

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--primary)',
          cursor: 'pointer',
          padding: 0,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span>{expanded ? '▼' : '▶'}</span>
        Evidence Chain ({nodes.length} nodes)
      </button>

      {expanded && (
        <div style={{ display: 'flex', marginTop: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {nodes.map((node, i) => (
              <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  data-testid={`node-${node.id}`}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: selectedNodeId === node.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{node.type}</div>
                  <div style={{ fontSize: '0.85rem' }}>{node.label}</div>
                </div>
                {i < nodes.length - 1 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: '0.2rem 0' }}>↓</div>
                )}
              </div>
            ))}
          </div>

          {selectedNode && (
            <div style={{ flex: '2', minWidth: '300px', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Node Details</h4>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}><strong>ID:</strong> {selectedNode.id}</p>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}><strong>Type:</strong> {selectedNode.type}</p>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}><strong>Label:</strong> {selectedNode.label}</p>
              {selectedNode.source && <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}><strong>Source:</strong> {selectedNode.source}</p>}

              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Metadata:</strong>
                  <pre style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
