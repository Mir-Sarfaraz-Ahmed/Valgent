import type { ActionDecisionRecord } from '../lib/types';
import StatusBadge from './StatusBadge';

export default function ValidationTimelinePanel({ actions }: { actions: ActionDecisionRecord[] }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
      <div className="panel-title">Autonomous Validation Timeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {actions.map(action => (
          <div key={action.decision_id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, color: 'var(--text-light)' }}>Action: {action.selected_action?.type || 'No Action'}</h4>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-lighter)', borderRadius: '4px' }}>
                {action.result}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <strong>Claim ID:</strong> {action.claim_id}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <strong>Rationale:</strong> {action.selection_reason}
            </div>

            {action.selected_action && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                <span><strong>Risk:</strong> {action.selected_action.risk_level}</span>
                <span><strong>Cost:</strong> {action.selected_action.estimated_cost}</span>
                <span><strong>Safety Decision:</strong> <span style={{ color: action.safety_decision === 'ALLOWED' ? 'var(--status-verified)' : 'var(--status-not-verified)' }}>{action.safety_decision}</span></span>
              </div>
            )}

            {action.execution_id && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong>Execution ID:</strong> {action.execution_id}
              </div>
            )}

            {action.new_evidence && action.new_evidence.length > 0 && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong>New Evidence Discovered:</strong> {action.new_evidence.join(', ')}
              </div>
            )}

            {action.re_evaluation_result && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>Re-evaluation Result:</strong>
                <StatusBadge status={action.re_evaluation_result} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
