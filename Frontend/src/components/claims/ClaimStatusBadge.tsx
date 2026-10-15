import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { ClaimStatus } from '../../types/report';

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
  size?: 'sm' | 'md';
}

export const ClaimStatusBadge: React.FC<ClaimStatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs = {
    VERIFIED: {
      label: 'Verified',
      badgeClass: 'badge-verified',
      icon: CheckCircle2,
    },
    PARTIALLY_VERIFIED: {
      label: 'Partially verified',
      badgeClass: 'badge-partial',
      icon: AlertTriangle,
    },
    NOT_VERIFIED: {
      label: 'Not verified',
      badgeClass: 'badge-not-verified',
      icon: XCircle,
    },
    INSUFFICIENT_EVIDENCE: {
      label: 'Insufficient evidence',
      badgeClass: 'badge-insufficient',
      icon: HelpCircle,
    },
  };

  const config = configs[status] || configs.INSUFFICIENT_EVIDENCE;
  const Icon = config.icon;

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const textSizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-[12px] px-2.5 py-1',
  };

  return (
    <span className={`badge-status ${config.badgeClass} ${textSizes[size]}`}>
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </span>
  );
};
