import React from 'react';
import { Link } from 'react-router-dom';

interface ValgentLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  to?: string;
  className?: string;
}

export const ValgentLogo: React.FC<ValgentLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  to = '/',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Stylized Logo Mark */}
      <div
        className={`${iconSizes[size]} rounded-xl flex items-center justify-center relative overflow-hidden shadow-sm`}
        style={{
          background: 'linear-gradient(135deg, #11212D 0%, #253745 55%, #4A5C6A 100%)',
          border: '1px solid rgba(155, 168, 171, 0.35)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-5 h-5 text-[var(--color-pale-blush)]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 5 L12 18 L18 5" stroke="url(#logo-grad)" />
          <circle cx="18" cy="5" r="1.8" fill="#CCD0CF" stroke="none" />
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#CCD0CF" />
              <stop offset="50%" stopColor="#9BA8AB" />
              <stop offset="100%" stopColor="#4A5C6A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <span className={`font-bold font-heading tracking-tight leading-none text-current ${titleSizes[size]}`}>
          Valgent
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-medium tracking-wider text-[var(--text-muted)] uppercase mt-0.5">
            Validation Agent
          </span>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="no-underline text-inherit hover:opacity-95 transition-opacity">
      {content}
    </Link>
  ) : (
    content
  );
};
