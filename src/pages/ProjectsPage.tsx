import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { ProjectService } from '../lib/api-client';
import { Project, ProjectStatus } from '../types/project';
import { Search, Plus, GitBranch, GitCommit, ExternalLink, RefreshCw, ArrowRight, FolderGit2, X, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] animate-pulse" />
            In progress
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
            Needs review
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#107E5A]/10 text-[#107E5A] border border-[#107E5A]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#107E5A]" />
            Completed
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex relative z-10">
      {/* Sidebar with EXACT required order & NO upgrade card */}
      <AppSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border-soft)]">
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
              Your projects
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Pick up where you left off.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>New project</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 text-xs"
            />
          </div>

          {/* Status Filter Tabs matching mockup screen 03 */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {[
              { id: 'all', label: `All (${projects.length})` },
              { id: 'in_progress', label: 'In progress' },
              { id: 'needs_review', label: 'Needs review' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-gradient-to-r from-[#DC586D] to-[#A33757] text-white shadow-sm font-bold'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:bg-black/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Cards List */}
        <div className="flex flex-col gap-4">
          {filteredProjects.map((project) => {
            const isRechecking = recheckingId === project.id;
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/overview`)}
                className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-lg transition-all cursor-pointer group"
              >
                {/* Project Avatar & Info */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FB9590]/40 via-[#DC586D]/40 to-[#A33757]/40 border border-[#DC586D]/30 flex items-center justify-center text-[#DC586D] flex-shrink-0 group-hover:scale-105 transition-transform">
                    <FolderGit2 className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--color-rose)] transition-colors">
                        {project.name}
                      </h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                      {project.description}
                    </p>

                    {/* Meta info: repo, branch, commit */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1 font-mono">
                      <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                        <ExternalLink className="w-3 h-3 text-[#DC586D]" />
                        {project.repositoryUrl.replace('https://', '')}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-[#FFBB94]" />
                        {project.branch}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3" />
                        {project.commitSha}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={(e) => handleRecheck(e, project.id)}
                    disabled={isRechecking}
                    className="btn-secondary text-xs"
                    title="Recheck analysis"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                    <span>{isRechecking ? 'Rechecking...' : 'Recheck'}</span>
                  </button>

                  <button
                    onClick={() => navigate(`/projects/${project.id}/overview`)}
                    className="btn-primary text-xs"
                  >
                    <span>Open workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Your First Project Card (matching mockup 03) */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl border-2 border-dashed border-[var(--border-soft)] hover:border-[#DC586D] p-6 flex items-center gap-4 cursor-pointer transition-all bg-black/[0.01] dark:bg-white/[0.01] hover:bg-[#DC586D]/5 group"
          >
            <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#DC586D] group-hover:bg-[#DC586D] group-hover:text-white transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Add another project
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                Connect your GitHub repository, upload documents or add claims to start validation.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg glass-panel-strong p-8 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  Add New Project
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Link a GitHub repository to run AST validation
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="my-4 p-3 rounded-xl bg-[#C52243]/10 border border-[#C52243]/30 text-xs text-[#C52243] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Project name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. HealthSync AI"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  GitHub repository URL *
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/organization/repo"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Default branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short summary of project features"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Create & Open Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
