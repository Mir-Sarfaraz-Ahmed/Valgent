import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { WorkspaceHeader } from '../components/navigation/WorkspaceHeader';
import { ProjectService, ApiError } from '../lib/api-client';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  uploadProjectRequirementFile,
  deleteProjectRequirementFile,
  fetchProjectRequirementFilesWithSignedUrls,
} from '../lib/storage';
import { Project } from '../types/project';
import { ClaimTable } from '../components/claims/ClaimTable';
import { EvidenceGraph } from '../components/evidence/EvidenceGraph';
import { RoadmapTaskList } from '../components/roadmap/RoadmapTaskList';
import { ReportViewer } from '../components/reports/ReportViewer';
import {
  CheckCircle2,
  Clock,
  GitBranch,
  GitCommit,
  RefreshCw,
  FileText,
  X,
  ExternalLink,
  UploadCloud,
  FileCode,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  Network
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';

export const WorkspacePage: React.FC = () => {
  const { projectId, tab = 'overview' } = useParams<{ projectId?: string; tab?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>(tab || 'overview');
  const [repoUrlInput, setRepoUrlInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<ApiError | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      id?: string;
      name: string;
      size: string;
      status: 'Ready' | 'Parsing';
      path?: string;
      signedUrl?: string;
    }>
  >([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Load requirement files for current project from Supabase Storage & DB with signed URLs
  useEffect(() => {
    if (!project?.id) return;
    let isMounted = true;
    const fetchRequirementFiles = async () => {
      try {
        const files = await fetchProjectRequirementFilesWithSignedUrls(project.id);
        if (isMounted) {
          setUploadedFiles(files);
        }
      } catch (err) {
        console.warn('Failed to load project requirement files:', err);
      }
    };
    fetchRequirementFiles();
    return () => {
      isMounted = false;
    };
  }, [project?.id]);

  const loadProject = useCallback(async () => {
    const id = projectId;
    if (id) {
      const found = await ProjectService.getProjectById(id, user?.id);
      if (found) {
        setProject(found);
        setRepoUrlInput(found.repositoryUrl);
        return;
      }
    }
    const fallbackList = await ProjectService.getProjects(user?.id);
    if (fallbackList.projects.length > 0) {
      setProject(fallbackList.projects[0]);
      setRepoUrlInput(fallbackList.projects[0].repositoryUrl);
    }
  }, [projectId, user?.id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

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

  const handleAnalyze = async () => {
    if (!project) return;
    const targetRepo = repoUrlInput.trim() || project.repositoryUrl;

    if (!targetRepo.startsWith('http://') && !targetRepo.startsWith('https://')) {
      setAnalysisError({
        code: 'INVALID_URL',
        message: 'A valid public repository URL (http:// or https://) is required to start analysis.',
        stage: 'REQUEST_VALIDATION',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setNoticeMessage(null);

    try {
      const result = await ProjectService.analyze({
        repository_url: targetRepo,
        project_id: project.id,
        analysis_options: {
          skip_execution: false,
        },
      }, user?.id);

      if (result.success) {
        const updatedProject: Project = {
          ...project,
          repositoryUrl: targetRepo,
          commitSha: result.report.commit_sha || project.commitSha,
          lastAnalyzedAt: result.report.timestamp,
          status: 'completed',
          latestReport: result.report,
        };
        setProject(updatedProject);
        setNoticeMessage(
          `Verification complete. ${result.report.summary.verified_count} of ${result.report.summary.total_claims} claims verified against repository AST.`
        );
      } else {
        setAnalysisError(result.error);
      }
    } catch (err: any) {
      setAnalysisError({
        code: 'UNEXPECTED_ERROR',
        message: err?.message || 'An unexpected error occurred during repository analysis.',
        stage: 'CLIENT_EXECUTION',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && project) {
      const file = e.target.files[0];
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      const tempEntry = { name: file.name, size: sizeStr, status: 'Parsing' as const };
      setUploadedFiles((prev) => [...prev, tempEntry]);

      try {
        if (user?.id) {
          const uploaded = await uploadProjectRequirementFile({
            project,
            user,
            file,
          });

          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? {
                    ...f,
                    id: uploaded.id,
                    path: uploaded.filePath,
                    signedUrl: uploaded.signedUrl || undefined,
                    status: 'Ready',
                  }
                : f
            )
          );
          return;
        }
      } catch (uploadErr) {
        console.warn('Failed to upload requirement file to storage:', uploadErr);
      }

      setUploadedFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, status: 'Ready' } : f))
      );
    }
  };

  const removeFile = async (index: number) => {
    const target = uploadedFiles[index];
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

    if (target?.id || target?.path) {
      try {
        await deleteProjectRequirementFile(target.id || '', target.path);
      } catch (err) {
        console.warn('Failed to remove requirement file:', err);
      }
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--surface-page)]">
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-[var(--color-mauve)]" />
          <span>Loading project workspace...</span>
        </div>
      </div>
    );
  }

  const report = project.latestReport;

  return (
    <div className="min-h-screen flex bg-[var(--surface-page)] text-[var(--text-primary)]">
      {/* 1. Fixed Sidebar with Mobile Drawer */}
      <AppSidebar
        currentProjectId={project.id}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Workspace Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <WorkspaceHeader
          project={project}
          onRecheck={handleAnalyze}
          isRechecking={isAnalyzing}
          onMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        {/* Global Success Notification */}
        {noticeMessage && (
          <div className="mx-6 sm:mx-10 mt-6 p-4 rounded-xl bg-[var(--status-verified-bg)] border border-[var(--status-verified-border)] text-sm text-[var(--status-verified)] flex items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{noticeMessage}</span>
            </div>
            <button
              onClick={() => setNoticeMessage(null)}
              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Real Error Failure State Banner */}
        {analysisError && (
          <div className="mx-6 sm:mx-10 mt-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col gap-3 text-red-200 shadow-sm animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <h3 className="text-sm font-bold font-heading text-red-100">
                  Verification Failed [{analysisError.code}]
                </h3>
                {analysisError.stage && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                    Stage: {analysisError.stage}
                  </span>
                )}
              </div>
              <button
                onClick={() => setAnalysisError(null)}
                className="p-1 rounded-md hover:bg-red-500/20 text-red-300"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-red-200/90 leading-relaxed">
              {analysisError.message}
            </p>

            {analysisError.details && analysisError.details.length > 0 && (
              <ul className="list-disc list-inside text-xs font-mono text-red-300/80 bg-red-950/30 p-3 rounded-lg border border-red-500/20 flex flex-col gap-1">
                {analysisError.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAnalyze}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry Analysis
              </Button>
              <span className="text-xs text-red-300/70">
                Ensure the repository is public and accessible, and verify the backend service is running on port 3000.
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
          
          {/* 3. Dedicated Project Header Section */}
          <section className="dashboard-card flex flex-col gap-6">
            {/* Top row: Title, status, actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border-soft)]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)] tracking-tight">
                    {project.name}
                  </h1>
                  <StatusBadge status={project.status} size="sm" />
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                  {project.description || 'Deterministic repository validation suite with semantic AST scanning, evidence telemetry, and remediation roadmap.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3.5 flex-wrap">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAnalyze}
                  isLoading={isAnalyzing}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {isAnalyzing ? 'Running Verification...' : 'Analyze / Recheck'}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleTabChange('reports')}
                  leftIcon={<FileText className="w-4 h-4 text-[var(--color-dusty-rose)]" />}
                >
                  View Reports
                </Button>
              </div>
            </div>

            {/* Bottom metadata row */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {/* Repository link */}
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-[var(--color-dusty-rose)] hover:text-[var(--color-pale-blush)] hover:underline"
                >
                  <FileCode className="w-4 h-4" />
                  <span>{project.repositoryUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </a>

                {/* Branch */}
                <div className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <GitBranch className="w-4 h-4 text-[var(--color-mauve)]" />
                  <span className="font-semibold">{project.branch}</span>
                </div>

                {/* Commit */}
                <div className="inline-flex items-center gap-2 text-[var(--text-muted)] font-mono">
                  <GitCommit className="w-4 h-4 text-[var(--color-dusty-rose)]" />
                  <span>{project.commitSha}</span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Last verified {new Date(project.lastAnalyzedAt || project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </section>

          {/* Honest In-Progress Status Indicator */}
          {isAnalyzing && (
            <section className="p-6 rounded-2xl bg-[var(--surface-card-subtle)] border border-[var(--border-strong)] flex flex-col sm:flex-row items-center gap-5 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-mauve)] flex-shrink-0" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-bold font-heading text-[var(--text-primary)]">
                  Deterministic Verification in Progress
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                  The backend is cloning the repository, parsing AST semantic models, analyzing route definitions, and evaluating assertions synchronously. Please hold on...
                </p>
              </div>
            </section>
          )}

          {/* 4. Dedicated Tabs Navigation */}
          <section className="border-b border-[var(--border-soft)] flex items-center gap-6 sm:gap-8 text-sm font-semibold overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview', badge: report?.claims.length },
              { id: 'evidence', label: 'Evidence graph', badge: report?.graph?.nodes.length },
              { id: 'reports', label: 'Reports', badge: '1' },
              { id: 'roadmap', label: 'Roadmap', badge: report?.roadmap.length },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`py-4 border-b-2 font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'border-[var(--color-dusty-rose)] text-[var(--color-pale-blush)] font-bold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-[var(--color-merlot)] text-[var(--color-pale-blush)] font-bold border border-[var(--border-soft)]'
                          : 'bg-black/5 dark:bg-white/10 text-[var(--text-muted)]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </section>

          {/* 5. TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8 sm:gap-10 w-full">
              
              {/* Section: Repository Target & Synchronization */}
              <section className="dashboard-card flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold font-heading text-[var(--text-primary)]">
                      Target Repository & Codebase Synchronization
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                      Public GitHub repository analyzed for AST declarations, router definitions, and implementation evidence.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-md bg-[var(--status-verified-bg)] text-[var(--status-verified)] border border-[var(--status-verified-border)] font-bold self-start sm:self-auto">
                    Git Synced
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-3.5 pt-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--border-soft)]">
                    <GitBranch className="w-4 h-4 text-[var(--color-mauve)] flex-shrink-0" />
                    <input
                      type="text"
                      value={repoUrlInput}
                      onChange={(e) => setRepoUrlInput(e.target.value)}
                      className="text-xs sm:text-sm font-mono text-[var(--text-primary)] bg-transparent border-none outline-none w-full"
                      placeholder="https://github.com/organization/repository"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAnalyze}
                    isLoading={isAnalyzing}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    {isAnalyzing ? 'Analyzing AST...' : 'Sync & Recheck'}
                  </Button>
                </div>
              </section>

              {/* Section: Upload Requirements or Planned Files */}
              <section className="dashboard-card flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold font-heading text-[var(--text-primary)]">
                      Specification & Requirements Documents
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                      Upload Markdown specifications (.md) or JSON/YAML schemas to extract requirements and audit them against code AST.
                    </p>
                  </div>
                  <label className="btn-secondary text-xs sm:text-sm cursor-pointer py-2 px-4 self-start sm:self-auto shadow-sm flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-[var(--color-dusty-rose)]" />
                    <span>Upload specification</span>
                    <input
                      type="file"
                      accept=".md,.txt,.json,.yaml,.yml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Capability Limitation Note */}
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border-soft)] text-xs text-[var(--text-muted)] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[var(--color-mauve)] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Supported Formats: </strong>
                    Markdown (.md) and structured JSON/YAML text specifications. Note: Deep PDF/DOCX/PPTX document intelligence and video demonstration analysis are planned for upcoming releases. Document upload registers requirements for AST matching and does not substitute for verified repository code.
                  </p>
                </div>

                {/* Uploaded Files Chips / List */}
                {uploadedFiles.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={file.id || i}
                        className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-xs sm:text-sm"
                      >
                        <FileText className="w-4 h-4 text-[var(--color-dusty-rose)] flex-shrink-0" />
                        {file.signedUrl ? (
                          <a
                            href={file.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.name}
                            title="Open or download private document via secure signed URL"
                            className="font-semibold text-[var(--text-primary)] hover:underline hover:text-[var(--color-mauve)] flex items-center gap-1.5 transition-colors"
                          >
                            <span>{file.name}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-60 hover:opacity-100 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="font-semibold text-[var(--text-primary)]">{file.name}</span>
                        )}
                        <span className="text-xs text-[var(--text-muted)] font-mono">({file.size})</span>
                        <span className="text-xs font-bold text-[var(--status-verified)] bg-[var(--status-verified-bg)] border border-[var(--status-verified-border)] px-2 py-0.5 rounded-md">
                          {file.status}
                        </span>
                        <button
                          onClick={() => removeFile(i)}
                          className="text-[var(--text-muted)] hover:text-red-400 ml-1 p-1 rounded-md hover:bg-white/10 transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-[var(--border-soft)] text-center text-xs text-[var(--text-muted)]">
                    No specification files uploaded yet. Supported: Markdown (.md), JSON, YAML.
                  </div>
                )}
              </section>

              {/* Section: Metrics (4 Separate Cards) */}
              {report && (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                  {/* Card 1: Total Claims */}
                  <div className="metric-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        Total Claims
                      </span>
                      <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <div className="my-2">
                      <span className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
                        {report.summary.total_claims}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Extracted from repository & specifications
                    </span>
                  </div>

                  {/* Card 2: Verified */}
                  <div className="metric-card border-l-4 border-l-[var(--status-verified)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--status-verified)] uppercase tracking-wider">
                        Verified
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                    </div>
                    <div className="my-2">
                      <span className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--status-verified)]">
                        {report.summary.verified_count}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Proven with AST line citations
                    </span>
                  </div>

                  {/* Card 3: Partially Verified */}
                  <div className="metric-card border-l-4 border-l-[var(--status-partial)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--status-partial)] uppercase tracking-wider">
                        Partially Verified
                      </span>
                      <AlertTriangle className="w-4 h-4 text-[var(--status-partial)]" />
                    </div>
                    <div className="my-2">
                      <span className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--status-partial)]">
                        {report.summary.partially_verified_count}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Static match found; runtime skipped
                    </span>
                  </div>

                  {/* Card 4: Not Verified */}
                  <div className="metric-card border-l-4 border-l-[var(--status-not-verified)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--status-not-verified)] uppercase tracking-wider">
                        Not Verified
                      </span>
                      <AlertCircle className="w-4 h-4 text-[var(--status-not-verified)]" />
                    </div>
                    <div className="my-2">
                      <span className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--status-not-verified)]">
                        {report.summary.not_verified_count}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Evidence gap or contradiction
                    </span>
                  </div>
                </section>
              )}

              {/* Section: Main Content Area with Claims (68%) + Roadmap (32%) */}
              {report && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-8 items-start">
                  {/* Left Column: Claims (~68%) */}
                  <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold font-heading text-[var(--text-primary)]">
                          Validated Repository Claims
                        </h2>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                          Deterministic findings audited against repository AST symbols.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[var(--color-dusty-rose)] px-3 py-1 rounded-full bg-[var(--color-merlot)]/20 border border-[var(--border-soft)]">
                        {report.claims.length} claims audited
                      </span>
                    </div>

                    <ClaimTable claims={report.claims} />
                  </div>

                  {/* Right Column: Remediation Roadmap (~32%) */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold font-heading text-[var(--text-primary)]">
                          Remediation Roadmap
                        </h2>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                          Actionable steps to resolve evidence gaps.
                        </p>
                      </div>
                      <button
                        onClick={() => handleTabChange('roadmap')}
                        className="text-xs font-semibold text-[var(--color-dusty-rose)] hover:text-[var(--color-pale-blush)] flex items-center gap-1 transition-colors"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Roadmap Preview Cards */}
                    <div className="dashboard-card flex flex-col gap-4">
                      {report.roadmap.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="p-4 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex flex-col gap-2.5 transition-all hover:border-[var(--border-strong)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                              {task.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[var(--status-not-verified-bg)] text-[var(--status-not-verified)] border border-[var(--status-not-verified-border)] flex-shrink-0">
                              {task.priority || 'MEDIUM'}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {task.problem}
                          </p>
                          {task.recommended_actions && task.recommended_actions.length > 0 && (
                            <div className="pt-2 border-t border-[var(--border-soft)] text-xs text-[var(--text-primary)] flex items-center gap-2">
                              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-mauve)] flex-shrink-0" />
                              <span className="truncate">{task.recommended_actions[0]}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTabChange('roadmap')}
                        fullWidth
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Explore all {report.roadmap.length} remediation tasks
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 6. TAB: EVIDENCE GRAPH */}
          {activeTab === 'evidence' && (
            report && report.graph ? (
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-heading text-[var(--text-primary)]">
                      AST Semantic Evidence Graph
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                      Interactive relational nodes mapping claims, symbol AST definitions, and route handlers.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)] px-3 py-1 rounded-full bg-[var(--color-merlot)]/20 border border-[var(--border-soft)] self-start sm:self-auto">
                    {report.graph.nodes.length} nodes • {report.graph.edges.length} edges
                  </span>
                </div>

                <EvidenceGraph graph={report.graph} />
              </div>
            ) : (
              <div className="ui-card p-12 text-center flex flex-col items-center justify-center gap-4">
                <div className="p-3.5 rounded-2xl bg-[var(--color-merlot)]/20 border border-[var(--border-soft)] text-[var(--color-dusty-rose)]">
                  <Network className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="text-base font-bold font-heading text-[var(--text-primary)]">
                    No Evidence Graph Generated Yet
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Trigger deterministic analysis to clone this repository and construct AST relational nodes connecting claims, source files, and execution telemetry.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAnalyze}
                  isLoading={isAnalyzing}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {isAnalyzing ? 'Building Evidence...' : 'Run Repository Verification'}
                </Button>
              </div>
            )
          )}

          {/* 7. TAB: REPORTS */}
          {activeTab === 'reports' && (
            report ? (
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-heading text-[var(--text-primary)]">
                      Audit Verification Reports
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                      Official validation reports, JSON payloads, and telemetry findings.
                    </p>
                  </div>
                </div>

                <ReportViewer report={report} />
              </div>
            ) : (
              <div className="ui-card p-12 text-center flex flex-col items-center justify-center gap-4">
                <div className="p-3.5 rounded-2xl bg-[var(--color-merlot)]/20 border border-[var(--border-soft)] text-[var(--color-dusty-rose)]">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="text-base font-bold font-heading text-[var(--text-primary)]">
                    No Audit Report Available
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Run verification to generate a formal audit report with verifiable claims, evidence citations, and diagnostics.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAnalyze}
                  isLoading={isAnalyzing}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {isAnalyzing ? 'Auditing...' : 'Run Verification'}
                </Button>
              </div>
            )
          )}

          {/* 8. TAB: ROADMAP */}
          {activeTab === 'roadmap' && (
            report ? (
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-heading text-[var(--text-primary)]">
                      Actionable Remediation Roadmap
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                      Objective technical next steps to bridge evidence gaps and resolve unverified claims.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)] px-3 py-1 rounded-full bg-[var(--color-merlot)]/20 border border-[var(--border-soft)] self-start sm:self-auto">
                    {report.roadmap.length} prioritized tasks
                  </span>
                </div>

                <RoadmapTaskList tasks={report.roadmap} />
              </div>
            ) : (
              <div className="ui-card p-12 text-center flex flex-col items-center justify-center gap-4">
                <div className="p-3.5 rounded-2xl bg-[var(--color-merlot)]/20 border border-[var(--border-soft)] text-[var(--color-dusty-rose)]">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="text-base font-bold font-heading text-[var(--text-primary)]">
                    No Remediation Tasks Needed
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Run repository verification to audit code implementation claims and generate prioritized remediation tasks if deficiencies are found.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAnalyze}
                  isLoading={isAnalyzing}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {isAnalyzing ? 'Auditing...' : 'Run Verification'}
                </Button>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
};
