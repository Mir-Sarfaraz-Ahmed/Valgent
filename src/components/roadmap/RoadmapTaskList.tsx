import React from 'react';
import { AlertCircle, CheckCircle, Clock, ShieldAlert, ArrowRight, Check } from 'lucide-react';
import { RoadmapTask } from '../../types/report';

interface RoadmapTaskListProps {
  tasks: RoadmapTask[];
  onToggleStatus?: (taskId: string) => void;
}

export const RoadmapTaskList: React.FC<RoadmapTaskListProps> = ({ tasks, onToggleStatus }) => {
  const priorityColors = {
    HIGH: 'bg-[#C52243]/15 text-[#C52243] border-[#C52243]/30',
    MEDIUM: 'bg-[#B45309]/15 text-[#B45309] border-[#B45309]/30',
    LOW: 'bg-[#107E5A]/15 text-[#107E5A] border-[#107E5A]/30',
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {tasks.map((task, idx) => (
        <div
          key={task.id}
          className="rounded-2xl border border-[var(--border-soft)] glass-panel p-5 flex flex-col gap-3.5 transition-all hover:border-[var(--border-strong)]"
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 text-[var(--color-rose)] mt-0.5">
                {idx + 1}
              </span>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  {task.title}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  {task.problem}
                </p>
              </div>
            </div>

            {/* Priority Badge */}
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${
                priorityColors[task.priority] || priorityColors.MEDIUM
              }`}
            >
              {task.priority} Priority
            </span>
          </div>

          {/* Recommended Actions */}
          {task.recommended_actions && task.recommended_actions.length > 0 && (
            <div className="flex flex-col gap-1.5 pl-9">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Recommended Actions
              </span>
              <ul className="flex flex-col gap-1 text-xs text-[var(--text-primary)]">
                {task.recommended_actions.map((act, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-[var(--color-rose)] flex-shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Objective Acceptance Criteria */}
          {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
            <div className="flex flex-col gap-1.5 pl-9 pt-2 border-t border-[var(--border-soft)]">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Objective Acceptance Criteria
              </span>
              <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                {task.acceptance_criteria.map((crit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#107E5A] flex-shrink-0" />
                    <span>{crit}</span>
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
