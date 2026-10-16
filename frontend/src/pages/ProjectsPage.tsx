import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { ProjectService } from '../lib/api-client';
import { Project } from '../types/project';
import {
  Search,
  Plus,
  GitBranch,
  GitCommit,
  ArrowRight,
  FolderGit2,
  X,
  AlertCircle,
  Menu,
  Trash2,
  RefreshCw,
  Server,
  WifiOff,
  Home
} from 'lucide-react';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase } from '../lib/supabase';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // New Project Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newBranch, setNewBranch] = useState('main');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      const res = await ProjectService.getProjects(user?.id);
      setProjects(res.projects);
      setIsOfflineMode(res.isOfflineFallback);
    } catch {
      setIsOfflineMode(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      loadProjects();
    }

    if (!user?.id) return;

    // Real-time Supabase postgres change listener
    const channel = supabase
      .channel(`projects-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects, user?.id]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = newProjectName.trim();
    const repoUrl = newRepoUrl.trim();

    if (!name) {
      setFormError('Please enter a project name.');
      return;
    }
    if (!repoUrl) {
      setFormError('Please enter a GitHub repository URL.');
      return;
    }
    if (!repoUrl.startsWith('http://') && !repoUrl.startsWith('https://')) {
      setFormError('Please enter a valid HTTP/HTTPS repository URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await ProjectService.createProject(
        name,
        repoUrl,
        newBranch.trim() || 'main',
        newDescription.trim(),
        user?.id
      );
      setIsModalOpen(false);
      setNewProjectName('');
      setNewRepoUrl('');
      setNewDescription('');
      localStorage.setItem('valgent-last-active-project-id', created.id);
      await loadProjects();
      navigate(`/projects/${created.id}/overview`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create project on server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await ProjectService.deleteProject(projectToDelete.id, user?.id);
      if (localStorage.getItem('valgent-last-active-project-id') === projectToDelete.id) {
        localStorage.removeItem('valgent-last-active-project-id');
      }
      setProjectToDelete(null);
      await loadProjects();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.repositoryUrl.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen flex bg-[var(--surface-page)] text-[var(--text-primary)]">
      {/* Sidebar with mobile drawer support */}
      <AppSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="w-full px-6 sm:px-8 lg:px-10 h-16 border-b border-[var(--border-soft)] bg-[var(--surface-card)] flex items-center justify-between z-10">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold font-heading text-[var(--text-primary)] leading-tight">
                Projects
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
                Repository evidence verification suites
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend Server Connectivity Status Indicator */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOfflineMode
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
              title={
                isOfflineMode
                  ? 'Server offline or unreachable. Displaying cached reference projects.'
                  : 'Connected to live Valgent AST verification backend.'
              }
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline / Demo Fixtures</span>
                </>
              ) : (
                <>
                  <Server className="w-3 h-3 text-emerald-400" />
                  <span>Live Server Connected</span>
                </>
              )}
            </div>

            {/* Access Home Button */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-soft)] hover:border-[var(--color-mauve)]/50 transition-colors shadow-sm"
              title="Home"
            >
              <Home className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <ThemeToggle showLabel={false} />

            {user && (
              <div
                className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] flex items-center justify-center font-bold text-xs uppercase shadow-sm border border-[var(--border-soft)]"
                title={user.fullName || user.email}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user.fullName ? user.fullName[0] : 'U'}</span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="flex-1 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Offline Banner if applicable */}
          {isOfflineMode && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-200 flex items-start gap-3">
              <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1">
                <p className="font-bold">Offline / Cached Evaluation Mode</p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Unable to reach Valgent backend service. Displaying cached demo fixtures. Ensure the backend service is running to connect to live AST and execution endpoints.
                </p>
              </div>
              <button
                onClick={loadProjects}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Top Actions: Search, Filter Tabs, New Project CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search projects by name, repo or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ui-input pl-11 text-xs sm:text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={loadProjects}
                isLoading={isLoading}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                title="Reload projects from server"
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setFormError(null);
                  setIsModalOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New project
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'All Projects', count: projects.length },
              { id: 'in_progress', label: 'In Progress', count: projects.filter(p => p.status === 'in_progress').length },
              { id: 'needs_review', label: 'Needs Review', count: projects.filter(p => p.status === 'needs_review').length },
              { id: 'completed', label: 'Completed', count: projects.filter(p => p.status === 'completed').length },
            ].map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-soft)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-[var(--color-pale-blush)]'
                        : 'bg-black/10 dark:bg-white/10 text-[var(--text-muted)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Loading State */}
          {isLoading && projects.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-mauve)]" />
              <p className="text-xs">Fetching projects from Valgent server...</p>
            </div>
          ) : filteredProjects.length > 0 ? (
            /* Projects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/projects/${proj.id}/overview`)}
                  className="dashboard-card flex flex-col justify-between gap-4 cursor-pointer hover:border-[var(--border-strong)] transition-all group hover:-translate-y-0.5"
                >
                  {/* Top info */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-merlot)]/20 text-[var(--color-dusty-rose)] border border-[var(--border-soft)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <FolderGit2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--color-dusty-rose)] transition-colors truncate">
                          {proj.name}
                        </h3>
                      </div>
                      <StatusBadge status={proj.status} size="sm" />
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>

                    {/* Validation Health Metric */}
                    {proj.latestReport && proj.latestReport.summary.total_claims > 0 && (
                      <div className="flex flex-col gap-2 py-2.5 px-3 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] mt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[var(--text-secondary)]">Verification Audit</span>
                          <span className="font-mono font-bold text-[var(--status-verified)]">
                            {proj.latestReport.summary.verified_count} / {proj.latestReport.summary.total_claims} Verified
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="h-full bg-[var(--status-verified)]"
                            style={{
                              width: `${(proj.latestReport.summary.verified_count / proj.latestReport.summary.total_claims) * 100}%`
                            }}
                            title={`${proj.latestReport.summary.verified_count} Verified`}
                          />
                          <div
                            className="h-full bg-[var(--status-partial)]"
                            style={{
                              width: `${(proj.latestReport.summary.partially_verified_count / proj.latestReport.summary.total_claims) * 100}%`
                            }}
                            title={`${proj.latestReport.summary.partially_verified_count} Partially Verified`}
                          />
                          <div
                            className="h-full bg-[var(--status-not-verified)]"
                            style={{
                              width: `${(proj.latestReport.summary.not_verified_count / proj.latestReport.summary.total_claims) * 100}%`
                            }}
                            title={`${proj.latestReport.summary.not_verified_count} Not Verified`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Repository & Branch Metadata */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-soft)] text-xs text-[var(--text-muted)]">
                    <span className="truncate font-mono text-[11px] text-[var(--text-secondary)]">
                      {proj.repositoryUrl}
                    </span>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                          <span>{proj.branch}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <GitCommit className="w-3.5 h-3.5 text-[var(--color-dusty-rose)]" />
                          <span>{proj.commitSha}</span>
                        </span>
                      </div>

                      {/* Delete & Open Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setProjectToDelete(proj);
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[var(--color-dusty-rose)] group-hover:text-[var(--color-pale-blush)] group-hover:translate-x-0.5 transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={search ? 'No matching projects found' : 'No projects configured yet'}
              description={
                search
                  ? `No repositories matched "${search}". Try adjusting your query or filter.`
                  : 'Add your first GitHub repository to trigger deterministic AST parsing and evidence verification.'
              }
              icon={<FolderGit2 className="w-6 h-6" />}
              action={{
                label: 'Add project',
                onClick: () => {
                  setFormError(null);
                  setIsModalOpen(true);
                },
                icon: <Plus className="w-4 h-4" />,
                variant: 'primary',
              }}
            />
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md ui-card-elevated p-6 border border-red-500/30 bg-[var(--surface-card-elevated)]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                  Delete Project
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-[var(--text-primary)]">{projectToDelete.name}</strong>? All associated analysis runs, reports, and documents will be removed.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-soft)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmDeleteProject}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white border-red-700"
              >
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg ui-card-elevated p-6 sm:p-8 border border-[var(--border-strong)] bg-[var(--surface-card-elevated)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-merlot)]/25 text-[var(--color-dusty-rose)] border border-[var(--border-soft)]">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                    Add new project
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Connect public repository for AST & Docker evidence validation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Project name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Microservice Suite"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="ui-input text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  GitHub repository URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/organization/repository"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="ui-input text-xs sm:text-sm font-mono"
                  required
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  Note: Public repositories only. Private repository OAuth is not yet supported.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Target branch
                  </label>
                  <input
                    type="text"
                    placeholder="main"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    className="ui-input text-xs sm:text-sm font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Short description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional details"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="ui-input text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-soft)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
