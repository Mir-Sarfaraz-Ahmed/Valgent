import type { RemediationTask } from '../lib/types';

export default function RoadmapPanel({ roadmap }: { roadmap: RemediationTask[] }) {
  if (!roadmap || roadmap.length === 0) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
      <div className="panel-title">Remediation Roadmap</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {roadmap.map(task => (
          <div key={task.task_id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-light)' }}>{task.title}</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <strong>Problem:</strong> {task.problem}
            </div>
            {task.evidence_refs && task.evidence_refs.length > 0 && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong>Evidence refs:</strong> {task.evidence_refs.join(', ')}
              </div>
            )}

            {task.recommended_actions && task.recommended_actions.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>Recommended Actions:</strong>
                <ul style={{ paddingLeft: '1.5rem', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  {task.recommended_actions.map((action, i) => <li key={i}>{action}</li>)}
                </ul>
              </div>
            )}

            {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>Acceptance Criteria:</strong>
                <ul style={{ paddingLeft: '1.5rem', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  {task.acceptance_criteria.map((criteria, i) => <li key={i}>{criteria}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
