

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();

  let className = 'status-default';
  if (normalizedStatus === 'VERIFIED' || normalizedStatus === 'COMPLETED') className = 'status-verified';
  else if (normalizedStatus === 'PARTIALLY_VERIFIED') className = 'status-partially_verified';
  else if (normalizedStatus === 'NOT_VERIFIED' || normalizedStatus === 'FAILED') className = 'status-not_verified';
  else if (normalizedStatus === 'INSUFFICIENT_EVIDENCE') className = 'status-insufficient_evidence';

  return (
    <span className={`status-badge ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
