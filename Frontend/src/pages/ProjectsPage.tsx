import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { ProjectService } from '../lib/api-client';
import { Project, ProjectStatus } from '../types/project';
import {
  Search,
  Plus,
  GitBranch,
  GitCommit,
  RefreshCw,
  ArrowRight,
  FolderGit2,
  X,
  AlertCircle,
  Menu
} from 'lucide-react';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newBranch, setNewBranch] = useState('main');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(ProjectService.getProjects());
  }, []);

  const handleRecheck = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setRecheckingId(projectId);
    setTimeout(() => {
      const updated = ProjectService.recheckProject(projectId);
      if (updated) {
        setProjects(ProjectService.getProjects());
      }
      setRecheckingId(null);
    }, 1200);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newProjectName.trim()) {
      setFormError('Please enter a project name');
      return;
    }
    if (!newRepoUrl.trim() || !newRepoUrl.startsWith('http')) {
      setFormError('Please enter a valid GitHub repository URL');
      return;
    }

    const created = ProjectService.createProject(newProjectName, newRepoUrl, newBranch, newDescription);
    setProjects(ProjectService.getProjects());
    setIsModalOpen(false);
    setNewProjectName('');
    setNewRepoUrl('');
    setNewDescription('');

    // Navigate to workspace overview of newly created project
    navigate(`/projects/${created.id}/overview`);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.repositoryUrl.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="badge-status bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] animate-pulse" />
            In progress
          </span>
        );
      case 'needs_review':
        return (
          <span className="badge-status badge-partial">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
            Needs review
          </span>
        );
      case 'completed':
        return (
          <span className="badge-status badge-verified">
            <span className="w-1.5 h-1.5 rounded-full bg-[#107E5A]" />
            Completed
          </span>
        );
    }
  };

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
        <header className="w-full px-4 sm:px-8 h-16 border-b border-[var(--border-soft)] bg-[var(--surface-card)] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold font-heading text-[var(--text-primary)]">
              Your projects
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />

            {user && (
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#DC586D] to-[#FFBB94] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
                title={user.fullName || user.email}
              >
                {user.fullName ? user.fullName[0] : 'U'}
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
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
                className="ui-input pl-10 text-xs sm:text-sm"
              />
            </div>

            {/* New Project CTA */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary text-xs sm:text-sm px-4 py-2.5"
            >
              <Plus className="w-4 h-4" />
              <span>New project</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'All Projects', count: projects.length },
              { id: 'in_progress', label: 'In Progress', count: projects.filter(p => p.status === 'in_progress').length },
              { id: 'needs_review', label: 'Needs Review', count: projects.filter(p => p.status === 'needs_review').length },
              { id: 'completed', label: 'Completed', count: projects.filter(p => p.status === 'completed').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filter === tab.id
                    ? 'bg-[var(--color-wine)] text-white dark:bg-[var(--color-rose)] shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-black/10 dark:bg-white/10 text-[var(--text-muted)]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Projects Grid */}
          {filteredProjects.length > 0 ? (
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
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-rose)]/10 text-[var(--color-rose)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <FolderGit2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--color-rose)] transition-colors">
                          {proj.name}
                        </h3>
                      </div>
                      {getStatusBadge(proj.status)}
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>

                    {/* Validation Health Metric */}
                    {proj.latestReport && proj.latestReport.summary.total_claims > 0 && (
                      <div className="flex flex-col gap-2 py-2.5 px-3 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] mt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[var(--text-secondary)]">Verification Audit</span>
                          <span className="font-mono font-bold text-[#107E5A]">
                            {proj.latestReport.summary.verified_count} / {proj.latestReport.summary.total_claims} Verified
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="h-full bg-[#107E5A]"
                            style={{
                              width: `${(proj.latestReport.summary.verified_count / proj.latestReport.summary.total_claims) * 100}%`
                            }}
                            title={`${proj.latestReport.summary.verified_count} Verified`}
                          />
                          <div
                            className="h-full bg-[#B45309]"
                            style={{
                              width: `${(proj.latestReport.summary.partially_verified_count / proj.latestReport.summary.total_claims) * 100}%`
                            }}
                            title={`${proj.latestReport.summary.partially_verified_count} Partially Verified`}
                          />
                          <div
                            className="h-full bg-[#C52243]"
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
                          <GitBranch className="w-3.5 h-3.5 text-[var(--color-rose)]" />
                          <span>{proj.branch}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <GitCommit className="w-3.5 h-3.5 text-[#FFBB94]" />
                          <span>{proj.commitSha}</span>
                        </span>
                      </div>

                      {/* Recheck & Open Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleRecheck(e, proj.id)}
                          disabled={recheckingId === proj.id}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Recheck against repository head"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              recheckingId === proj.id ? 'animate-spin text-[var(--color-rose)]' : ''
                            }`}
                          />
                        </button>
                        <span className="text-[var(--color-rose)] group-hover:translate-x-0.5 transition-transform">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Friendly Empty State */
            <div className="ui-card p-12 text-center flex flex-col items-center justify-center gap-4 my-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-rose)]/10 text-[var(--color-rose)] flex items-center justify-center">
                <FolderGit2 className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  No projects found
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {search
                    ? `No projects matching "${search}". Try adjusting your search or filters.`
                    : 'Add your first project repository to run deterministic AST evidence validation.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary text-xs sm:text-sm px-5 py-2.5 mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add your first project</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg ui-card-elevated p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-rose)]/15 text-[var(--color-rose)]">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Add new project
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Connect a repository for AST validation
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
              <div className="mt-4 p-3 rounded-xl bg-[#C52243]/10 border border-[#C52243]/30 text-xs text-[#C52243] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Project name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme SaaS Core"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="ui-input text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  GitHub repository URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="ui-input text-xs sm:text-sm font-mono"
                  required
                />
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
                    className="ui-input text-xs sm:text-sm"
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
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs sm:text-sm"
                >
                  Create & Analyze
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
