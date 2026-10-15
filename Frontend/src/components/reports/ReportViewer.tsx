import React, { useState } from 'react';
import { Download, Copy, Check, FileJson, Clock, GitCommit, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ProjectReport } from '../../types/report';

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

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl ui-card">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[var(--color-rose)] to-[var(--color-wine)] text-white">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Analysis Report Run {report.analysis_run_id}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
              <span className="flex items-center gap-1 font-mono">
                <GitCommit className="w-3 h-3 text-[#FFBB94]" />
                {report.commit_sha}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(report.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs flex-1 sm:flex-none"
            title="Copy Report JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#107E5A]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="btn-primary text-xs flex-1 sm:flex-none"
            title="Download Report JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
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
        <div className="p-4 rounded-xl ui-card flex flex-col gap-1 border-l-4 border-l-[#107E5A]">
          <span className="text-[11px] font-semibold text-[#107E5A] uppercase tracking-wider">
            Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[#107E5A]">
            {report.summary.verified_count}
          </span>
        </div>
        <div className="p-4 rounded-xl ui-card flex flex-col gap-1 border-l-4 border-l-[#B45309]">
          <span className="text-[11px] font-semibold text-[#B45309] uppercase tracking-wider">
            Partially Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[#B45309]">
            {report.summary.partially_verified_count}
          </span>
        </div>
        <div className="p-4 rounded-xl ui-card flex flex-col gap-1 border-l-4 border-l-[#C52243]">
          <span className="text-[11px] font-semibold text-[#C52243] uppercase tracking-wider">
            Not Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[#C52243]">
            {report.summary.not_verified_count}
          </span>
        </div>
      </div>

      {/* Diagnostics & Architecture Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Architecture Discovered */}
        <div className="p-5 rounded-2xl ui-card flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-rose)]" />
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
            <AlertTriangle className="w-4 h-4 text-[#B45309]" />
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
              <span className="font-semibold text-[var(--text-secondary)]">Duration: </span>
              <span className="text-[var(--text-primary)] font-mono">
                {report.duration_ms} ms
              </span>
            </div>
            {report.diagnostics?.warnings && report.diagnostics.warnings.length > 0 && (
              <div className="p-2.5 rounded-lg bg-[#B45309]/10 text-[#B45309] text-[11px] leading-relaxed mt-1">
                {report.diagnostics.warnings.join(' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw JSON Toggle & Preview */}
      <div className="ui-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Raw JSON Output
          </span>
          <button
            onClick={() => setShowJsonRaw(!showJsonRaw)}
            className="btn-ghost text-xs py-1"
          >
            {showJsonRaw ? 'Collapse JSON' : 'Expand JSON'}
          </button>
        </div>

        {showJsonRaw && (
          <pre className="p-4 rounded-xl bg-[#170B16] text-[#FDE8ED] font-mono text-xs overflow-x-auto border border-[#FB9590]/20 max-h-96 leading-relaxed">
            <code>{JSON.stringify(report, null, 2)}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
