import React, { useState } from 'react';
import { Network, Search, List, Layers, ShieldCheck, Database, Code, Terminal } from 'lucide-react';
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
      case 'execution':
        return Terminal;
      default:
        return Code;
    }
  };

  // Connected edges for the selected node
  const connectedEdges = selectedNode
    ? graph.edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
    : [];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Controls Bar: Search, Category Filter, Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl ui-card">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ui-input pl-9 py-1.5 text-xs"
            />
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            {['all', 'claim', 'symbol', 'route', 'execution'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-all ${
                  filterType === type
                    ? 'bg-[var(--color-wine)] text-white dark:bg-[var(--color-rose)] shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Switch */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'visual'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm font-semibold'
                : 'text-[var(--text-muted)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm font-semibold'
                : 'text-[var(--text-muted)]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List Table</span>
          </button>
        </div>
      </div>

      {/* Main Graph Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols on large screen): Nodes Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {viewMode === 'visual' ? (
            <div className="ui-card p-5 sm:p-6 flex flex-col gap-4 min-h-[420px]">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border-soft)]">
                <span>Select any node to inspect deterministic AST relationships & source code</span>
                <span className="font-mono">{filteredNodes.length} nodes</span>
              </div>

              {/* Node Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredNodes.map((node) => {
                  const Icon = getNodeIcon(node.type);
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'border-[var(--color-rose)] bg-[var(--color-rose)]/10 shadow-sm'
                          : 'border-[var(--border-soft)] bg-[var(--surface-card-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[var(--color-rose)]">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[150px]">
                            {node.label}
                          </span>
                        </div>
                        {node.status && <ClaimStatusBadge status={node.status} size="sm" />}
                      </div>

                      {node.sublabel && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                          {node.sublabel}
                        </span>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[10px] uppercase font-semibold text-[var(--text-muted)]">
                        <span>{node.type}</span>
                        <span className="text-[var(--color-rose)]">Inspect →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Accessible Table Alternative */
            <div className="ui-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-black/[0.02] dark:bg-white/[0.02] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      <th className="p-3">Type</th>
                      <th className="p-3">Label</th>
                      <th className="p-3">Source / Sublabel</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {filteredNodes.map((node) => (
                      <tr
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer ${
                          selectedNode?.id === node.id ? 'bg-[var(--color-rose)]/10' : ''
                        }`}
                      >
                        <td className="p-3 font-semibold uppercase text-[10px] text-[var(--color-rose)]">
                          {node.type}
                        </td>
                        <td className="p-3 font-medium text-[var(--text-primary)]">
                          {node.label}
                        </td>
                        <td className="p-3 font-mono text-[var(--text-muted)] truncate max-w-xs">
                          {node.sublabel || '—'}
                        </td>
                        <td className="p-3">
                          {node.status ? <ClaimStatusBadge status={node.status} size="sm" /> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Node Inspector Panel */}
        <div className="lg:col-span-1">
          <div className="ui-card p-5 sm:p-6 flex flex-col gap-4 sticky top-20">
            <h3 className="text-sm font-bold font-heading text-[var(--text-primary)] pb-2 border-b border-[var(--border-soft)]">
              Node Inspector
            </h3>

            {selectedNode ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Node ID & Classification
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[var(--color-rose)]">
                      {selectedNode.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
                      {selectedNode.type}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Label
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedNode.label}
                  </span>
                </div>

                {selectedNode.sublabel && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Location / Reference
                    </span>
                    <span className="text-xs font-mono p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-[var(--text-secondary)] break-all">
                      {selectedNode.sublabel}
                    </span>
                  </div>
                )}

                {selectedNode.status && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Validation Status
                    </span>
                    <div>
                      <ClaimStatusBadge status={selectedNode.status} />
                    </div>
                  </div>
                )}

                {/* Connected Edges */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-soft)]">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Connected Relationships ({connectedEdges.length})
                  </span>
                  {connectedEdges.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {connectedEdges.map((e) => (
                        <div
                          key={e.id}
                          className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-xs flex items-center justify-between"
                        >
                          <span className="font-mono text-[11px] text-[var(--text-muted)]">
                            {e.source === selectedNode.id ? e.target : e.source}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--color-rose)] uppercase">
                            {e.relation}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)] italic">
                      No direct graph edges recorded
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                <Network className="w-8 h-8 opacity-40 text-[var(--color-rose)]" />
                <p className="text-xs leading-relaxed max-w-[200px]">
                  Click on any node in the canvas or table to inspect AST evidence links.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
