import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Server,
  WifiOff,
  Sun,
  Moon,
  User,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export interface HeaderActionDockProps {
  isOfflineMode?: boolean;
  onRecheck?: () => void;
  isRechecking?: boolean;
  showRecheck?: boolean;
  className?: string;
}

export const HeaderActionDock: React.FC<HeaderActionDockProps> = ({
  isOfflineMode = false,
  onRecheck,
  isRechecking = false,
  showRecheck = false,
  className = '',
}) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Common unhovered style: crisp white circle with dark icon & shadow in light mode, translucent frosted circle in dark mode
  const unhoveredBtnClass =
    'w-9 sm:w-10 bg-white dark:bg-white/10 text-slate-800 dark:text-[var(--text-secondary)] hover:text-black dark:hover:text-[var(--text-primary)] border border-slate-300/90 dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none';

  return (
    <div
      className={`inline-flex items-center gap-2 sm:gap-2.5 p-1 rounded-full bg-slate-200/70 dark:bg-white/5 border border-slate-300/80 dark:border-[var(--border-soft)] shadow-xs backdrop-blur-md transition-all ${className}`}
      role="toolbar"
      aria-label="Navigation actions"
    >
      {/* 1. RECHECK ACTION (Workspace Only) */}
      {showRecheck && onRecheck && (
        <button
          type="button"
          onClick={onRecheck}
          disabled={isRechecking}
          onMouseEnter={() => setHoveredId('recheck')}
          onMouseLeave={() => setHoveredId(null)}
          className={`relative h-9 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            hoveredId === 'recheck' || isRechecking
              ? 'px-4 sm:px-5 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.55)] scale-[1.02]'
              : unhoveredBtnClass
          }`}
          title="Recheck against repository head"
          aria-label="Recheck claims against repository"
        >
          <RefreshCw
            className={`w-4 h-4 flex-shrink-0 transition-transform ${
              isRechecking ? 'animate-spin' : ''
            }`}
          />
          <span
            className={`overflow-hidden transition-all duration-300 font-bold text-xs tracking-wider uppercase whitespace-nowrap ${
              hoveredId === 'recheck' || isRechecking
                ? 'max-w-[120px] opacity-100 ml-2'
                : 'max-w-0 opacity-0 ml-0'
            }`}
          >
            {isRechecking ? 'Checking...' : 'Recheck'}
          </span>
        </button>
      )}

      {/* 2. SERVER STATUS ACTION */}
      <div
        onMouseEnter={() => setHoveredId('server')}
        onMouseLeave={() => setHoveredId(null)}
        className={`relative h-9 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default ${
          hoveredId === 'server'
            ? isOfflineMode
              ? 'px-4 sm:px-5 bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.55)] scale-[1.02]'
              : 'px-4 sm:px-5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.55)] scale-[1.02]'
            : unhoveredBtnClass
        }`}
        title={
          isOfflineMode
            ? 'Server offline or unreachable. Displaying cached AST verification data.'
            : 'Live AST verification server connected & ready.'
        }
      >
        <div className="relative flex items-center justify-center">
          {isOfflineMode ? (
            <WifiOff className="w-4 h-4 text-amber-500 dark:text-amber-300" />
          ) : (
            <Server className={`w-4 h-4 ${hoveredId === 'server' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
          )}
          {!isOfflineMode && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>
        <span
          className={`overflow-hidden transition-all duration-300 font-bold text-xs tracking-wider uppercase whitespace-nowrap ${
            hoveredId === 'server'
              ? 'max-w-[140px] opacity-100 ml-2'
              : 'max-w-0 opacity-0 ml-0'
          }`}
        >
          {isOfflineMode ? 'Offline' : 'Server Live'}
        </span>
      </div>

      {/* 3. HOME ACTION (Vibrant Purple Glow - Identical to Image 1) */}
      <Link
        to="/"
        onMouseEnter={() => setHoveredId('home')}
        onMouseLeave={() => setHoveredId(null)}
        className={`relative h-9 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          hoveredId === 'home'
            ? 'px-4 sm:px-5 bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] text-white shadow-[0_0_22px_rgba(168,85,247,0.6)] scale-[1.02]'
            : unhoveredBtnClass
        }`}
        title="Go to Home"
        aria-label="Home"
      >
        <Home className="w-4 h-4 flex-shrink-0" />
        <span
          className={`overflow-hidden transition-all duration-300 font-bold text-xs tracking-wider uppercase whitespace-nowrap ${
            hoveredId === 'home'
              ? 'max-w-[100px] opacity-100 ml-2'
              : 'max-w-0 opacity-0 ml-0'
          }`}
        >
          Home
        </span>
      </Link>

      {/* 4. THEME TOGGLE ACTION (Sun / Moon) */}
      <button
        type="button"
        onClick={toggleTheme}
        onMouseEnter={() => setHoveredId('theme')}
        onMouseLeave={() => setHoveredId(null)}
        className={`relative h-9 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          hoveredId === 'theme'
            ? theme === 'dark'
              ? 'px-4 sm:px-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.55)] scale-[1.02]'
              : 'px-4 sm:px-5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.55)] scale-[1.02]'
            : unhoveredBtnClass
        }`}
        title={`Switch to ${theme === 'dark' ? 'Light Silk' : 'Dark Plum'} theme`}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Moon className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Sun className="w-4 h-4 flex-shrink-0 text-amber-600" />
        )}
        <span
          className={`overflow-hidden transition-all duration-300 font-bold text-xs tracking-wider uppercase whitespace-nowrap ${
            hoveredId === 'theme'
              ? 'max-w-[120px] opacity-100 ml-2'
              : 'max-w-0 opacity-0 ml-0'
          }`}
        >
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </span>
      </button>

      {/* 5. USER PROFILE ACTION */}
      {user && (
        <Link
          to="/profile"
          onMouseEnter={() => setHoveredId('profile')}
          onMouseLeave={() => setHoveredId(null)}
          className={`relative h-9 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            hoveredId === 'profile'
              ? 'px-3.5 sm:px-4.5 bg-gradient-to-r from-[#be185d] via-[#d946ef] to-[#ec4899] text-white shadow-[0_0_22px_rgba(236,72,153,0.6)] scale-[1.02]'
              : unhoveredBtnClass
          }`}
          title={`${user.fullName || user.email} (View & Customize Profile)`}
          aria-label="User profile settings"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-white flex items-center justify-center font-bold text-[11px] uppercase flex-shrink-0 border border-slate-300 dark:border-white/20">
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
          <span
            className={`overflow-hidden transition-all duration-300 font-bold text-xs tracking-wider uppercase whitespace-nowrap ${
              hoveredId === 'profile'
                ? 'max-w-[110px] opacity-100 ml-2'
                : 'max-w-0 opacity-0 ml-0'
            }`}
          >
            Profile
          </span>
        </Link>
      )}
    </div>
  );
};
