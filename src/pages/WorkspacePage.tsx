import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { WorkspaceHeader } from '../components/navigation/WorkspaceHeader';
import { ProjectService } from '../lib/api-client';
import { Project } from '../types/project';
import { ProjectReport, RoadmapTask } from '../types/report';
import { ClaimTable } from '../components/claims/ClaimTable';
import { EvidenceGraph } from '../components/evidence/EvidenceGraph';
import { RoadmapTaskList } from '../components/roadmap/RoadmapTaskList';
import { ReportViewer } from '../components/reports/ReportViewer';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  ArrowRight,
  GitBranch,
  RefreshCw,
  FileCheck,
  Cpu,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  Play
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { projectId, tab = 'overview' } = useParams<{ projectId?: string; tab?: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>(tab || 'overview');
  const [repoUrlInput, setRepoUrlInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<number>(4); // 1: repo scan, 2: static analysis, 3: AI cross-check, 4: complete
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(['PRD_Specification_v1.0.md']);

  useEffect(() => {
    const id = projectId || 'proj-valgent-demo';
    const found = ProjectService.getProjectById(id) || ProjectService.getProjects()[0];
    if (found) {
      setProject(found);
      setRepoUrlInput(found.repositoryUrl);
    }
  }, [projectId]);

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (project) {
      navigate(`/projects/${project.id}/${newTab}`);
    }
  };

  const handleAnalyze = () => {
    if (!project) return;
    setIsAnalyzing(true);
    setAnalysisStage(1);

    // Realistic progressive analysis stage transitions
    setTimeout(() => setAnalysisStage(2), 1000);
    setTimeout(() => setAnalysisStage(3), 2000);
    setTimeout(() => {
      setAnalysisStage(4);
      const updated = ProjectService.recheckProject(project.id);
      if (updated) {
        setProject(updated);
      }
      setIsAnalyzing(false);
    }, 3200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFiles((prev) => [...prev, file.name]);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-sm text-[var(--text-muted)] animate-pulse">
          Loading workspace...
        </div>
      </div>
    );
  }

  const report = project.latestReport;

  return (
    <div className="min-h-screen flex relative z-10">
      {/* Sidebar with EXACT required order & NO upgrade card */}
      <AppSidebar currentProjectId={project.id} />

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Header */}
        <WorkspaceHeader
          project={project}
          onRecheck={handleAnalyze}
          isRechecking={isAnalyzing}
        />

        {/* Tab Navigation Bar matching mockup screen 04 */}
        <div className="px-8 pt-4 pb-2 border-b border-[var(--border-soft)] glass-panel rounded-none border-t-0 border-l-0 border-r-0 flex items-center gap-6 text-sm font-semibold">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'evidence', label: 'Evidence graph' },
            { id: 'reports', label: 'Reports' },
            { id: 'roadmap', label: 'Roadmap' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`pb-3 relative transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'text-[var(--color-rose)] font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{t.label}</span>
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#DC586D] to-[#FB9590] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <main className="flex-1 p-8 max-w-7xl w-full">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && report && (
            <div className="flex flex-col gap-8">
              {/* Top Row: Repository Input & Recheck Action */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 flex items-center gap-3 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)]">
                  <GitBranch className="w-4 h-4 text-[#DC586D]" />
                  <input
                    type="text"
                    value={repoUrlInput}
                    onChange={(e) => setRepoUrlInput(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    className="w-full bg-transparent border-none outline-none text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="btn-primary text-xs px-5 py-2.5 flex-shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing AST...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Analyze / Recheck project</span>
                    </>
                  )}
                </button>
              </div>

              {/* Upload Requirements / Planned Files Zone */}
              <label className="border-2 border-dashed border-[var(--border-soft)] hover:border-[#DC586D] rounded-2xl p-6 glass-panel flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all hover:bg-[#DC586D]/5">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".md,.txt,.pdf,.docx"
                />
                <div className="p-3 rounded-full bg-[#DC586D]/15 text-[#DC586D]">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Upload requirements or planned files
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    PRD, README, architecture docs, PDF, DOCX, PPTX, Markdown
                  </p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {uploadedFiles.map((fn, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-black/5 dark:bg-white/10 text-[var(--color-rose)] border border-[var(--border-soft)]"
                      >
                        ✓ {fn}
                      </span>
                    ))}
                  </div>
                )}
              </label>

              {/* Analysis Progress Tracker (matching mockup screen 04) */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Analysis Progress
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
                  {[
                    { step: 1, label: 'Repository scan', desc: 'Resolved commit' },
                    { step: 2, label: 'Static analysis', desc: 'TS Compiler AST' },
                    { step: 3, label: 'AI cross-check', desc: 'Gemini reasoning' },
                    { step: 4, label: 'Evidence report', desc: 'Audited findings' },
                  ].map((s) => {
                    const isDone = analysisStage >= s.step;
                    const isCurrent = analysisStage === s.step && isAnalyzing;
                    return (
                      <div
                        key={s.step}
                        className={`p-3.5 rounded-xl border flex flex-col gap-1 transition-all ${
                          isDone
                            ? 'bg-[#107E5A]/10 border-[#107E5A]/30 text-[#107E5A]'
                            : isCurrent
                            ? 'bg-[#DC586D]/10 border-[#DC586D]/40 text-[#DC586D] animate-pulse'
                            : 'bg-black/5 dark:bg-white/5 border-[var(--border-soft)] text-[var(--text-muted)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{s.label}</span>
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-[#107E5A]" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {s.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two Column Grid: Claim Table & Roadmap Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 8 Cols: Claim Verification Table */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold font-heading text-[var(--text-primary)]">
                      Claim verification ({report.summary.verified_count} of {report.summary.total_claims})
                    </h3>
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      AST & Telemetry Audited
                    </span>
                  </div>

                  {/* Claims Table */}
                  <ClaimTable claims={report.claims} />
                </div>

                {/* Right 4 Cols: Execution Roadmap Preview & Generate Report */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Execution Roadmap Box */}
                  <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold font-heading text-[var(--text-primary)]">
                        Execution roadmap
                      </h4>
                      <button
                        onClick={() => handleTabChange('roadmap')}
                        className="text-xs font-semibold text-[var(--color-rose)] hover:underline flex items-center gap-1"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] -mt-2">
                      Next steps based on verified gaps
                    </span>

                    {/* Preview Tasks */}
                    <div className="flex flex-col gap-3">
                      {report.roadmap.slice(0, 3).map((task: RoadmapTask, i: number) => (
                        <div
                          key={task.id}
                          className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {i + 1}. {task.title}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#C52243]/15 text-[#C52243]">
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                            {task.problem}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generate Report Card */}
                  <div className="glass-panel-strong p-6 rounded-2xl flex flex-col gap-3 border border-[#DC586D]/30 relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#DC586D] to-[#A33757] text-white">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          Structured Report
                        </h4>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Run {report.analysis_run_id} ready
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Retrieve full audited report JSON with evidence graph references and AST citations.
                    </p>
                    <button
                      onClick={() => handleTabChange('reports')}
                      className="btn-primary text-xs w-full mt-1"
                    >
                      <span>Open Full Report</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE GRAPH */}
          {activeTab === 'evidence' && report && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold font-heading text-[var(--text-primary)]">
                  Evidence Graph Explorer
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Trace relationships between claims, AST symbols, API routes, and test executions.
                </p>
              </div>
              <EvidenceGraph graph={report.graph} />
            </div>
          )}

          {/* TAB 3: REPORTS */}
          {activeTab === 'reports' && report && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold font-heading text-[var(--text-primary)]">
                  Analysis Reports & Telemetry
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Inspect structured validation output, copy or download JSON schemas.
                </p>
              </div>
              <ReportViewer report={report} />
            </div>
          )}

          {/* TAB 4: ROADMAP */}
          {activeTab === 'roadmap' && report && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold font-heading text-[var(--text-primary)]">
                  Prioritized Remediation Roadmap
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Deterministic task list generated from missing evidence and contradiction gaps.
                </p>
              </div>
              <RoadmapTaskList tasks={report.roadmap} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
