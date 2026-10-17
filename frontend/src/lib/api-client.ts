import { Project, ProjectStatus } from '../types/project';
import {
  ProjectReport,
  ClaimValidation,
  ClaimStatus,
  EvidenceReference,
  RoadmapTask,
  EvidenceGraphData,
  GraphNode,
  GraphEdge
} from '../types/report';
import { SupabaseService } from './supabase-service';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://valgent.onrender.com/api/v1';

export interface ApiError {
  code: string;
  message: string;
  stage?: string;
  retryable?: boolean;
  details?: string[];
  statusCode?: number;
}

export interface AnalysisOptions {
  skip_llm?: boolean;
  skip_execution?: boolean;
  timeout_ms?: number;
}

export interface ExecutionPolicy {
  allow_install?: boolean;
  allow_build?: boolean;
  allow_tests?: boolean;
  timeout_ms?: number;
  memory_limit_mb?: number;
}

export interface LLMPolicy {
  preferred_providers?: string[];
  timeout_ms?: number;
}

export interface AnalyzePayload {
  repository_url: string;
  commit_sha?: string;
  project_id?: string;
  claims?: Array<{ claim_id: string; text: string }>;
  analysis_options?: AnalysisOptions;
  execution_policy?: ExecutionPolicy;
  llm_policy?: LLMPolicy;
}

export type AnalysisResult =
  | { success: true; analysisId: string; report: ProjectReport }
  | { success: false; error: ApiError };

export interface ProjectsFetchResult {
  projects: Project[];
  isOfflineFallback: boolean;
  serverError?: string;
}

// ---------------------------------------------------------------------------
// Isolated Reference Fixtures (Used strictly when backend server is offline)
// ---------------------------------------------------------------------------

export const DEMO_FIXTURES: Project[] = [];

// ---------------------------------------------------------------------------
// Normalization Engine: Real Backend Payload -> Clean Frontend Model
// ---------------------------------------------------------------------------

export function normalizeBackendReport(raw: any, repoUrl: string): ProjectReport {
  // Normalize Claims & Requirements
  const rawList = raw.claims || raw.requirements || [];
  const rawEvidence = Array.isArray(raw.evidence) ? raw.evidence : [];

  const claims: ClaimValidation[] = rawList.map((c: any, i: number) => {
    const rawStatus = String(c.status || '').toUpperCase();
    let status: ClaimStatus = 'INSUFFICIENT_EVIDENCE';
    if (rawStatus === 'VERIFIED') status = 'VERIFIED';
    else if (rawStatus === 'PARTIALLY_VERIFIED') status = 'PARTIALLY_VERIFIED';
    else if (rawStatus === 'NOT_VERIFIED') status = 'NOT_VERIFIED';
    else if (rawStatus === 'INSUFFICIENT_EVIDENCE') status = 'INSUFFICIENT_EVIDENCE';

    const evidenceRefs: string[] = c.evidence_refs || c.evidence_ids || [];
    const matchedEvidence: EvidenceReference[] = rawEvidence
      .filter((e: any) => evidenceRefs.includes(e.evidence_id))
      .map((e: any) => ({
        evidence_id: e.evidence_id,
        source: e.source || 'TypeScript AST',
        path: e.path || 'unknown',
        line_start: e.line_start,
        line_end: e.line_end,
        snippet: e.snippet || '',
        classification: e.classification || 'IMPLEMENTATION',
        description: e.description || e.name || 'Source evidence citation',
      }));

    return {
      claim_id: c.claim_id || `CLM-0${i + 1}`,
      text: c.text || c.claim_text || c.claim_id || 'Verification requirement',
      status,
      reason: c.conclusion || c.reason || c.explanation || 'Determined through deterministic AST and evidence audit.',
      evidence_ids: evidenceRefs,
      evidence_items: (c.evidence_items && c.evidence_items.length > 0) ? c.evidence_items : matchedEvidence,
      limitations: Array.isArray(c.limitations) ? c.limitations : undefined,
      contradictions: Array.isArray(c.contradictions) ? c.contradictions : undefined,
      recommended_actions: Array.isArray(c.recommended_actions) ? c.recommended_actions : undefined,
      build_outcome: c.build_outcome || (c.telemetry?.build_status ? `Build: ${c.telemetry.build_status}` : undefined),
      test_outcome: c.test_outcome || (c.telemetry?.test_status ? `Tests: ${c.telemetry.test_status}` : undefined),
    };
  });

  // Construct Evidence Graph (handling backend evidence_graph or cached graph)
  const rawNodes = raw.evidence_graph?.nodes || raw.graph?.nodes || [];
  const nodes: GraphNode[] = rawNodes.map((n: any) => ({
    id: n.id || `node-${Math.random().toString(36).substring(2, 6)}`,
    type: n.type || 'symbol',
    label: n.label || n.id || 'Node',
    sublabel: n.sublabel || n.metadata?.path || n.metadata?.source || '',
    status: n.status,
    metadata: n.metadata || {}
  }));

  const rawEdges = raw.evidence_graph?.edges || raw.graph?.edges || [];
  const edges: GraphEdge[] = rawEdges.map((e: any, i: number) => ({
    id: e.id || e.edge_id || `edge-${i}`,
    source: e.source || e.from || '',
    target: e.target || e.to || '',
    relation: e.relation || e.type || 'verified_by'
  }));

  // Construct Remediation Roadmap
  const rawRoadmap = Array.isArray(raw.roadmap) ? raw.roadmap : [];
  const roadmap: RoadmapTask[] = rawRoadmap.map((r: any, i: number) => ({
    id: r.id || r.task_id || `TASK-0${i + 1}`,
    task_id: r.task_id,
    claim_id: r.claim_id || r.related_claim,
    title: r.title || 'Remediation task',
    problem: r.problem || 'Evidence gap identified during verification',
    priority: r.priority || 'MEDIUM',
    evidence_refs: Array.isArray(r.evidence_refs) ? r.evidence_refs : [],
    recommended_actions: Array.isArray(r.recommended_actions) ? r.recommended_actions : [],
    acceptance_criteria: Array.isArray(r.acceptance_criteria) ? r.acceptance_criteria : [],
    status: r.status || 'PENDING'
  }));

  let reportStatus: 'COMPLETED' | 'DEGRADED' | 'FAILED' | 'INSUFFICIENT_EVIDENCE' = 'COMPLETED';
  const rawAnalysisStatus = raw.analysis?.status;
  if (rawAnalysisStatus === 'FAILED') reportStatus = 'FAILED';
  else if (rawAnalysisStatus === 'INSUFFICIENT_EVIDENCE') reportStatus = 'INSUFFICIENT_EVIDENCE';
  else if (rawAnalysisStatus === 'DEGRADED') reportStatus = 'DEGRADED';

  return {
    schema_version: raw.schema_version || '1.0',
    analysis_run_id: raw.analysis_run_id || raw.analysis?.analysis_id || 'run_' + Math.random().toString(36).substring(2, 9),
    project_id: raw.project?.id || 'proj-valgent',
    repository_url: repoUrl,
    commit_sha: raw.project?.repository_commit || raw.commit_sha || 'head',
    branch: raw.branch || 'main',
    timestamp: raw.analysis?.completed_at || raw.timestamp || new Date().toISOString(),
    duration_ms: raw.analysis?.duration_ms || raw.duration_ms || 0,
    status: reportStatus,
    summary: {
      total_claims: raw.summary?.total_claims ?? raw.summary?.claims_total ?? claims.length,
      verified_count: raw.summary?.verified_count ?? raw.summary?.verified ?? claims.filter((c) => c.status === 'VERIFIED').length,
      partially_verified_count: raw.summary?.partially_verified_count ?? raw.summary?.partially_verified ?? claims.filter((c) => c.status === 'PARTIALLY_VERIFIED').length,
      not_verified_count: raw.summary?.not_verified_count ?? raw.summary?.not_verified ?? claims.filter((c) => c.status === 'NOT_VERIFIED').length,
      insufficient_evidence_count: raw.summary?.insufficient_evidence_count ?? raw.summary?.insufficient_evidence ?? claims.filter((c) => c.status === 'INSUFFICIENT_EVIDENCE').length,
    },
    claims,
    evidence: rawEvidence,
    graph: { nodes, edges },
    roadmap,
    architecture: {
      components: raw.project?.architecture?.components || [],
      entry_points: raw.project?.architecture?.entry_points || [],
      api_routes: raw.project?.architecture?.api_routes || [],
      databases: raw.project?.architecture?.databases || [],
    },
    diagnostics: {
      warnings: raw.diagnostics?.warnings || [],
      errors: raw.diagnostics?.errors || [],
      provider_info: raw.llm?.provider || raw.diagnostics?.provider_info || 'Deterministic AST + LLM Router',
    }
  };
}

// ---------------------------------------------------------------------------
// ProjectService: Real API Endpoints with Isolated Offline Demo Fallback
// ---------------------------------------------------------------------------

function getCurrentUserId(): string | undefined {
  try {
    const raw = localStorage.getItem('valgent-auth-user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export const ProjectService = {
  /**
   * Fetch all projects from the backend server for current user.
   * If server is offline, returns cached projects and sets isOfflineFallback=true.
   */
  async getProjects(ownerId?: string): Promise<ProjectsFetchResult> {
    const userId = ownerId || getCurrentUserId();
    const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';

    // 1. Direct Supabase Query (when authenticated)
    if (userId) {
      try {
        const supaProjects = await SupabaseService.getProjects(userId);
        if (supaProjects !== null) {
          const cleanProjects = supaProjects.filter(
            p => !['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(p.id)
          );
          localStorage.setItem(cacheKey, JSON.stringify(cleanProjects));
          return {
            projects: cleanProjects,
            isOfflineFallback: false,
          };
        }
      } catch (e) {
        console.warn('[ProjectService] Supabase direct query skipped, falling back to API:', e);
      }
    }

    // 2. Valgent Backend API Fallback
    try {
      const url = userId ? `${API_BASE_URL}/projects?ownerId=${encodeURIComponent(userId)}` : `${API_BASE_URL}/projects`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawList = Array.isArray(data.projects) ? data.projects : [];

      const serverProjects: Project[] = rawList
        .filter((p: any) => !['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          repositoryUrl: p.repositoryUrl,
          branch: p.branch || 'main',
          commitSha: p.commitSha || 'latest',
          status: (p.status as ProjectStatus) || 'in_progress',
          lastAnalyzedAt: p.lastAnalyzedAt || p.updatedAt || p.createdAt,
          createdAt: p.createdAt,
          ownerId: p.ownerId || userId || 'default',
          latestReport: p.latestReport ? normalizeBackendReport(p.latestReport, p.repositoryUrl) : undefined,
        }));

      localStorage.setItem(cacheKey, JSON.stringify(serverProjects));

      return {
        projects: serverProjects,
        isOfflineFallback: false,
      };
    } catch (err: any) {
      console.warn('[ProjectService] Backend unreachable, checking offline cache:', err?.message);

      const cached = localStorage.getItem(cacheKey);
      let fallbackList: Project[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          fallbackList = (Array.isArray(parsed) ? parsed : []).filter(
            (p: Project) => !['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(p.id)
          );
        } catch {
          fallbackList = [];
        }
      }

      return {
        projects: fallbackList,
        isOfflineFallback: true,
        serverError: err?.message || 'Connection refused',
      };
    }
  },

  /**
   * Fetch a single project by ID from backend or Supabase.
   */
  async getProjectById(id: string, ownerId?: string): Promise<Project | null> {
    if (['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(id)) {
      return null;
    }
    const userId = ownerId || getCurrentUserId();
    const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';

    // 1. Direct Supabase Query
    if (userId) {
      try {
        const supaProject = await SupabaseService.getProjectById(id, userId);
        if (supaProject && !['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(supaProject.id)) {
          return supaProject;
        }
      } catch {
        // Continue to backend fallback
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
      });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const p = await res.json();
      if (['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(p.id)) {
        return null;
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        repositoryUrl: p.repositoryUrl,
        branch: p.branch || 'main',
        commitSha: p.commitSha || 'latest',
        status: (p.status as ProjectStatus) || 'in_progress',
        lastAnalyzedAt: p.lastAnalyzedAt || p.updatedAt || p.createdAt,
        createdAt: p.createdAt,
        ownerId: p.ownerId || userId || 'default',
        latestReport: p.latestReport ? normalizeBackendReport(p.latestReport, p.repositoryUrl) : undefined,
      };
    } catch {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const list: Project[] = JSON.parse(cached);
          return list.find((p: Project) => p.id === id && !['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(p.id)) || null;
        } catch {
          return null;
        }
      }
      return null;
    }
  },

  /**
   * Create a project via real POST /api/v1/projects and sync to Supabase.
   */
  async createProject(name: string, repositoryUrl: string, branch = 'main', description = '', ownerId?: string): Promise<Project> {
    if (!name.trim()) {
      throw new Error('Project name is required');
    }
    if (!repositoryUrl.trim()) {
      throw new Error('Repository URL is required');
    }
    const userId = ownerId || getCurrentUserId();
    const projectId = `proj-${crypto.randomUUID().substring(0, 8)}`;

    let supaCreated: Project | null = null;
    let supaError: string | null = null;
    if (userId) {
      try {
        supaCreated = await SupabaseService.createProject({
          id: projectId,
          name: name.trim(),
          repositoryUrl: repositoryUrl.trim(),
          branch: branch.trim() || 'main',
          description: description.trim(),
          ownerId: userId,
        });
      } catch (err: any) {
        supaError = err?.message || 'Database error';
        console.warn('[ProjectService] Supabase createProject warning:', err);
      }
    }

    let backendError: string | null = null;
    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify({
          id: supaCreated ? supaCreated.id : projectId,
          name: name.trim(),
          repositoryUrl: repositoryUrl.trim(),
          branch: branch.trim() || 'main',
          description: description.trim(),
          ownerId: userId || 'default',
        }),
      });

      if (res.ok) {
        const p = await res.json();
        const createdProject: Project = {
          id: p.id,
          name: p.name,
          description: p.description || '',
          repositoryUrl: p.repositoryUrl,
          branch: p.branch || 'main',
          commitSha: p.commitSha || 'initial',
          status: (p.status as ProjectStatus) || 'in_progress',
          lastAnalyzedAt: p.lastAnalyzedAt || p.createdAt,
          createdAt: p.createdAt,
          ownerId: p.ownerId || userId || 'default',
        };

        const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';
        const cached = localStorage.getItem(cacheKey);
        const list: Project[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem(cacheKey, JSON.stringify([createdProject, ...list]));

        return createdProject;
      } else {
        const errJson = await res.json().catch(() => null);
        backendError = errJson?.error || errJson?.details || `HTTP ${res.status}`;
        console.warn('[ProjectService] Backend register error:', backendError);
      }
    } catch (err: any) {
      backendError = err?.message || 'Backend connection failed';
      console.warn('[ProjectService] Backend register network warning:', err);
    }

    if (supaCreated) {
      return supaCreated;
    }

    // Offline fallback: if backend and Supabase are temporarily unreachable, store locally
    try {
      const offlineProject: Project = {
        id: projectId,
        name: name.trim(),
        description: description.trim(),
        repositoryUrl: repositoryUrl.trim(),
        branch: branch.trim() || 'main',
        commitSha: 'initial',
        status: 'in_progress',
        lastAnalyzedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ownerId: userId || 'default',
      };
      const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';
      const cached = localStorage.getItem(cacheKey);
      const list: Project[] = cached ? JSON.parse(cached) : [];
      localStorage.setItem(cacheKey, JSON.stringify([offlineProject, ...list]));
      console.info('[ProjectService] Created project in offline local cache:', offlineProject.id);
      return offlineProject;
    } catch {
      throw new Error(`Failed to create project: ${backendError || supaError || 'Server unreachable'}`);
    }
  },

  /**
   * Update project fields via PATCH /api/v1/projects/:id and Supabase.
   */
  async updateProject(
    id: string,
    patch: Partial<{ name: string; description: string; branch: string; status: ProjectStatus; repositoryUrl: string; latestReport: ProjectReport }>,
    ownerId?: string
  ): Promise<Project> {
    const userId = ownerId || getCurrentUserId();

    // 1. Update in Supabase if authenticated
    if (userId) {
      try {
        await SupabaseService.updateProject(id, patch);
      } catch (err) {
        console.warn('[ProjectService] Supabase updateProject warning:', err);
      }
    }

    // 2. Update in Backend
    let backendProject: Project | null = null;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify(patch),
      });

      if (res.ok) {
        const p = await res.json();
        backendProject = {
          id: p.id,
          name: p.name,
          description: p.description || '',
          repositoryUrl: p.repositoryUrl,
          branch: p.branch || 'main',
          commitSha: p.commitSha || 'latest',
          status: (p.status as ProjectStatus) || 'in_progress',
          lastAnalyzedAt: p.lastAnalyzedAt || p.updatedAt,
          createdAt: p.createdAt,
          ownerId: p.ownerId || userId || 'default',
          latestReport: p.latestReport ? normalizeBackendReport(p.latestReport, p.repositoryUrl) : undefined,
        };
      }
    } catch (err) {
      console.warn('[ProjectService] Backend updateProject warning:', err);
    }

    // Update in local cache
    const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const list: Project[] = JSON.parse(cached);
        const updatedList = list.map(p => p.id === id ? { ...p, ...patch } : p);
        localStorage.setItem(cacheKey, JSON.stringify(updatedList));
      } catch {
        // ignore
      }
    }

    if (backendProject) return backendProject;

    const existing = await this.getProjectById(id, userId);
    if (existing) {
      return {
        ...existing,
        ...patch,
      };
    }

    throw new Error('Failed to update project');
  },

  /**
   * Delete project via real DELETE /api/v1/projects/:id and Supabase.
   */
  async deleteProject(id: string, ownerId?: string): Promise<boolean> {
    const userId = ownerId || getCurrentUserId();
    const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';

    if (userId) {
      try {
        await SupabaseService.deleteProject(id);
      } catch (err) {
        console.warn('[ProjectService] Supabase deleteProject warning:', err);
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
      });

      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete project (HTTP ${res.status})`);
      }
    } catch (err) {
      console.warn('[ProjectService] Backend delete warning:', err);
    }

    // Clean up local cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const list: Project[] = JSON.parse(cached);
        const filtered = list.filter((p) => p.id !== id);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }

    if (localStorage.getItem('valgent-last-active-project-id') === id) {
      localStorage.removeItem('valgent-last-active-project-id');
    }

    return true;
  },

  /**
   * Execute real POST /api/v1/analyze.
   * NEVER substitutes a fabricated report on error.
   */
  async analyze(payload: AnalyzePayload, ownerId?: string): Promise<AnalysisResult> {
    // Validate repository URL
    if (!payload.repository_url || !payload.repository_url.startsWith('http')) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'A valid public repository URL (http/https) is required.',
          stage: 'VALIDATION',
          retryable: false,
        },
      };
    }

    const userId = ownerId || getCurrentUserId();

    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify({
          repository_url: payload.repository_url,
          commit_sha: payload.commit_sha || undefined,
          project_id: payload.project_id || undefined,
          owner_id: userId,
          claims: payload.claims && payload.claims.length > 0 ? payload.claims : undefined,
          analysis_options: payload.analysis_options,
          execution_policy: payload.execution_policy,
          llm_policy: payload.llm_policy,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const backendError = data?.error;
        return {
          success: false,
          error: {
            code: backendError?.code || `HTTP_${res.status}`,
            message: backendError?.message || `Analysis failed with HTTP status ${res.status}`,
            stage: backendError?.stage || 'UNKNOWN',
            retryable: backendError?.retryable ?? false,
            details: backendError?.details || [],
            statusCode: res.status,
          },
        };
      }

      if (!data?.report) {
        return {
          success: false,
          error: {
            code: 'MALFORMED_RESPONSE',
            message: 'Server returned a success status but report payload was missing.',
            stage: 'RESPONSE_PARSING',
            retryable: true,
            statusCode: res.status,
          },
        };
      }

      const normalizedReport = normalizeBackendReport(data.report, payload.repository_url);

      // If project_id provided, update offline cache for session persistence
      if (payload.project_id) {
        const cached = localStorage.getItem('valgent-server-projects-cache');
        if (cached) {
          try {
            const list: Project[] = JSON.parse(cached);
            const idx = list.findIndex((p) => p.id === payload.project_id);
            if (idx !== -1) {
              list[idx].latestReport = normalizedReport;
              list[idx].lastAnalyzedAt = normalizedReport.timestamp;
              list[idx].status = 'completed';
              localStorage.setItem('valgent-server-projects-cache', JSON.stringify(list));
            }
          } catch {
            // ignore
          }
        }
      }

      return {
        success: true,
        analysisId: data.analysis_id || normalizedReport.analysis_run_id,
        report: normalizedReport,
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Unable to connect to Valgent verification backend (${API_BASE_URL}). Please verify the backend service is running.`,
          stage: 'NETWORK_TRANSPORT',
          retryable: true,
          details: [err?.message || 'Network request failed'],
          statusCode: 0,
        },
      };
    }
  },

  /**
   * Fetch analysis run status if polling is needed.
   */
  async getAnalysisStatus(analysisId: string): Promise<{ status: string; stage: string; error?: any } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/analyses/${analysisId}/status`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Fetch persistent reports for a project.
   */
  async getProjectReports(projectId: string): Promise<ProjectReport[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/reports`);
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data.reports) ? data.reports : [];
      return list.map((r: any) => normalizeBackendReport(r, ''));
    } catch {
      return [];
    }
  },
};
