import React, { useState } from 'react';
import { Download, Copy, Check, FileJson, Clock, GitCommit, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ProjectReport } from '../../types/report';

interface ReportViewerProps {
  report: ProjectReport;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);

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
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#DC586D] to-[#A33757] text-white">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs"
            title="Copy Report JSON to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#107E5A]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="btn-primary text-xs"
            title="Download Report JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Total Claims
          </span>
          <span className="text-2xl font-bold font-heading text-[var(--text-primary)]">
            {report.summary.total_claims}
          </span>
        </div>
        <div className="p-4 rounded-2xl glass-panel flex flex-col gap-1 border-l-4 border-l-[#107E5A]">
          <span className="text-[11px] font-semibold text-[#107E5A] uppercase tracking-wider">
            Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[#107E5A]">
            {report.summary.verified_count}
          </span>
        </div>
        <div className="p-4 rounded-2xl glass-panel flex flex-col gap-1 border-l-4 border-l-[#B45309]">
          <span className="text-[11px] font-semibold text-[#B45309] uppercase tracking-wider">
            Partially Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[#B45309]">
            {report.summary.partially_verified_count}
          </span>
        </div>
        <div className="p-4 rounded-2xl glass-panel flex flex-col gap-1 border-l-4 border-l-[#C52243]">
          <span className="text-[11px] font-semibold text-[#C52243] uppercase tracking-wider">
            Not Verified
          </span>
          <span className="text-2xl font-bold font-heading text-[#C52243]">
            {report.summary.not_verified_count}
          </span>
        </div>
      </div>

      {/* Structured JSON Inspector */}
      <div className="rounded-2xl border border-[var(--border-soft)] glass-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-soft)] bg-black/5 dark:bg-white/5 flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
            JSON Schema v{report.schema_version}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            Read-only verified artifact
          </span>
        </div>
        <pre className="p-5 font-mono text-xs leading-relaxed max-h-[500px] overflow-auto bg-[#130712] text-[#FDEBF0]">
          <code>{JSON.stringify(report, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
};
