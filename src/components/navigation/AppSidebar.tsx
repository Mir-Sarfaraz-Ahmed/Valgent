import React from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Network, FileText, Map, FolderGit2, LogOut } from 'lucide-react';
import { ValgentLogo } from '../brand/ValgentLogo';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

interface AppSidebarProps {
  currentProjectId?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ currentProjectId }) => {
  const params = useParams<{ projectId?: string }>();
  const activeProjectId = currentProjectId || params.projectId || 'proj-valgent-demo';
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    {
      to: `/projects/${activeProjectId}/overview`,
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      to: `/projects`,
      label: 'Projects',
      icon: FolderGit2,
    },
    {
      to: `/projects/${activeProjectId}/evidence`,
      label: 'Evidence graph',
      icon: Network,
    },
    {
      to: `/projects/${activeProjectId}/reports`,
      label: 'Reports',
      icon: FileText,
    },
    {
      to: `/projects/${activeProjectId}/roadmap`,
      label: 'Roadmap',
      icon: Map,
    },
  ];

  return (
    <aside className="w-64 min-h-screen flex flex-col justify-between p-5 border-r border-[var(--border-soft)] glass-panel rounded-none border-t-0 border-b-0 border-l-0 z-20">
      {/* Top Branding & Navigation */}
      <div className="flex flex-col gap-6">
        <div className="px-2 pt-1">
          <ValgentLogo size="md" to="/projects" />
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#A33757] to-[#DC586D] text-white shadow-sm font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60 dark:hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Night Mode Button & Authenticated User Record */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-soft)]">
        {/* Night Mode Button */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[var(--text-muted)]">Theme</span>
          <ThemeToggle showLabel={true} />
        </div>

        {/* Authenticated Account Identity */}
        {user && (
          <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-black/5 dark:bg-white/5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#DC586D] to-[#FFBB94] text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {user.fullName ? user.fullName[0] : 'U'}
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {user.fullName || 'User'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] truncate">
                  {user.email || 'user@valgent.ai'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-[var(--text-muted)] hover:text-[#DC586D] transition-colors rounded-lg hover:bg-white/40 dark:hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
