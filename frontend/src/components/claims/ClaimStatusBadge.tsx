import React from 'react';
import { ClaimStatus } from '../../types/report';
import { StatusBadge } from '../ui/StatusBadge';

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const ClaimStatusBadge: React.FC<ClaimStatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  return <StatusBadge status={status} size={size} className={className} />;
};
