import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Clock } from 'lucide-react';
import { ClaimStatus } from '../../types/report';

export type GeneralStatus = 'verified' | 'needs_review' | 'partial' | 'not_verified' | 'insufficient' | 'in_progress' | 'completed';

interface StatusBadgeProps {
  status: ClaimStatus | GeneralStatus | string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  const normalized = String(status).toUpperCase();

  const getStatusConfig = () => {
    switch (normalized) {
      case 'VERIFIED':
      case 'COMPLETED':
        return {
          defaultLabel: normalized === 'COMPLETED' ? 'Completed' : 'Verified',
          badgeClass: 'badge-verified',
          icon: CheckCircle2,
        };
      case 'PARTIALLY_VERIFIED':
      case 'PARTIAL':
      case 'NEEDS_REVIEW':
        return {
          defaultLabel: normalized === 'NEEDS_REVIEW' ? 'Needs review' : 'Partially verified',
          badgeClass: 'badge-partial',
          icon: AlertTriangle,
        };
      case 'NOT_VERIFIED':
      case 'FAILED':
      case 'DISPROVED':
        return {
          defaultLabel: 'Not verified',
          badgeClass: 'badge-not-verified',
          icon: XCircle,
        };
      case 'IN_PROGRESS':
        return {
          defaultLabel: 'In progress',
          badgeClass: 'badge-insufficient',
          icon: Clock,
        };
      case 'INSUFFICIENT_EVIDENCE':
      case 'INSUFFICIENT':
      default:
        return {
          defaultLabel: 'Insufficient evidence',
          badgeClass: 'badge-insufficient',
          icon: HelpCircle,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-[12px] px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={`badge-status ${config.badgeClass} ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={displayLabel}
    >
      <Icon className={`${iconSizes[size]} flex-shrink-0`} aria-hidden="true" />
      <span className="font-semibold tracking-wide">{displayLabel}</span>
    </span>
  );
};
