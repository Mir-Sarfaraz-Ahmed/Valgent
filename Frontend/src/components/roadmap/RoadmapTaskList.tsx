import React from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import { RoadmapTask } from '../../types/report';

interface RoadmapTaskListProps {
  tasks: RoadmapTask[];
  onToggleStatus?: (taskId: string) => void;
}

export const RoadmapTaskList: React.FC<RoadmapTaskListProps> = ({ tasks, onToggleStatus: _onToggleStatus }) => {
  const priorityBadges = {
    HIGH: 'bg-[#C52243]/15 text-[#C52243] border-[#C52243]/30',
    MEDIUM: 'bg-[#B45309]/15 text-[#B45309] border-[#B45309]/30',
    LOW: 'bg-[#107E5A]/15 text-[#107E5A] border-[#107E5A]/30',
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {tasks.map((task, idx) => (
        <div
          key={task.id}
          className="dashboard-card flex flex-col gap-5 transition-all hover:border-[var(--border-strong)]"
        >
          {/* Header Row: Index, Title, Priority */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <span className="w-7 h-7 rounded-lg bg-[var(--color-rose)]/10 border border-[var(--color-rose)]/20 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 text-[var(--color-rose)] mt-0.5">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-[var(--text-muted)]">
                    {task.id}
                  </span>
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
              className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider flex-shrink-0 ${
                priorityBadges[task.priority] || priorityBadges.MEDIUM
              }`}
            >
              {task.priority} Priority
            </span>
          </div>

          {/* Problem / Description Box */}
          <div className="p-4 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#C52243] flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Deficiency / Root Cause
              </span>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {task.problem}
              </p>
            </div>
          </div>

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
                    <ArrowRight className="w-4 h-4 text-[var(--color-rose)] flex-shrink-0 mt-0.5" />
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
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#107E5A]/5 border border-[#107E5A]/20 text-xs text-[var(--text-secondary)]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#107E5A] flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{crit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
