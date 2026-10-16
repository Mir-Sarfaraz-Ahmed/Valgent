import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  FileJson,
  Clock,
  GitCommit,
  AlertTriangle,
  ShieldCheck,
  Printer,
  FileCode,
  Info
} from 'lucide-react';
import { ProjectReport } from '../../types/report';
import { Button } from '../ui/Button';
import { ClaimStatusBadge } from '../claims/ClaimStatusBadge';

interface ReportViewerProps {
  report: ProjectReport;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `valgent-report-${report.analysis_run_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full print:p-0">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl ui-card print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] border border-[var(--border-soft)]">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-heading">
              Analysis Report Run {report.analysis_run_id}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-mono">
                <GitCommit className="w-3 h-3 text-[var(--color-dusty-rose)]" />
                {report.commit_sha}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(report.timestamp).toLocaleString()}
              </span>
              <span>•</span>
              <span className="font-mono text-[var(--color-dusty-rose)]">{report.duration_ms} ms</span>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-[var(--status-verified)]" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5 text-[var(--color-dusty-rose)]" />}
          >
            Print / Save PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download JSON
          </Button>
        </div>
      </div>

      {/* Historical Retrieval Notice */}
      <div className="p-3.5 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] text-xs text-[var(--text-secondary)] flex items-start gap-2.5 print:hidden">
        <Info className="w-4 h-4 text-[var(--color-mauve)] flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[var(--text-primary)]">Report Persistence: </strong>
          This report is derived from the active analysis session and held in server memory store (`analysisRunsStore`). Cross-session historical report retrieval across multi-instance deployments is scheduled for the upcoming persistent storage release.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl ui-card flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Total Claims
          </span>
          <span className="text-2xl font-bold font-heading text-[var(--text-primary)]">
            {report.summary.total_claims}
          </span>
        </div>
        <div className="p-4 rounded-xl ui-card flex flex-col gap-1 border-l-4 border-l-[var(--status-verified)]">
          <span className="text-[11px] font-semibold text-[var(--status-verified)] uppercase tracking-wider">
            Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[var(--status-verified)]">
            {report.summary.verified_count}
          </span>
        </div>
        <div className="p-4 rounded-xl ui-card flex flex-col gap-1 border-l-4 border-l-[var(--status-partial)]">
          <span className="text-[11px] font-semibold text-[var(--status-partial)] uppercase tracking-wider">
            Partially Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[var(--status-partial)]">
            {report.summary.partially_verified_count}
          </span>
        </div>
        <div className="p-4 rounded-xl ui-card flex flex-col gap-1 border-l-4 border-l-[var(--status-not-verified)]">
          <span className="text-[11px] font-semibold text-[var(--status-not-verified)] uppercase tracking-wider">
            Not Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[var(--status-not-verified)]">
            {report.summary.not_verified_count}
          </span>
        </div>
      </div>

      {/* Section: Validated Claims Detail List */}
      <div className="ui-card p-5 sm:p-6 flex flex-col gap-4">
        <h4 className="text-sm font-bold font-heading text-[var(--text-primary)] pb-2 border-b border-[var(--border-soft)]">
          Detailed Claim Validation Findings
        </h4>
        <div className="flex flex-col gap-3">
          {report.claims.map((claim) => (
            <div
              key={claim.claim_id}
              className="p-4 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex flex-col gap-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold text-[var(--color-dusty-rose)] bg-[var(--color-merlot)]/25">
                    {claim.claim_id}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {claim.text}
                  </span>
                </div>
                <ClaimStatusBadge status={claim.status} size="sm" />
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {claim.reason}
              </p>
              {claim.evidence_items && claim.evidence_items.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {claim.evidence_items.map((e) => (
                    <span
                      key={e.evidence_id}
                      className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-[var(--text-secondary)]"
                    >
                      <FileCode className="w-3 h-3 text-[var(--color-mauve)]" />
                      <span>{e.path}</span>
                      {e.line_start && <span>:L{e.line_start}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostics & Architecture Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Architecture Discovered */}
        <div className="p-5 rounded-2xl ui-card flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-mauve)]" />
            <span>Discovered Architecture</span>
          </h4>
          <div className="flex flex-col gap-2 text-xs">
            <div>
              <span className="font-semibold text-[var(--text-secondary)]">Entry Points: </span>
              <span className="font-mono text-[var(--text-primary)]">
                {report.architecture?.entry_points?.join(', ') || 'src/index.ts'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-secondary)]">Components: </span>
              <span className="text-[var(--text-primary)]">
                {report.architecture?.components?.join(', ') || 'N/A'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-secondary)]">API Endpoints: </span>
              <span className="font-mono text-[var(--text-primary)]">
                {report.architecture?.api_routes?.join(', ') || 'None declared'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-secondary)]">Databases: </span>
              <span className="text-[var(--text-primary)]">
                {report.architecture?.databases?.join(', ') || 'None declared'}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostics & Engine Info */}
        <div className="p-5 rounded-2xl ui-card flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--status-partial)]" />
            <span>Telemetry & Execution Policy</span>
          </h4>
          <div className="flex flex-col gap-2 text-xs">
            <div>
              <span className="font-semibold text-[var(--text-secondary)]">Engine Provider: </span>
              <span className="text-[var(--text-primary)]">
                {report.diagnostics?.provider_info || 'Static TypeScript AST Analyzer'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-secondary)]">Execution Time: </span>
              <span className="text-[var(--text-primary)] font-mono">
                {report.duration_ms} ms
              </span>
            </div>
            {report.diagnostics?.warnings && report.diagnostics.warnings.length > 0 && (
              <div className="p-2.5 rounded-lg bg-[var(--status-partial-bg)] text-[var(--status-partial)] border border-[var(--status-partial-border)] text-[11px] leading-relaxed mt-1">
                {report.diagnostics.warnings.join(' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remediation Tasks Section */}
      {report.roadmap && report.roadmap.length > 0 && (
        <div className="ui-card p-5 sm:p-6 flex flex-col gap-4">
          <h4 className="text-sm font-bold font-heading text-[var(--text-primary)] pb-2 border-b border-[var(--border-soft)]">
            Prescribed Remediation Tasks ({report.roadmap.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.roadmap.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[var(--color-dusty-rose)]">{task.id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[var(--status-not-verified-bg)] text-[var(--status-not-verified)] border border-[var(--status-not-verified-border)]">
                    {task.priority || 'MEDIUM'}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-[var(--text-primary)]">{task.title}</h5>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{task.problem}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON Toggle & Preview */}
      <div className="ui-card p-5 flex flex-col gap-3 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Structured JSON Payload
          </span>
          <button
            onClick={() => setShowJsonRaw(!showJsonRaw)}
            className="btn-ghost text-xs py-1"
          >
            {showJsonRaw ? 'Collapse JSON' : 'Expand JSON'}
          </button>
        </div>

        {showJsonRaw && (
          <pre className="p-4 rounded-xl bg-[var(--surface-input)] text-[var(--color-pale-blush)] font-mono text-xs overflow-x-auto border border-[var(--border-strong)] max-h-96 leading-relaxed">
            <code>{JSON.stringify(report, null, 2)}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
