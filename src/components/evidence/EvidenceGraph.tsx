import React, { useState } from 'react';
import { Network, Filter, Search, List, Layers, ShieldCheck, Database, Code, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { EvidenceGraphData, GraphNode } from '../../types/report';
import { ClaimStatusBadge } from '../claims/ClaimStatusBadge';

interface EvidenceGraphProps {
  graph: EvidenceGraphData;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({ graph }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');

  const filteredNodes = graph.nodes.filter((node) => {
    const matchesType = filterType === 'all' || node.type === filterType;
    const matchesSearch =
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.sublabel && node.sublabel.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'claim':
        return ShieldCheck;
      case 'route':
        return Network;
      case 'database':
        return Database;
      default:
        return Code;
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-panel">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 py-2 text-xs"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {['all', 'claim', 'symbol', 'route', 'execution'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-all ${
                  filterType === type
                    ? 'bg-gradient-to-r from-[#DC586D] to-[#A33757] text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:bg-black/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle (Visual Canvas vs Accessible List) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)]">
          <button
            onClick={() => setViewMode('visual')}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'visual'
                ? 'bg-white dark:bg-white/15 text-[var(--text-primary)] shadow-sm font-semibold'
                : 'text-[var(--text-muted)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Canvas</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-white/15 text-[var(--text-primary)] shadow-sm font-semibold'
                : 'text-[var(--text-muted)]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List View</span>
          </button>
        </div>
      </div>

      {/* Main Canvas & Details Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Graph Area */}
        <div className="lg:col-span-2 min-h-[460px] rounded-2xl border border-[var(--border-soft)] glass-panel p-6 flex flex-col justify-between relative overflow-hidden">
          {viewMode === 'visual' ? (
            <div className="relative w-full h-[420px] flex items-center justify-center">
              {/* Subtle visual SVG connecting lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                <defs>
                  <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FB9590" />
                    <stop offset="100%" stopColor="#A33757" />
                  </linearGradient>
                </defs>
                <path d="M 120 100 Q 250 80 400 120" stroke="url(#edge-grad)" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                <path d="M 120 220 Q 280 200 420 240" stroke="url(#edge-grad)" strokeWidth="2" fill="none" />
                <path d="M 140 330 Q 300 310 440 320" stroke="url(#edge-grad)" strokeWidth="2" fill="none" strokeDasharray="4 4" />
              </svg>

              {/* Interactive Node Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full z-10">
                {filteredNodes.map((node) => {
                  const Icon = getNodeIcon(node.type);
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'border-[#DC586D] bg-[#DC586D]/15 shadow-md scale-[1.03]'
                          : 'border-[var(--border-soft)] bg-white/70 dark:bg-white/5 hover:border-[var(--border-strong)] hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[var(--color-rose)]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                          {node.type}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {node.label}
                      </span>
                      {node.status && <ClaimStatusBadge status={node.status} size="sm" />}
                      {node.sublabel && (
                        <span className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                          {node.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Accessible Table View */
            <div className="w-full overflow-y-auto max-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-[var(--text-muted)] font-semibold">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Label</th>
                    <th className="py-2.5 px-3">Reference / Sublabel</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {filteredNodes.map((node) => (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="py-2.5 px-3 uppercase font-mono text-[10px]">{node.type}</td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">{node.label}</td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)] font-mono">{node.sublabel || '-'}</td>
                      <td className="py-2.5 px-3">
                        {node.status ? <ClaimStatusBadge status={node.status} size="sm" /> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Node Inspector Panel */}
        <div className="rounded-2xl border border-[var(--border-soft)] glass-panel p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-soft)]">
            <Network className="w-4 h-4 text-[#DC586D]" />
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Node Inspector
            </h4>
          </div>

          {selectedNode ? (
            <div className="flex flex-col gap-4 text-xs animate-fadeIn">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Node ID</span>
                <p className="font-mono text-[var(--text-primary)] mt-0.5">{selectedNode.id}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Category</span>
                <p className="font-semibold text-[var(--color-rose)] uppercase mt-0.5">{selectedNode.type}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Title / Symbol</span>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{selectedNode.label}</p>
              </div>

              {selectedNode.sublabel && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Source Anchor</span>
                  <p className="font-mono text-[var(--text-secondary)] mt-0.5 break-all p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-soft)]">
                    {selectedNode.sublabel}
                  </p>
                </div>
              )}

              {selectedNode.status && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                    Canonical Verdict
                  </span>
                  <ClaimStatusBadge status={selectedNode.status} />
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border-soft)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Connected Graph Edges</span>
                <div className="flex flex-col gap-1.5 mt-2">
                  {graph.edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((edge) => (
                      <div
                        key={edge.id}
                        className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] font-mono flex items-center justify-between"
                      >
                        <span className="text-[#DC586D]">{edge.relation}</span>
                        <span className="text-[var(--text-muted)]">
                          {edge.source === selectedNode.id ? edge.target : edge.source}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center text-[var(--text-muted)]">
              <Layers className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs">Select any node on the graph canvas to inspect its source anchor and edge citations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
