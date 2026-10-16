import React from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Network, FileText, Map, FolderGit2, LogOut, X } from 'lucide-react';
import { ValgentLogo } from '../brand/ValgentLogo';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { uploadUserAvatar } from '../../lib/storage';

interface AppSidebarProps {
  currentProjectId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentProjectId,
  isOpen = false,
  onClose,
}) => {
  const params = useParams<{ projectId?: string }>();
  const activeProjectId = currentProjectId || params.projectId || 'proj-valgent-demo';
  const { user, signOut, updateAvatarUrl } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const navigate = useNavigate();

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
      to: `/projects/${activeProjectId}/overview`,
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
      to: `/projects/${activeProjectId}/evidence`,
      label: 'Evidence graph',
      icon: Network,
      end: false,
    },
    {
      to: `/projects/${activeProjectId}/reports`,
      label: 'Reports',
      icon: FileText,
      end: false,
    },
    {
      to: `/projects/${activeProjectId}/roadmap`,
      label: 'Roadmap',
      icon: Map,
      end: false,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4.5 sm:p-5">
      {/* Top Branding & Navigation */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <ValgentLogo size="md" to="/projects" />
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

      {/* Bottom Area: Clean theme toggle and user account info (NO promo cards) */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-soft)]">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[var(--text-muted)]">Theme</span>
          <ThemeToggle showLabel={true} />
        </div>

        {user && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <label
                htmlFor="sidebar-avatar-input"
                className="relative group cursor-pointer flex-shrink-0"
                title="Click to update avatar image"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] flex items-center justify-center font-bold text-xs uppercase border border-[var(--border-soft)] relative">
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
                <input
                  id="sidebar-avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
              </label>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {user.fullName || 'User'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  {user.email || 'user@valgent.ai'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
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
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col border-r border-[var(--border-soft)] bg-[var(--surface-sidebar)] flex-shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Slide-out Menu */}
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
