import type { ValidationResult, EvidenceGraphData } from '../lib/types';
import StatusBadge from './StatusBadge';
import EvidenceExplorerPanel from './EvidenceExplorerPanel';

interface ClaimCardProps {
  claim: ValidationResult;
  graph?: EvidenceGraphData;
}

export default function ClaimCard({ claim, graph }: ClaimCardProps) {
  return (
    <div className="claim-card">
      <div className="claim-header">
        <div className="claim-text">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
            {claim.claim_id}
          </span>
          {claim.text}
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {claim.conclusion && (
        <div className="claim-conclusion">
          <strong>Conclusion:</strong> {claim.conclusion}
        </div>
      )}

      {claim.evidence_refs && claim.evidence_refs.length > 0 && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          <strong>Evidence:</strong> {claim.evidence_refs.join(', ')}
        </div>
      )}

      <EvidenceExplorerPanel graph={graph} claimId={claim.claim_id} />
    </div>
  );
}
