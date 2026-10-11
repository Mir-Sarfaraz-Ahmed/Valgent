import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, GitBranch, RefreshCw, GitCommit } from 'lucide-react';
import { Project } from '../../types/project';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

interface WorkspaceHeaderProps {
  project: Project;
  onRecheck?: () => void;
  isRechecking?: boolean;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  project,
  onRecheck,
  isRechecking = false,
}) => {
  const { user } = useAuth();

  return (
    <header className="w-full px-8 py-4 border-b border-[var(--border-soft)] flex items-center justify-between glass-panel rounded-none border-t-0 border-l-0 border-r-0">
      {/* Left: Breadcrumbs & Repository Details */}
      <div className="flex items-center gap-3">
        <Link
          to="/projects"
          className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {project.name}
        </span>

        {/* Branch / Commit badges */}
        <div className="hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-[var(--border-soft)]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
            <GitBranch className="w-3.5 h-3.5 text-[#DC586D]" />
            {project.branch}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono text-[var(--text-muted)] bg-black/5 dark:bg-white/5">
            <GitCommit className="w-3 h-3 text-[#FFBB94]" />
            {project.commitSha}
          </span>
        </div>
      </div>

      {/* Right: Actions, Night Mode Button, Profile */}
      <div className="flex items-center gap-3">
        {onRecheck && (
          <button
            onClick={onRecheck}
            disabled={isRechecking}
            className="btn-secondary text-xs px-3 py-1.5"
            title="Recheck against repository head"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
            <span>{isRechecking ? 'Rechecking...' : 'Recheck'}</span>
          </button>
        )}

        {/* Night Mode Button */}
        <ThemeToggle showLabel={false} />

        {/* Profile Avatar */}
        {user && (
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#DC586D] to-[#FFBB94] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
            title={user.fullName || user.email}
          >
            {user.fullName ? user.fullName[0] : 'U'}
          </div>
        )}
      </div>
    </header>
  );
};
