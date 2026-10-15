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
      aria-label={isDark ? 'Switch to light mode' : 'Switch to night mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to night mode'}
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-[#2A1326] text-[#FFBB94] hover:bg-[#381B34] border border-[#FB9590]/30 shadow-inner'
          : 'bg-white/80 text-[#852E4E] hover:bg-white border border-[#852E4E]/15 shadow-sm'
      } ${className}`}
      style={{
        padding: showLabel ? '7px 14px' : '8px',
        borderRadius: '12px',
      }}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-[#FFBB94] transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Sun className="w-4 h-4 text-[#A33757] transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold tracking-wide select-none">
          {isDark ? 'Night Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
