import React, { useState, useMemo } from 'react';
import {
  Network,
  Search,
  List,
  Layers,
  ShieldCheck,
  Database,
  Code,
  Terminal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid
} from 'lucide-react';
import { EvidenceGraphData, GraphNode } from '../../types/report';
import { ClaimStatusBadge } from '../claims/ClaimStatusBadge';

interface EvidenceGraphProps {
  graph: EvidenceGraphData;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({ graph }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'canvas' | 'cards' | 'table'>('canvas');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const filteredNodes = useMemo(() => {
    return graph.nodes.filter((node) => {
      const matchesType = filterType === 'all' || node.type === filterType;
      const matchesSearch =
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.sublabel && node.sublabel.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [graph.nodes, filterType, searchQuery]);

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

  // Connected edges for the selected node (handling both source/target and from/to)
  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return graph.edges.filter((e) => {
      const src = e.source || (e as any).from;
      const tgt = e.target || (e as any).to;
      return src === selectedNode.id || tgt === selectedNode.id;
    });
  }, [graph.edges, selectedNode]);

  // Deterministic 4-column layout for SVG canvas
  const nodePositions = useMemo(() => {
    const colTypes: Record<string, number> = {
      claim: 0,
      requirement: 0,
      route: 1,
      database: 1,
      symbol: 2,
      ast: 2,
      execution: 3,
      test: 3
    };

    const columns: GraphNode[][] = [[], [], [], []];
    filteredNodes.forEach((node) => {
      const colIdx = colTypes[node.type] ?? 2;
      columns[colIdx].push(node);
    });

    const positions: Record<string, { x: number; y: number }> = {};
    const colX = [120, 360, 620, 860];

    columns.forEach((colNodes, colIdx) => {
      const count = colNodes.length;
      const spacing = Math.max(80, 480 / Math.max(count + 1, 2));
      const startY = Math.max(50, (540 - count * spacing) / 2);

      colNodes.forEach((node, idx) => {
        positions[node.id] = {
          x: colX[colIdx],
          y: startY + idx * spacing
        };
      });
    });

    return positions;
  }, [filteredNodes]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, z + 0.15));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, z - 0.15));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

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
            {['all', 'claim', 'symbol', 'route', 'execution'].map((type) => {
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-soft)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Switch: Canvas vs Cards vs Table */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] self-end sm:self-auto">
          <button
            onClick={() => setViewMode('canvas')}
            className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'canvas'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm font-semibold border border-[var(--border-soft)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Topological</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'cards'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm font-semibold border border-[var(--border-soft)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm font-semibold border border-[var(--border-soft)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Data Table</span>
          </button>
        </div>
      </div>

      {/* Main Graph Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols on large screen): Nodes Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* VIEW MODE 1: Interactive SVG Topological Canvas */}
          {viewMode === 'canvas' && (
            <div className="ui-card p-4 sm:p-5 flex flex-col gap-3 min-h-[480px] relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border-soft)]">
                <span>Deterministic AST Topology: Claims → Route Handlers → Symbols → Execution</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleZoomIn}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)]"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)]"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)]"
                    title="Reset view"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[var(--color-dusty-rose)] ml-2">
                    {filteredNodes.length} nodes
                  </span>
                </div>
              </div>

              {/* SVG Canvas */}
              <div className="w-full h-[460px] bg-black/[0.03] dark:bg-black/25 rounded-xl border border-[var(--border-soft)] relative overflow-hidden flex items-center justify-center">
                <svg
                  viewBox="0 0 1000 540"
                  className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out'
                  }}
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="rgba(200, 136, 168, 0.7)" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#CCD0CF" />
                    </marker>
                    <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4A5C6A" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#9BA8AB" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>

                  {/* Render Directional Edges */}
                  {graph.edges.map((e, idx) => {
                    const srcId = e.source || (e as any).from;
                    const tgtId = e.target || (e as any).to;
                    const srcPos = nodePositions[srcId];
                    const tgtPos = nodePositions[tgtId];
                    if (!srcPos || !tgtPos) return null;

                    const isConnected =
                      selectedNode && (selectedNode.id === srcId || selectedNode.id === tgtId);

                    const midX = (srcPos.x + tgtPos.x) / 2;
                    const d = `M ${srcPos.x} ${srcPos.y} C ${midX} ${srcPos.y}, ${midX} ${tgtPos.y}, ${tgtPos.x} ${tgtPos.y}`;

                    return (
                      <g key={e.id || `${srcId}-${tgtId}-${idx}`}>
                        <path
                          d={d}
                          fill="none"
                          stroke={isConnected ? '#CCD0CF' : 'url(#edge-grad)'}
                          strokeWidth={isConnected ? 2.5 : 1.5}
                          strokeDasharray={e.relation === 'EXTRACTS_CLAIM' ? '4 3' : undefined}
                          markerEnd={isConnected ? 'url(#arrow-active)' : 'url(#arrow)'}
                          className="transition-all duration-300"
                        />
                      </g>
                    );
                  })}

                  {/* Render Nodes */}
                  {filteredNodes.map((node) => {
                    const pos = nodePositions[node.id];
                    if (!pos) return null;
                    const isSelected = selectedNode?.id === node.id;

                    const isVerified = node.status === 'VERIFIED';
                    const isNotVerified = node.status === 'NOT_VERIFIED';
                    const isPartial = node.status === 'PARTIALLY_VERIFIED';

                    const strokeColor = isSelected
                      ? '#CCD0CF'
                      : isVerified
                      ? '#10b981'
                      : isNotVerified
                      ? '#f43f5e'
                      : isPartial
                      ? '#f59e0b'
                      : '#4A5C6A';

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer group"
                      >
                        {/* Glow ring on selection */}
                        {isSelected && (
                          <circle
                            r="28"
                            fill="none"
                            stroke="#9BA8AB"
                            strokeWidth="3"
                            strokeDasharray="4 3"
                            className="animate-spin"
                            style={{ animationDuration: '6s' }}
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          r="20"
                          fill="#11212D"
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 3 : 2}
                          className="transition-transform group-hover:scale-110"
                        />

                        {/* Node Type Abbr or Icon inside circle */}
                        <text
                          textAnchor="middle"
                          dy="4"
                          fill="#CCD0CF"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {node.type.substring(0, 3).toUpperCase()}
                        </text>

                        {/* Label Pill */}
                        <g transform="translate(0, 32)">
                          <rect
                            x={-Math.min(75, Math.max(30, node.label.length * 3.5))}
                            y="-9"
                            width={Math.min(150, Math.max(60, node.label.length * 7))}
                            height="18"
                            rx="5"
                            fill="rgba(6, 20, 27, 0.85)"
                            stroke={strokeColor}
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            dy="3"
                            fill="#CCD0CF"
                            fontSize="10"
                            fontWeight="600"
                          >
                            {node.label.length > 20 ? node.label.substring(0, 18) + '…' : node.label}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Card Grid View */}
          {viewMode === 'cards' && (
            <div className="ui-card p-5 sm:p-6 flex flex-col gap-4 min-h-[420px]">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border-soft)]">
                <span>Select any node to inspect deterministic AST relationships & source code</span>
                <span className="font-mono text-[var(--color-dusty-rose)]">{filteredNodes.length} nodes</span>
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
                          ? 'border-[var(--color-dusty-rose)] bg-[var(--color-merlot)]/25 shadow-sm'
                          : 'border-[var(--border-soft)] bg-[var(--surface-card-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[var(--color-merlot)]/20 text-[var(--color-dusty-rose)] border border-[var(--border-soft)]">
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
                        <span className="text-[var(--color-dusty-rose)]">Inspect →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: Accessible Data Table Alternative */}
          {viewMode === 'table' && (
            <div className="ui-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-black/[0.04] dark:bg-white/[0.02] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
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
                          selectedNode?.id === node.id ? 'bg-[var(--color-merlot)]/25' : ''
                        }`}
                      >
                        <td className="p-3 font-semibold uppercase text-[10px] text-[var(--color-dusty-rose)]">
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
                    <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)]">
                      {selectedNode.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] border border-[var(--border-soft)]">
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
                      {connectedEdges.map((e) => {
                        const src = e.source || (e as any).from;
                        const tgt = e.target || (e as any).to;
                        const rel = e.relation || (e as any).type || 'CONNECTS_TO';
                        const otherNode = src === selectedNode.id ? tgt : src;

                        return (
                          <div
                            key={e.id || `${src}-${tgt}`}
                            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-xs flex items-center justify-between"
                          >
                            <span className="font-mono text-[11px] text-[var(--text-secondary)] truncate max-w-[150px]">
                              {otherNode}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--color-mauve)] uppercase">
                              {rel}
                            </span>
                          </div>
                        );
                      })}
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
                <Network className="w-8 h-8 opacity-40 text-[var(--color-mauve)]" />
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
