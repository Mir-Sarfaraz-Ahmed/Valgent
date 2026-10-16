import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { ClaimValidation, EvidenceReference } from '../../types/report';
import { ClaimStatusBadge } from './ClaimStatusBadge';
import { EvidenceDetailsModal } from '../evidence/EvidenceDetailsModal';

interface ClaimTableProps {
  claims: ClaimValidation[];
}

export const ClaimTable: React.FC<ClaimTableProps> = ({ claims }) => {
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceReference | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedClaimId(expandedClaimId === id ? null : id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand(id);
    }
  };

  if (!claims || claims.length === 0) {
    return (
      <div className="ui-card p-8 text-center flex flex-col items-center justify-center gap-3">
        <HelpCircle className="w-8 h-8 text-[var(--text-muted)] opacity-60" />
        <h4 className="text-base font-bold font-heading text-[var(--text-primary)]">
          No Verification Claims Available
        </h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-md">
          Run an analysis on the target repository to extract and audit assertions against code AST.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Desktop & Tablet View: Generous, Spacious Audit Table */}
      <div className="hidden md:block w-full overflow-hidden ui-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-black/[0.04] dark:bg-white/[0.02] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="py-4 px-6 w-[120px]">Claim ID</th>
                <th className="py-4 px-6 min-w-[260px]">Claim Statement</th>
                <th className="py-4 px-6 w-[220px]">Evidence Citations</th>
                <th className="py-4 px-6 w-[160px] text-center">Status</th>
                <th className="py-4 px-6 w-[80px] text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)] text-sm">
              {claims.map((claim) => {
                const isExpanded = expandedClaimId === claim.claim_id;
                return (
                  <React.Fragment key={claim.claim_id}>
                    <tr
                      onClick={() => toggleExpand(claim.claim_id)}
                      onKeyDown={(e) => handleKeyDown(e, claim.claim_id)}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isExpanded}
                      aria-label={`Claim ${claim.claim_id}: ${claim.text}`}
                      className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[var(--color-mauve)] ${
                        isExpanded ? 'bg-black/[0.015] dark:bg-white/[0.015]' : ''
                      }`}
                    >
                      {/* Column 1: Claim ID */}
                      <td className="py-4.5 px-6 align-top">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-[var(--color-dusty-rose)] bg-[var(--color-merlot)]/20 border border-[var(--color-mauve)]/30">
                          {claim.claim_id}
                        </span>
                      </td>

                      {/* Column 2: Claim Statement */}
                      <td className="py-4.5 px-6 align-top">
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                          {claim.text}
                        </p>
                      </td>

                      {/* Column 3: Evidence */}
                      <td className="py-4.5 px-6 align-top">
                        <div className="flex flex-wrap gap-2">
                          {claim.evidence_items && claim.evidence_items.length > 0 ? (
                            claim.evidence_items.map((evd) => (
                              <button
                                key={evd.evidence_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvidence(evd);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-black/5 dark:bg-white/5 hover:bg-[var(--color-merlot)]/25 hover:text-[var(--color-pale-blush)] border border-[var(--border-soft)] transition-colors group/btn"
                                title={evd.description}
                              >
                                <FileCode className="w-3.5 h-3.5 text-[var(--color-mauve)] flex-shrink-0" />
                                <span className="truncate max-w-[140px]">{evd.path}</span>
                                {evd.line_start && (
                                  <span className="text-[10px] text-[var(--color-dusty-rose)] opacity-80">
                                    :L{evd.line_start}
                                  </span>
                                )}
                                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover/btn:text-[var(--color-pale-blush)] opacity-70" />
                              </button>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] italic">
                              No source citations
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Status */}
                      <td className="py-4.5 px-6 align-top text-center">
                        <ClaimStatusBadge status={claim.status} size="md" />
                      </td>

                      {/* Column 5: Details Toggle */}
                      <td className="py-4.5 px-6 align-top text-right">
                        <span className="p-1.5 rounded-lg text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors inline-flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[var(--color-mauve)]" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <tr className="bg-black/[0.015] dark:bg-white/[0.015]">
                        <td colSpan={5} className="p-6">
                          <div className="flex flex-col gap-4 rounded-xl p-5 bg-[var(--surface-card-subtle)] border border-[var(--border-soft)]">
                            {/* Analysis Finding Reason */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                Verification Finding & Explanation
                              </span>
                              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                                {claim.reason}
                              </p>
                            </div>

                            {/* Build / Test Telemetry Outcomes */}
                            {(claim.build_outcome || claim.test_outcome) && (
                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                {claim.build_outcome && (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-xs font-mono text-[var(--text-secondary)]">
                                    <Terminal className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                                    <span>{claim.build_outcome}</span>
                                  </div>
                                )}
                                {claim.test_outcome && (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-xs font-mono text-[var(--text-secondary)]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-verified)]" />
                                    <span>{claim.test_outcome}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Contradictions */}
                            {claim.contradictions && claim.contradictions.length > 0 && (
                              <div className="p-4 rounded-xl bg-[var(--status-not-verified-bg)] border border-[var(--status-not-verified-border)] flex items-start gap-3 text-xs sm:text-sm text-[var(--status-not-verified)]">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold">Contradiction Detected:</span>
                                  <span className="leading-relaxed">{claim.contradictions.join(' ')}</span>
                                </div>
                              </div>
                            )}

                            {/* Limitations */}
                            {claim.limitations && claim.limitations.length > 0 && (
                              <div className="p-4 rounded-xl bg-[var(--status-partial-bg)] border border-[var(--status-partial-border)] flex items-start gap-3 text-xs sm:text-sm text-[var(--status-partial)]">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold">Execution Limitation:</span>
                                  <span className="leading-relaxed">{claim.limitations.join(' ')}</span>
                                </div>
                              </div>
                            )}

                            {/* Recommended Actions */}
                            {claim.recommended_actions && claim.recommended_actions.length > 0 && (
                              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-soft)]">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                  Recommended Actions
                                </span>
                                <div className="flex flex-col gap-1.5">
                                  {claim.recommended_actions.map((act, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2 text-xs text-[var(--text-primary)]"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-mauve)] flex-shrink-0 mt-0.5" />
                                      <span>{act}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Evidence Citations Detail */}
                            {claim.evidence_items && claim.evidence_items.length > 0 && (
                              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-soft)]">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                  Cited Source Proofs ({claim.evidence_items.length})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {claim.evidence_items.map((evd) => (
                                    <div
                                      key={evd.evidence_id}
                                      onClick={() => setSelectedEvidence(evd)}
                                      className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-soft)] hover:border-[var(--color-dusty-rose)] transition-colors cursor-pointer flex flex-col gap-1"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-mono font-bold text-[var(--color-dusty-rose)]">
                                          {evd.path}
                                          {evd.line_start && `:${evd.line_start}`}
                                          {evd.line_end && evd.line_end !== evd.line_start && `-${evd.line_end}`}
                                        </span>
                                        <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">
                                          {evd.source}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                                        {evd.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View: Clean Stacked Cards */}
      <div className="md:hidden flex flex-col gap-4">
        {claims.map((claim) => {
          const isExpanded = expandedClaimId === claim.claim_id;
          return (
            <div
              key={claim.claim_id}
              onClick={() => toggleExpand(claim.claim_id)}
              className="dashboard-card flex flex-col gap-3.5 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold text-[var(--color-dusty-rose)] bg-[var(--color-merlot)]/20 border border-[var(--color-mauve)]/30">
                  {claim.claim_id}
                </span>
                <ClaimStatusBadge status={claim.status} size="sm" />
              </div>

              <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                {claim.text}
              </p>

              {/* Citations Preview */}
              {claim.evidence_items && claim.evidence_items.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {claim.evidence_items.map((evd) => (
                    <button
                      key={evd.evidence_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvidence(evd);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-[var(--text-secondary)]"
                    >
                      <FileCode className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                      <span className="truncate max-w-[140px]">{evd.path}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Mobile Expanded Drawer */}
              {isExpanded && (
                <div className="pt-3 border-t border-[var(--border-soft)] flex flex-col gap-3">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Verification Finding
                  </span>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {claim.reason}
                  </p>
                  {(claim.build_outcome || claim.test_outcome) && (
                    <div className="text-xs font-mono text-[var(--color-dusty-rose)]">
                      {claim.build_outcome && <div>{claim.build_outcome}</div>}
                      {claim.test_outcome && <div>{claim.test_outcome}</div>}
                    </div>
                  )}
                  {claim.contradictions && claim.contradictions.length > 0 && (
                    <div className="p-3 rounded-lg bg-[var(--status-not-verified-bg)] text-xs text-[var(--status-not-verified)] leading-relaxed border border-[var(--status-not-verified-border)]">
                      {claim.contradictions.join(' ')}
                    </div>
                  )}
                  {claim.limitations && claim.limitations.length > 0 && (
                    <div className="p-3 rounded-lg bg-[var(--status-partial-bg)] text-xs text-[var(--status-partial)] leading-relaxed border border-[var(--status-partial-border)]">
                      {claim.limitations.join(' ')}
                    </div>
                  )}
                  {claim.recommended_actions && claim.recommended_actions.length > 0 && (
                    <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 text-xs text-[var(--text-primary)] leading-relaxed border border-[var(--border-soft)]">
                      <span className="font-bold">Recommended: </span>
                      {claim.recommended_actions.join('; ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for Detailed AST Inspection */}
      <EvidenceDetailsModal
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
};
