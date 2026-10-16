import React from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonVariant } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
    to?: string;
    variant?: ButtonVariant;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  children,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)]/50 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[var(--color-merlot)]/15 border border-[var(--color-mauve)]/30 text-[var(--color-dusty-rose)] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-1.5 font-heading">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {action && (
        <div>
          {action.to ? (
            <Link to={action.to} className="inline-block">
              <Button variant={action.variant || 'primary'} leftIcon={action.icon}>
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};
