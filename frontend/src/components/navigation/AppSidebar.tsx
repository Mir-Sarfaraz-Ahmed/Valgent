import React from 'react';
import { Link, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  FileText,
  Map,
  FolderGit2,
  LogOut,
  X,
  Home,
  User,
  Pin,
  PinOff,
} from 'lucide-react';
import { ValgentLogo } from '../brand/ValgentLogo';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { uploadUserAvatar } from '../../lib/storage';

interface AppSidebarProps {
  currentProjectId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onToggleOpen?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentProjectId,
  isOpen = false,
  onClose,
}) => {
  const params = useParams<{ projectId?: string }>();
  const location = useLocation();
  const { user, signOut, updateAvatarUrl } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const navigate = useNavigate();

  // Resolve active project ID reliably without exclusions
  const getActiveProjectId = (): string | null => {
    if (currentProjectId) return currentProjectId;
    if (params.projectId) return params.projectId;

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('valgent-last-active-project-id');
      if (saved) return saved;

      try {
        const userStr = localStorage.getItem('valgent_user');
        const userId = userStr ? JSON.parse(userStr)?.id : null;
        const cacheKeys = [
          userId ? `valgent-server-projects-cache-${userId}` : null,
          'valgent-server-projects-cache',
          'valgent-projects',
        ].filter(Boolean) as string[];

        for (const key of cacheKeys) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0 && list[0]?.id) {
              return list[0].id;
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  };

  const activeProjectId = getActiveProjectId();

  // Desktop pin state
  const [isPinned, setIsPinned] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('valgent-sidebar-pinned') === 'true';
    }
    return false;
  });

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('valgent-sidebar-pinned', String(next));
      }
      return next;
    });
  };

  // Open strictly via button click in header or pin; NO hover opening/closing
  const isDesktopOpen = isPinned || isOpen;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      try {
        setIsUploadingAvatar(true);
        const { signedUrl } = await uploadUserAvatar({
          userId: user.id,
          file,
        });
        if (signedUrl) {
          updateAvatarUrl(signedUrl);
        }
      } catch (err) {
        console.warn('Failed to upload user avatar:', err);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/',
      label: 'Home',
      icon: Home,
      end: true,
      requiresProject: false,
      tab: '',
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/overview` : '/projects',
      label: 'Overview',
      icon: LayoutDashboard,
      end: true,
      requiresProject: true,
      tab: 'overview',
    },
    {
      to: '/projects',
      label: 'Projects',
      icon: FolderGit2,
      end: true,
      requiresProject: false,
      tab: '',
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/evidence` : '/projects',
      label: 'Evidence graph',
      icon: Network,
      end: true,
      requiresProject: true,
      tab: 'evidence',
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/reports` : '/projects',
      label: 'Reports',
      icon: FileText,
      end: true,
      requiresProject: true,
      tab: 'reports',
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/roadmap` : '/projects',
      label: 'Roadmap',
      icon: Map,
      end: true,
      requiresProject: true,
      tab: 'roadmap',
    },
    {
      to: '/profile',
      label: 'Profile',
      icon: User,
      end: true,
      requiresProject: false,
      tab: '',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-5 sm:p-6 overflow-y-auto">
      {/* Top Branding & Navigation */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1 pt-0.5">
          <ValgentLogo size="md" to="/" />
          <div className="flex items-center gap-1">
            {/* Desktop Pin / Unpin button */}
            <button
              onClick={togglePin}
              className="hidden lg:flex p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={
                isPinned
                  ? 'Unpin sidebar (collapse to header button)'
                  : 'Pin sidebar open'
              }
              aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {isPinned ? (
                <Pin className="w-4 h-4 text-[var(--color-mauve)] fill-current" />
              ) : (
                <PinOff className="w-4 h-4" />
              )}
            </button>

            {onClose && !isPinned && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Close sidebar"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links with Spacious Breathing Room */}
        <nav className="flex flex-col gap-2 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Explicit active matching prevents false highlights on /projects
            const isTabActive = item.requiresProject
              ? Boolean(
                  activeProjectId &&
                    location.pathname.startsWith(
                      `/projects/${activeProjectId}/${item.tab}`
                    )
                )
              : location.pathname === item.to;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                onClick={() => onClose?.()}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isTabActive
                    ? 'bg-gradient-to-r from-[var(--color-merlot)] to-[var(--color-mauve)] text-white font-semibold shadow-sm border border-[var(--color-mauve)]/40'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0 text-current" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Clean theme toggle and user account info */}
      <div className="flex flex-col gap-3.5 pt-5 border-t border-[var(--border-soft)]">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Theme
          </span>
          <ThemeToggle showLabel={true} />
        </div>

        {user && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] hover:border-[var(--color-mauve)]/40 transition-colors">
            <Link
              to="/profile"
              onClick={() => onClose?.()}
              className="flex items-center gap-3 overflow-hidden flex-1 group"
              title="Customize your profile"
            >
              <div className="relative group cursor-pointer flex-shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] flex items-center justify-center font-bold text-xs uppercase border border-[var(--border-soft)] group-hover:scale-105 transition-transform relative">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user.fullName ? user.fullName[0] : 'U'}</span>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-pale-blush)] truncate transition-colors">
                  {user.fullName || 'User'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  {user.role || user.email || 'user@valgent.ai'}
                </span>
              </div>
            </Link>

            <button
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Dock Spacer when pinned (Smoothly docks spacious sidebar) */}
      <div
        className={`hidden lg:block flex-shrink-0 transition-all duration-300 ease-in-out ${
          isPinned ? 'w-72 sm:w-80' : 'w-0'
        }`}
        aria-hidden="true"
      />

      {/* 2. Desktop Backdrop when open and unpinned (Click outside closes it) */}
      {isDesktopOpen && !isPinned && (
        <div
          className="hidden lg:block fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 3. Desktop Sidebar Panel (Floating if unpinned, docked if pinned) */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 w-72 sm:w-80 h-screen flex-col border-r border-[var(--border-soft)] bg-[var(--surface-sidebar)] z-50 transform transition-transform duration-300 ease-out ${
          isDesktopOpen
            ? 'translate-x-0 shadow-2xl shadow-black/60'
            : '-translate-x-full shadow-none pointer-events-none'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 4. Mobile Drawer Backdrop & Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-72 sm:w-80 max-w-[85vw] bg-[var(--surface-sidebar)] border-r border-[var(--border-soft)] z-50 lg:hidden transform transition-transform duration-200 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
