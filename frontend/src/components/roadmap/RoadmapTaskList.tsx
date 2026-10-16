import React from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import { RoadmapTask } from '../../types/report';

interface RoadmapTaskListProps {
  tasks: RoadmapTask[];
  onToggleStatus?: (taskId: string) => void;
}

export const RoadmapTaskList: React.FC<RoadmapTaskListProps> = ({ tasks }) => {
  const priorityBadges: Record<string, string> = {
    HIGH: 'bg-[var(--status-not-verified-bg)] text-[var(--status-not-verified)] border-[var(--status-not-verified-border)]',
    MEDIUM: 'bg-[var(--status-partial-bg)] text-[var(--status-partial)] border-[var(--status-partial-border)]',
    LOW: 'bg-[var(--status-verified-bg)] text-[var(--status-verified)] border-[var(--status-verified-border)]',
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="ui-card p-8 text-center flex flex-col items-center justify-center gap-3">
        <CheckCircle2 className="w-8 h-8 text-[var(--status-verified)] opacity-80" />
        <h4 className="text-base font-bold font-heading text-[var(--text-primary)]">
          No Remediation Tasks Outstanding
        </h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-md">
          All verified claims have satisfied AST implementation evidence and runtime telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {tasks.map((task, idx) => {
        const priorityKey = (task.priority || 'MEDIUM').toUpperCase();
        const badgeClass = priorityBadges[priorityKey] || priorityBadges.MEDIUM;

        return (
          <div
            key={task.id || task.task_id || idx}
            className="dashboard-card flex flex-col gap-5 transition-all hover:border-[var(--border-strong)]"
          >
            {/* Header Row: Index, Title, Priority */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-lg bg-[var(--color-merlot)]/25 border border-[var(--color-mauve)]/30 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 text-[var(--color-dusty-rose)] mt-0.5">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-[var(--text-muted)]">
                      {task.id || task.task_id}
                    </span>
                    {task.claim_id && (
                      <>
                        <span className="text-xs text-[var(--text-muted)]">•</span>
                        <span className="text-xs font-mono text-[var(--color-dusty-rose)] bg-[var(--color-merlot)]/20 px-2 py-0.5 rounded">
                          Claim: {task.claim_id}
                        </span>
                      </>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">•</span>
                    <span className="text-xs text-[var(--text-muted)]">Category: Remediation</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold font-heading text-[var(--text-primary)]">
                    {task.title}
                  </h4>
                </div>
              </div>

              {/* Priority Badge */}
              <span
                className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider flex-shrink-0 ${badgeClass}`}
              >
                {priorityKey} Priority
              </span>
            </div>

            {/* Problem / Description Box */}
            <div className="p-4 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[var(--status-not-verified)] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Deficiency / Root Cause
                </span>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  {task.problem}
                </p>
              </div>
            </div>

            {/* Evidence References */}
            {task.evidence_refs && task.evidence_refs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-[var(--text-muted)]">Citing Evidence:</span>
                {task.evidence_refs.map((refId) => (
                  <span
                    key={refId}
                    className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-[var(--text-secondary)]"
                  >
                    <FileCode className="w-3 h-3 text-[var(--color-mauve)]" />
                    {refId}
                  </span>
                ))}
              </div>
            )}

            {/* Recommended Actions */}
            {task.recommended_actions && task.recommended_actions.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Recommended Actions
                </span>
                <div className="flex flex-col gap-2">
                  {task.recommended_actions.map((act, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border-soft)] text-sm text-[var(--text-primary)]"
                    >
                      <ArrowRight className="w-4 h-4 text-[var(--color-mauve)] flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objective Acceptance Criteria */}
            {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
              <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-soft)]">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Objective Acceptance Criteria
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {task.acceptance_criteria.map((crit, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--status-verified-bg)] border border-[var(--status-verified-border)] text-xs text-[var(--text-secondary)]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)] flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
