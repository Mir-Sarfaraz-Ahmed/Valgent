import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, GitBranch, RefreshCw, GitCommit, Menu } from 'lucide-react';
import { Project } from '../../types/project';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

interface WorkspaceHeaderProps {
  project: Project;
  onRecheck?: () => void;
  isRechecking?: boolean;
  onMenuToggle?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  project,
  onRecheck,
  isRechecking = false,
  onMenuToggle,
}) => {
  const { user } = useAuth();

  return (
    <header className="w-full px-6 sm:px-8 lg:px-10 h-16 border-b border-[var(--border-soft)] bg-[var(--surface-card)] flex items-center justify-between z-10">
      {/* Left: Mobile Menu Trigger & Breadcrumbs */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 overflow-hidden text-sm">
          <Link
            to="/projects"
            className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hidden sm:inline"
          >
            Projects
          </Link>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] hidden sm:inline flex-shrink-0" />
          <span className="font-bold text-[var(--text-primary)] truncate max-w-[140px] sm:max-w-[240px]">
            {project.name}
          </span>
        </div>

        {/* Branch / Commit badges */}
        <div className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-[var(--border-soft)] flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] border border-[var(--border-soft)]">
            <GitBranch className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
            {project.branch}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-[var(--text-muted)] bg-black/5 dark:bg-white/5 border border-[var(--border-soft)]">
            <GitCommit className="w-3 h-3 text-[var(--color-dusty-rose)]" />
            {project.commitSha}
          </span>
        </div>
      </div>

      {/* Right: Actions, Theme Toggle, Profile */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {onRecheck && (
          <button
            onClick={onRecheck}
            disabled={isRechecking}
            className="btn-secondary text-xs sm:text-sm px-3 py-1.5"
            title="Recheck against repository head"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin text-[var(--color-mauve)]' : ''}`} />
            <span className="hidden sm:inline">{isRechecking ? 'Rechecking...' : 'Recheck'}</span>
          </button>
        )}

        <ThemeToggle showLabel={false} />

        {user && (
          <div
            className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] flex items-center justify-center font-bold text-xs uppercase shadow-sm flex-shrink-0 border border-[var(--border-soft)]"
            title={user.fullName || user.email}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{user.fullName ? user.fullName[0] : 'U'}</span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
