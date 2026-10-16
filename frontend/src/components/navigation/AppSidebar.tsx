import React from 'react';
import { Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  FileText,
  Map,
  FolderGit2,
  LogOut,
  X,
  Home,
  ArrowUpRight,
  User,
  Pin,
  PinOff,
  PanelLeft,
  ChevronRight,
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
  const savedActiveId =
    typeof window !== 'undefined'
      ? localStorage.getItem('valgent-last-active-project-id')
      : null;
  const rawId =
    currentProjectId ||
    params.projectId ||
    (savedActiveId &&
    !['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(
      savedActiveId
    )
      ? savedActiveId
      : null);
  const activeProjectId =
    rawId &&
    !['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(
      rawId
    )
      ? rawId
      : null;
  const { user, signOut, updateAvatarUrl } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const navigate = useNavigate();

  // Desktop collapse & hover state
  // Defaults to false so it is hidden until hovered or clicked
  const [isPinned, setIsPinned] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('valgent-sidebar-pinned') === 'true';
    }
    return false;
  });

  const [isHovered, setIsHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 220); // 220ms grace period to prevent jitter
  };

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

  const isDesktopOpen = isPinned || isHovered || isOpen;

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
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/overview` : '/projects',
      label: 'Overview',
      icon: LayoutDashboard,
      end: false,
    },
    {
      to: `/projects`,
      label: 'Projects',
      icon: FolderGit2,
      end: true,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/evidence` : '/projects',
      label: 'Evidence graph',
      icon: Network,
      end: false,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/reports` : '/projects',
      label: 'Reports',
      icon: FileText,
      end: false,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/roadmap` : '/projects',
      label: 'Roadmap',
      icon: Map,
      end: false,
    },
    {
      to: '/profile',
      label: 'Profile',
      icon: User,
      end: true,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4.5 sm:p-5">
      {/* Top Branding & Navigation */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <ValgentLogo size="md" to="/" />
          <div className="flex items-center gap-1">
            {/* Desktop Pin / Unpin button */}
            <button
              onClick={togglePin}
              className="hidden lg:flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={
                isPinned
                  ? 'Unpin sidebar (auto-hide when mouse leaves)'
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

            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] font-semibold shadow-sm border border-[var(--border-strong)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-current" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Clean theme toggle and user account info */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-soft)]">
        {/* Home Link Button */}
        <Link
          to="/"
          onClick={() => onClose?.()}
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-soft)] hover:border-[var(--color-mauve)]/50 transition-all group"
          title="Home"
        >
          <div className="flex items-center gap-2.5">
            <Home className="w-4 h-4 text-[var(--color-mauve)] group-hover:text-[var(--color-pale-blush)] transition-colors" />
            <span>Home</span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
        </Link>

        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Theme
          </span>
          <ThemeToggle showLabel={true} />
        </div>

        {user && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] hover:border-[var(--color-mauve)]/40 transition-colors">
            <Link
              to="/profile"
              onClick={() => onClose?.()}
              className="flex items-center gap-2.5 overflow-hidden flex-1 group"
              title="Customize your profile"
            >
              <div className="relative group cursor-pointer flex-shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] flex items-center justify-center font-bold text-xs uppercase border border-[var(--border-soft)] group-hover:scale-105 transition-transform relative">
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
              className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0"
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
      {/* 1. Desktop Left-Edge Invisible Hotzone (Hovering left edge slides panel out) */}
      {!isPinned && (
        <div
          className="hidden lg:block fixed inset-y-0 left-0 w-3.5 z-40 cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onClick={handleMouseEnter}
          title="Hover to open sidebar"
          aria-hidden="true"
        />
      )}

      {/* 2. Desktop Floating Sleek Handle / Tab on left edge (Affordance to hover or click) */}
      {!isPinned && (
        <button
          onClick={() => {
            if (isDesktopOpen) {
              setIsHovered(false);
              onClose?.();
            } else {
              setIsHovered(true);
            }
          }}
          onMouseEnter={handleMouseEnter}
          className={`hidden lg:flex fixed top-24 left-0 z-40 items-center justify-center py-2.5 px-1.5 rounded-r-xl bg-white dark:bg-[var(--surface-card)]/90 hover:bg-slate-50 dark:hover:bg-[var(--surface-card-elevated)] backdrop-blur-md border border-l-0 border-slate-300/90 dark:border-[var(--border-soft)] hover:border-slate-400 dark:hover:border-[var(--color-mauve)] text-slate-800 dark:text-[var(--text-secondary)] hover:text-black dark:hover:text-[var(--text-primary)] shadow-xl transition-all duration-300 group ${
            isDesktopOpen
              ? 'opacity-0 pointer-events-none -translate-x-full'
              : 'opacity-100 translate-x-0'
          }`}
          title="Hover or click to expand side panel"
          aria-label="Expand side panel"
        >
          <div className="flex flex-col items-center gap-1.5">
            <PanelLeft className="w-4 h-4 text-slate-700 dark:text-[var(--color-mauve)] group-hover:text-black dark:group-hover:text-[var(--color-pale-blush)] transition-colors" />
            <ChevronRight className="w-3 h-3 text-slate-500 dark:text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}

      {/* 3. Desktop Dock Spacer when pinned (So page layout smoothly accommodates pinned sidebar) */}
      <div
        className={`hidden lg:block flex-shrink-0 transition-all duration-300 ease-in-out ${
          isPinned ? 'w-64' : 'w-0'
        }`}
        aria-hidden="true"
      />

      {/* 4. Desktop Sidebar Panel (Floating if unpinned, docked if pinned) */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`hidden lg:flex fixed inset-y-0 left-0 w-64 h-screen flex-col border-r border-[var(--border-soft)] bg-[var(--surface-sidebar)] z-50 transform transition-all duration-300 ease-out ${
          isDesktopOpen
            ? 'translate-x-0 shadow-2xl shadow-black/60'
            : '-translate-x-full shadow-none pointer-events-none'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 5. Mobile Drawer Backdrop & Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-[var(--surface-sidebar)] border-r border-[var(--border-soft)] z-50 lg:hidden transform transition-transform duration-200 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
