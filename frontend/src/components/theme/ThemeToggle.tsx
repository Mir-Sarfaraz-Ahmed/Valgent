import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false, className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      id="theme-toggle-btn"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark plum mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark plum mode'}
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-[var(--surface-card-subtle)] text-[var(--color-pale-blush)] hover:bg-[var(--surface-card-elevated)] border border-[var(--border-strong)] shadow-inner'
          : 'bg-[var(--surface-card)] text-[var(--color-merlot)] hover:bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] shadow-sm'
      } ${className}`}
      style={{
        padding: showLabel ? '7px 14px' : '8px',
        borderRadius: '12px',
      }}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-[var(--color-dusty-rose)] transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Sun className="w-4 h-4 text-[var(--color-merlot)] transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold tracking-wide select-none">
          {isDark ? 'Dark Plum' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
