import React from 'react';
import { X, FileCode, ShieldCheck } from 'lucide-react';
import { EvidenceReference } from '../../types/report';

interface EvidenceDetailsModalProps {
  evidence: EvidenceReference | null;
  onClose: () => void;
}

export const EvidenceDetailsModal: React.FC<EvidenceDetailsModalProps> = ({ evidence, onClose }) => {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl ui-card-elevated p-6 overflow-hidden flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-rose)]/15 text-[var(--color-rose)]">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Evidence Details
              </h3>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {evidence.evidence_id} • {evidence.classification}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 py-2">
          {/* File location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              File Location & Line Range
            </label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] font-mono text-xs">
              <span className="text-[var(--text-primary)] truncate">{evidence.path}</span>
              {evidence.line_start && (
                <span className="text-[var(--color-rose)] font-semibold flex-shrink-0 ml-2">
                  Lines {evidence.line_start} - {evidence.line_end || evidence.line_start}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Verification Finding
            </label>
            <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)]">
              {evidence.description}
            </p>
          </div>

          {/* Code Snippet */}
          {evidence.snippet && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Extracted AST Snippet / Telemetry
              </label>
              <pre className="p-3.5 rounded-xl bg-[#170B16] text-[#FDE8ED] font-mono text-xs overflow-x-auto border border-[#FB9590]/20 leading-relaxed max-h-48">
                <code>{evidence.snippet}</code>
              </pre>
            </div>
          )}

          {/* Source classification */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-[#107E5A]" />
            <span>Deterministic source extractor: {evidence.source}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[var(--border-soft)]">
          <button onClick={onClose} className="btn-secondary text-xs sm:text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
