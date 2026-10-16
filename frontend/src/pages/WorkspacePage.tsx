import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { extractClaimsFromDocument, ExtractedClaim } from '../lib/claims-parser';
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
  Network,
  FolderGit2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';

export const WorkspacePage: React.FC = () => {
  const { projectId, tab = 'overview' } = useParams<{ projectId?: string; tab?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>(tab || 'overview');
  const [repoUrlInput, setRepoUrlInput] = useState<string>('');
  const [isSavingRepoUrl, setIsSavingRepoUrl] = useState<boolean>(false);
  const [repoUrlSaved, setRepoUrlSaved] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<ApiError | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      id?: string;
      tempId?: string;
      name: string;
      size: string;
      status: 'Ready' | 'Parsing';
      path?: string;
      signedUrl?: string;
    }>
  >([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState<boolean>(false);
  const [extractedClaims, setExtractedClaims] = useState<ExtractedClaim[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

        // Try to load cached claims for project
        const cached = localStorage.getItem(`valgent-claims-${project.id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              setExtractedClaims(parsed);
              return;
            }
          } catch {}
        }

        // If files exist and have signed URLs, fetch content to extract claims
        if (files.length > 0) {
          for (const f of files) {
            if (f.signedUrl) {
              try {
                const res = await fetch(f.signedUrl);
                if (res.ok) {
                  const text = await res.text();
                  const found = extractClaimsFromDocument(text, f.name);
                  if (found.length > 0 && isMounted) {
                    setExtractedClaims((prev) => {
                      const merged = [...prev];
                      for (const c of found) {
                        if (!merged.some((m) => m.claim_id === c.claim_id)) {
                          merged.push(c);
                        }
                      }
                      localStorage.setItem(`valgent-claims-${project.id}`, JSON.stringify(merged));
                      return merged;
                    });
                  }
                }
              } catch (fetchErr) {
                console.warn('Could not read signed file for claim extraction:', fetchErr);
              }
            }
          }
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
    setIsLoadingProject(true);
    const id = projectId;
    if (id) {
      if (['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(id)) {
        navigate('/projects', { replace: true });
        setIsLoadingProject(false);
        return;
      }
      const found = await ProjectService.getProjectById(id, user?.id);
      if (found) {
        setProject(found);
        setRepoUrlInput(found.repositoryUrl);
        localStorage.setItem('valgent-last-active-project-id', found.id);
        setIsLoadingProject(false);
        return;
      }
    }
    const fallbackList = await ProjectService.getProjects(user?.id);
    if (fallbackList.projects.length > 0) {
      const first = fallbackList.projects[0];
      setProject(first);
      setRepoUrlInput(first.repositoryUrl);
      localStorage.setItem('valgent-last-active-project-id', first.id);
      navigate(`/projects/${first.id}/${tab || 'overview'}`, { replace: true });
    } else {
      setProject(null);
    }
    setIsLoadingProject(false);
  }, [projectId, user?.id, navigate, tab]);

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

  const handleSaveRepoUrl = async () => {
    if (!project) return;
    const targetRepo = repoUrlInput.trim();
    if (!targetRepo.startsWith('http://') && !targetRepo.startsWith('https://')) {
      setAnalysisError({
        code: 'INVALID_URL',
        message: 'A valid public repository URL (http:// or https://) is required.',
        stage: 'REQUEST_VALIDATION',
      });
      return;
    }

    setIsSavingRepoUrl(true);
    setAnalysisError(null);
    try {
      const updated = await ProjectService.updateProject(
        project.id,
        { repositoryUrl: targetRepo },
        user?.id
      );
      setProject(updated);
      setRepoUrlSaved(true);
      setNoticeMessage('Target repository URL successfully saved and synchronized.');
      setTimeout(() => setRepoUrlSaved(false), 3000);
    } catch (err: any) {
      setAnalysisError({
        code: 'SYNC_ERROR',
        message: err?.message || 'Failed to persist repository URL to database.',
        stage: 'DATABASE_SYNC',
      });
    } finally {
      setIsSavingRepoUrl(false);
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
      // 1. Immediately persist target repository URL if changed
      if (targetRepo !== project.repositoryUrl) {
        try {
          await ProjectService.updateProject(
            project.id,
            { repositoryUrl: targetRepo },
            user?.id
          );
          setProject((prev) => (prev ? { ...prev, repositoryUrl: targetRepo } : prev));
        } catch (saveErr) {
          console.warn('Non-fatal error updating repo URL before analysis:', saveErr);
        }
      }

      // 2. Run analysis
      const result = await ProjectService.analyze({
        repository_url: targetRepo,
        project_id: project.id,
        claims: extractedClaims.length > 0 ? extractedClaims : undefined,
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

        // 3. Persist latest report and status to Supabase and Backend
        await ProjectService.updateProject(
          project.id,
          {
            repositoryUrl: targetRepo,
            status: 'completed',
            latestReport: result.report,
          },
          user?.id
        ).catch(() => {});

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

  const processAndUploadFiles = async (files: FileList | File[]) => {
    if (!project || !files || files.length === 0) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploadingFiles(true);

    for (const file of fileArray) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      const tempEntry = {
        tempId,
        name: file.name,
        size: sizeStr,
        status: 'Parsing' as const,
      };

      setUploadedFiles((prev) => [...prev, tempEntry]);

      // Read file content in browser and extract claims immediately
      try {
        const textContent = await file.text();
        const found = extractClaimsFromDocument(textContent, file.name);
        if (found.length > 0) {
          setExtractedClaims((prev) => {
            const merged = [...prev];
            for (const c of found) {
              if (!merged.some((m) => m.claim_id === c.claim_id)) {
                merged.push(c);
              }
            }
            if (project?.id) {
              localStorage.setItem(`valgent-claims-${project.id}`, JSON.stringify(merged));
            }
            return merged;
          });
        }
      } catch (readErr) {
        console.warn('Failed to extract claims from file:', readErr);
      }

      try {
        if (user?.id) {
          const uploaded = await uploadProjectRequirementFile({
            project,
            user,
            file,
          });

          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.tempId === tempId
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
        } else {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.tempId === tempId ? { ...f, status: 'Ready' } : f
            )
          );
        }
      } catch (uploadErr) {
        console.warn(`Failed to upload ${file.name} to storage:`, uploadErr);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.tempId === tempId ? { ...f, status: 'Ready' } : f
          )
        );
      }
    }

    setIsUploadingFiles(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processAndUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processAndUploadFiles(e.target.files);
      e.target.value = '';
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

    if (uploadedFiles.length <= 1) {
      setExtractedClaims([]);
      if (project?.id) {
        localStorage.removeItem(`valgent-claims-${project.id}`);
      }
    }
  };

  if (isLoadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--surface-page)]">
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-[var(--color-mauve)]" />
          <span>Loading project workspace...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex bg-[var(--surface-page)] text-[var(--text-primary)]">
        <AppSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="w-full max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center">
            <EmptyState
              title="No Project Selected"
              description="No active project was found. Select an existing project or create a new one to run AST verification."
              icon={<FolderGit2 className="w-8 h-8 text-[var(--color-mauve)]" />}
              action={{
                label: 'View Projects',
                onClick: () => navigate('/projects'),
                icon: <ArrowRight className="w-4 h-4" />,
              }}
            />
          </main>
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
                      onChange={(e) => {
                        setRepoUrlInput(e.target.value);
                        setRepoUrlSaved(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveRepoUrl();
                        }
                      }}
                      className="text-xs sm:text-sm font-mono text-[var(--text-primary)] bg-transparent border-none outline-none w-full"
                      placeholder="https://github.com/organization/repository"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleSaveRepoUrl}
                    isLoading={isSavingRepoUrl}
                    disabled={isAnalyzing || !repoUrlInput.trim() || repoUrlInput.trim() === project.repositoryUrl}
                    leftIcon={<CheckCircle2 className="w-4 h-4 text-[var(--color-dusty-rose)]" />}
                  >
                    {repoUrlSaved ? 'Saved' : 'Save URL'}
                  </Button>
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
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base sm:text-lg font-bold font-heading text-[var(--text-primary)]">
                        Specification & Requirements Documents
                      </h3>
                      {uploadedFiles.length > 0 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-[var(--color-merlot)] text-[var(--color-pale-blush)] border border-[var(--border-soft)]">
                          {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                      Upload or drag & drop Markdown specifications (.md), JSON/YAML schemas, or text requirements to extract requirements and audit against code AST.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFiles}
                    className="btn-secondary text-xs sm:text-sm cursor-pointer py-2 px-4 self-start sm:self-auto shadow-sm flex items-center gap-2 hover:border-[var(--color-dusty-rose)] transition-colors"
                  >
                    <UploadCloud className="w-4 h-4 text-[var(--color-dusty-rose)]" />
                    <span>Upload files</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".md,.txt,.json,.yaml,.yml"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {/* Capability Limitation Note */}
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border-soft)] text-xs text-[var(--text-muted)] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[var(--color-mauve)] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Supported Formats: </strong>
                    Markdown (.md), JSON, YAML, and TXT text specifications. Note: Deep PDF/DOCX/PPTX document intelligence and video demonstration analysis are planned for upcoming releases. Document upload registers requirements for AST matching and does not substitute for verified repository code.
                  </p>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-all duration-200 flex flex-col items-center justify-center text-center ${
                    isDragging
                      ? 'border-[var(--color-dusty-rose)] bg-[var(--color-merlot)]/20 scale-[1.01] shadow-lg shadow-[var(--color-dusty-rose)]/10 ring-2 ring-[var(--color-dusty-rose)]/30'
                      : 'border-[var(--border-strong)] hover:border-[var(--color-dusty-rose)]/70 bg-black/[0.015] dark:bg-white/[0.015] hover:bg-black/[0.03] dark:hover:bg-white/[0.025]'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-2xl transition-all duration-300 ${
                      isDragging
                        ? 'scale-110 bg-[var(--color-merlot)] text-[var(--color-pale-blush)]'
                        : 'bg-black/5 dark:bg-white/5 text-[var(--color-dusty-rose)] group-hover:scale-105 group-hover:text-[var(--color-pale-blush)]'
                    }`}
                  >
                    <UploadCloud className={`w-7 h-7 ${isDragging ? 'animate-bounce' : ''}`} />
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                      {isDragging ? (
                        <span className="text-[var(--color-pale-blush)] font-bold">
                          Drop specification files to upload
                        </span>
                      ) : (
                        <>
                          <span className="text-[var(--color-pale-blush)] font-bold underline underline-offset-2">
                            Click to browse
                          </span>{' '}
                          or drag & drop multiple files here
                        </>
                      )}
                    </p>
                    <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
                      Select or drop multiple files simultaneously (.md, .json, .yaml, .yml, .txt)
                    </p>
                  </div>

                  {isUploadingFiles && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-pale-blush)] animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading to Supabase Storage...</span>
                    </div>
                  )}
                </div>

                {/* Uploaded Files Chips / List */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-col gap-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                      <span>Uploaded Specifications</span>
                      <span className="font-mono">{uploadedFiles.length} {uploadedFiles.length === 1 ? 'document' : 'documents'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {uploadedFiles.map((file, i) => (
                        <div
                          key={file.id || file.tempId || i}
                          className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] text-xs sm:text-sm hover:border-[var(--border-strong)] transition-colors"
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
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                              file.status === 'Ready'
                                ? 'text-[var(--status-verified)] bg-[var(--status-verified-bg)] border border-[var(--status-verified-border)]'
                                : 'text-[var(--color-pale-blush)] bg-[var(--color-merlot)]/30 border border-[var(--border-soft)] animate-pulse'
                            }`}
                          >
                            {file.status === 'Parsing' && (
                              <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" />
                            )}
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
                  </div>
                )}

                {/* Extracted Claims Summary Card */}
                {extractedClaims.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.025] dark:bg-white/[0.025] border border-[var(--border-strong)] flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)] flex-shrink-0" />
                        <h4 className="text-xs sm:text-sm font-bold font-heading text-[var(--text-primary)]">
                          {extractedClaims.length} Claims Identified & Armed for Verification
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--status-verified-bg)] text-[var(--status-verified)] border border-[var(--status-verified-border)] font-bold self-start sm:self-auto">
                        Ready for Sync & Recheck
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      These requirements were extracted from your specification document. Valgent will cross-examine them against repository AST declarations, routes, database operations, and evidence nodes during the next analysis run.
                    </p>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pt-1">
                      {extractedClaims.slice(0, 20).map((claim) => (
                        <span
                          key={claim.claim_id}
                          title={claim.text}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-merlot)]/30 text-[var(--color-pale-blush)] border border-[var(--border-soft)] font-medium cursor-help"
                        >
                          {claim.claim_id}
                        </span>
                      ))}
                      {extractedClaims.length > 20 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border border-[var(--border-soft)] self-center">
                          +{extractedClaims.length - 20} more claims
                        </span>
                      )}
                    </div>
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
