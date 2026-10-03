import { useState } from 'react';
import { analyzeProject, ApiError } from '../lib/api';
import type { AnalysisResponse, AnalyzeRequest } from '../lib/types';
import StatusBadge from '../components/StatusBadge';
import ErrorMessage from '../components/ErrorMessage';
import ClaimCard from '../components/ClaimCard';
import ContextMetricsPanel from '../components/ContextMetricsPanel';
import RoadmapPanel from '../components/RoadmapPanel';
import ValidationTimelinePanel from '../components/ValidationTimelinePanel';
import { sanitizeObject } from '../lib/sanitize';

export default function Analyze() {
  const [url, setUrl] = useState('');
  const [commit, setCommit] = useState('');
  const [skipExecution, setSkipExecution] = useState(false);
  const [skipLlm, setSkipLlm] = useState(false);

  const [state, setState] = useState<'IDLE' | 'SUBMITTING' | 'ANALYZING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<{message: string, details?: string[], title?: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch (_) {
      setError({ message: 'Please enter a valid URL.' });
      return;
    }

    setState('SUBMITTING');
    setError(null);
    setResult(null);

    const request: AnalyzeRequest = {
      repository_url: url,
      commit_sha: commit || undefined,
      analysis_options: {
        skip_execution: skipExecution,
        skip_llm: skipLlm
      }
    };

    try {
      setState('ANALYZING');
      const response = await analyzeProject(request);

      if (response && response.report) {
        response.report = sanitizeObject(response.report);
      }

      setResult(response);
      setState('COMPLETED');
    } catch (err: any) {
      setState('FAILED');
      if (err instanceof ApiError) {
        setError({
          title: `Analysis Failed at stage: ${err.stage}`,
          message: err.message,
          details: err.details
        });
      } else {
        setError({
          title: 'Request Failed',
          message: err.message || 'An unexpected error occurred.'
        });
      }
    }
  };

  return (
    <div className="analyze-container">
      <h2 style={{ marginBottom: '1.5rem' }}>Analyze Project</h2>

      {state === 'IDLE' || state === 'FAILED' ? (
        <div className="glass-panel">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="repo-url">Repository URL *</label>
              <input
                id="repo-url"
                type="url"
                className="form-input"
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="commit-sha">Commit SHA (Optional)</label>
              <input
                id="commit-sha"
                type="text"
                className="form-input"
                placeholder="e.g. main, v1.0, or hash"
                value={commit}
                onChange={(e) => setCommit(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={skipExecution}
                  onChange={(e) => setSkipExecution(e.target.checked)}
                />
                Skip dynamic execution (sandbox)
              </label>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={skipLlm}
                  onChange={(e) => setSkipLlm(e.target.checked)}
                />
                Skip LLM synthesis
              </label>
            </div>

            <button type="submit" className="glass-btn glass-btn-primary" disabled={!url}>
              Analyze Project
            </button>
          </form>
        </div>
      ) : null}

      {error && (
        <ErrorMessage title={error.title} message={error.message} details={error.details} />
      )}

      {(state === 'SUBMITTING' || state === 'ANALYZING') && (
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Analysis in progress</h3>
          <p style={{ marginTop: '0.5rem' }}>
            {state === 'SUBMITTING' ? 'Submitting request...' : 'Analyzing repository. This may take a few minutes.'}
          </p>
        </div>
      )}

      {state === 'COMPLETED' && result && (
        <div>
          <div className="glass-panel">
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Analysis Report: {result.report.project.name}</span>
              <StatusBadge status={result.report.analysis.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <p><strong>Repository:</strong> {result.report.project.repository_url}</p>
                <p><strong>Commit:</strong> {result.report.project.repository_commit}</p>
                <p><strong>Analysis ID:</strong> <span style={{ fontFamily: 'monospace' }}>{result.analysis_id}</span></p>
              </div>
              <div>
                <p><strong>Package Manager:</strong> {result.report.project.package_manager}</p>
                <p><strong>Duration:</strong> {(result.report.analysis.duration_ms / 1000).toFixed(1)}s</p>
              </div>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Validation Summary</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Total Claims</div>
                <div className="stat-value">{result.report.summary.claims_total}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label stat-verified">Verified</div>
                <div className="stat-value">{result.report.summary.verified}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label stat-partially_verified">Partially</div>
                <div className="stat-value">{result.report.summary.partially_verified}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label stat-not_verified">Not Verified</div>
                <div className="stat-value">{result.report.summary.not_verified}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label stat-insufficient_evidence">Insufficient</div>
                <div className="stat-value">{result.report.summary.insufficient_evidence}</div>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button className="glass-btn" onClick={() => setState('IDLE')}>
                Run Another Analysis
              </button>
            </div>
          </div>

          <ContextMetricsPanel project={result.report.project} />

          {result.report.requirements && result.report.requirements.length > 0 && (
            <div className="glass-panel">
              <div className="panel-title">Evaluated Claims</div>
              {result.report.requirements.map(claim => (
                <ClaimCard key={claim.claim_id} claim={claim} graph={result.report.evidence_graph} />
              ))}
            </div>
          )}

          {result.report.validation_actions && (
            <ValidationTimelinePanel actions={result.report.validation_actions} />
          )}

          {result.report.roadmap && (
            <RoadmapPanel roadmap={result.report.roadmap} />
          )}

          {result.report.diagnostics && (result.report.diagnostics.warnings.length > 0 || result.report.diagnostics.provider_failures.length > 0) && (
            <div className="glass-panel">
              <div className="panel-title">Diagnostics</div>
              {result.report.diagnostics.warnings.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Warnings:</strong>
                  <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    {result.report.diagnostics.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {result.report.diagnostics.provider_failures.length > 0 && (
                <div>
                  <strong>Provider Failures:</strong>
                  <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--status-not-verified)' }}>
                    {result.report.diagnostics.provider_failures.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
