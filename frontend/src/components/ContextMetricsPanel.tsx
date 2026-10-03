import type { ProjectReport } from '../lib/types';

export default function ContextMetricsPanel({ project }: { project: ProjectReport['project'] }) {
  if (!project.context_metrics) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
      <div className="panel-title" style={{ fontSize: '1.1rem' }}>Supplemental Repository Context</div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Supplemental repository context helps the reasoning layer interpret implementation. It is not authoritative validation evidence.
      </p>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <div className="stat-box">
          <div className="stat-label">Total Files</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{project.context_metrics.total_files}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Eligible Files</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{project.context_metrics.eligible_files}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Est. Tokens</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{project.context_metrics.estimated_tokens.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
