import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, ExternalLink, Info } from 'lucide-react';
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

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full overflow-hidden rounded-2xl border border-[var(--border-soft)] glass-panel">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-soft)] bg-black/5 dark:bg-white/5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <th className="py-3.5 px-4">Claim</th>
              <th className="py-3.5 px-4">Evidence Citations</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)] text-sm">
            {claims.map((claim) => {
              const isExpanded = expandedClaimId === claim.claim_id;
              return (
                <React.Fragment key={claim.claim_id}>
                  <tr
                    onClick={() => toggleExpand(claim.claim_id)}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* Claim text */}
                    <td className="py-4 px-4 font-medium text-[var(--text-primary)] max-w-md">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono text-[var(--color-rose)] flex-shrink-0 mt-0.5">
                          {claim.claim_id}
                        </span>
                        <span>{claim.text}</span>
                      </div>
                    </td>

                    {/* Evidence citations */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {claim.evidence_items && claim.evidence_items.length > 0 ? (
                          claim.evidence_items.map((evd) => (
                            <button
                              key={evd.evidence_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvidence(evd);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-black/5 dark:bg-white/5 hover:bg-[#DC586D]/15 hover:text-[#DC586D] border border-[var(--border-soft)] transition-colors"
                              title={evd.description}
                            >
                              <FileCode className="w-3 h-3 text-[#DC586D]" />
                              <span className="truncate max-w-[150px]">{evd.path}</span>
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] italic">
                            No matching files
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-4 text-center">
                      <ClaimStatusBadge status={claim.status} size="sm" />
                    </td>

                    {/* Toggle expand */}
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        className="p-1 rounded-lg text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-[var(--border-soft)]">
                      <td colSpan={4} className="p-4 pl-10">
                        <div className="flex flex-col gap-3 rounded-xl p-4 bg-white/50 dark:bg-black/30 border border-[var(--border-soft)]">
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                              Verification Verdict & Rationale
                            </span>
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                              {claim.reason}
                            </p>
                          </div>

                          {/* Limitations or Contradictions */}
                          {claim.contradictions && claim.contradictions.length > 0 && (
                            <div className="p-3 rounded-lg bg-[#C52243]/10 border border-[#C52243]/30 text-xs text-[#C52243]">
                              <span className="font-semibold block mb-0.5">Contradiction Found:</span>
                              {claim.contradictions.join(', ')}
                            </div>
                          )}

                          {claim.limitations && claim.limitations.length > 0 && (
                            <div className="p-3 rounded-lg bg-[#B45309]/10 border border-[#B45309]/30 text-xs text-[#B45309]">
                              <span className="font-semibold block mb-0.5">Known Verification Limitation:</span>
                              {claim.limitations.join(', ')}
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

      {/* Modal when an evidence citation is clicked */}
      <EvidenceDetailsModal
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
};
