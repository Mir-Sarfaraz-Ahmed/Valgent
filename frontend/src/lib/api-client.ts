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

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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

function buildReferenceDemoReport(
  projId: string,
  _name: string,
  repoUrl: string,
  commitSha: string
): ProjectReport {
  const claims: ClaimValidation[] = [
    {
      claim_id: 'CLM-01',
      text: 'Google sign-in and OAuth authentication is implemented',
      status: 'VERIFIED',
      reason: 'Found Supabase Google OAuth integration in src/lib/supabase.ts and src/context/AuthContext.tsx with redirect handling.',
      evidence_ids: ['EVD-01', 'EVD-02'],
      evidence_items: [
        {
          evidence_id: 'EVD-01',
          source: 'TypeScript Semantic AST',
          path: 'src/lib/supabase.ts',
          line_start: 7,
          line_end: 18,
          snippet: 'export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { detectSessionInUrl: true } });',
          classification: 'IMPLEMENTATION',
          description: 'Supabase client instantiation with OAuth redirect session detection enabled.',
        },
        {
          evidence_id: 'EVD-02',
          source: 'TypeScript Semantic AST',
          path: 'src/context/AuthContext.tsx',
          line_start: 95,
          line_end: 110,
          snippet: 'await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ... } });',
          classification: 'IMPLEMENTATION',
          description: 'Google OAuth provider dispatch method with explicit redirect callback.',
        },
      ],
      recommended_actions: ['Configure Google Cloud Console OAuth consent screen callback origins for production deployment.']
    },
    {
      claim_id: 'CLM-02',
      text: 'REST API routes for project analysis are detected',
      status: 'VERIFIED',
      reason: 'Router endpoints found for /health and /api/v1/analyze matching Express router specifications.',
      evidence_ids: ['EVD-03'],
      evidence_items: [
        {
          evidence_id: 'EVD-03',
          source: 'Route Extraction',
          path: 'src/api/routes.ts',
          line_start: 60,
          line_end: 105,
          snippet: 'router.post("/analyze", async (req: Request, res: Response) => { ... });',
          classification: 'API_ROUTE',
          description: 'Express POST /analyze route definition with Zod schema verification.',
        },
      ],
      recommended_actions: ['Implement rate-limiting middleware on the /analyze endpoint to prevent denial-of-service.']
    },
    {
      claim_id: 'CLM-03',
      text: 'Payment gateway integration with Stripe or Razorpay',
      status: 'NOT_VERIFIED',
      reason: 'No payment SDKs or checkout webhook handlers detected in dependencies or codebase AST.',
      evidence_ids: ['EVD-04'],
      evidence_items: [
        {
          evidence_id: 'EVD-04',
          source: 'Dependency & Symbol Scan',
          path: 'package.json',
          line_start: 17,
          line_end: 25,
          snippet: 'dependencies: { "@google/genai", "dotenv", "express", "zod" }',
          classification: 'MISSING_DEPENDENCY',
          description: 'Stripe, Razorpay, or payment webhooks absent from package manifest and source tree.',
        },
      ],
      contradictions: ['README mentions paid tiers, but payment processing modules are non-existent.'],
      recommended_actions: [
        'Install @stripe/stripe-js and stripe package',
        'Create POST /api/v1/checkout session route',
        'Implement webhook signature validation endpoint'
      ]
    },
    {
      claim_id: 'CLM-04',
      text: 'Build and tests pass without errors in sandbox',
      status: 'PARTIALLY_VERIFIED',
      reason: 'TypeScript compilation succeeds; unit tests pass, but sandbox Docker execution was skipped in local policy.',
      evidence_ids: ['EVD-05', 'EVD-06'],
      evidence_items: [
        {
          evidence_id: 'EVD-05',
          source: 'Jest Test Runner',
          path: 'tests/validation.test.ts',
          line_start: 1,
          line_end: 50,
          snippet: 'PASS tests/validation.test.ts (14 tests passed, 0 failed)',
          classification: 'TEST_EXECUTION',
          description: 'Jest execution telemetry confirmed 14 passing validation assertions.',
        },
        {
          evidence_id: 'EVD-06',
          source: 'Docker Sandbox Telemetry',
          path: 'src/sandbox/docker.ts',
          snippet: 'Container launch skipped: execution_policy.allow_sandbox set to false in local run.',
          classification: 'EXECUTION_SKIPPED',
          description: 'Live containerized test execution was skipped per local safety policy.',
        },
      ],
      limitations: ['Sandbox container was not launched; tests verified in host environment only.'],
      recommended_actions: [
        'Set execution_policy.allow_build: true in analysis options',
        'Ensure Docker daemon is reachable on analysis worker'
      ]
    },
    {
      claim_id: 'CLM-05',
      text: 'Responsive design and Night Mode theme toggling',
      status: 'VERIFIED',
      reason: 'ThemeContext, CSS variables for dark theme, and mobile viewport responsive breakpoints confirmed.',
      evidence_ids: ['EVD-07'],
      evidence_items: [
        {
          evidence_id: 'EVD-07',
          source: 'CSS & DOM Parser',
          path: 'src/index.css',
          line_start: 35,
          line_end: 75,
          snippet: '[data-theme="dark"] { --surface-page: #120711; --text-primary: #FDEBF0; ... }',
          classification: 'UI_THEME',
          description: 'Dark theme variables and ThemeToggle button integrated across layout headers.',
        },
      ],
      recommended_actions: ['Ensure color contrast meets WCAG AAA standards on high-contrast displays.']
    },
  ];

  const evidence: EvidenceReference[] = claims.flatMap((c) => c.evidence_items || []);

  const roadmap: RoadmapTask[] = [
    {
      id: 'TASK-01',
      claim_id: 'CLM-03',
      title: 'Add payment gateway integration',
      problem: 'README promises commercial checkout, but no payment provider SDK or webhooks are present.',
      priority: 'HIGH',
      evidence_refs: ['EVD-04'],
      recommended_actions: [
        'Install @stripe/stripe-js and stripe package',
        'Create POST /api/v1/checkout session route',
        'Implement webhook signature validation endpoint',
      ],
      acceptance_criteria: [
        'Checkout endpoint creates verified session ID',
        'Webhook listener safely updates project subscription state',
      ],
      status: 'PENDING',
    },
    {
      id: 'TASK-02',
      claim_id: 'CLM-04',
      title: 'Enable isolated Docker sandbox verification',
      problem: 'Build tests passed on host, but isolated container execution was skipped.',
      priority: 'MEDIUM',
      evidence_refs: ['EVD-06'],
      recommended_actions: [
        'Set execution_policy.allow_build: true in analysis options',
        'Ensure Docker daemon is reachable on analysis worker',
      ],
      acceptance_criteria: [
        'Docker container executes tests with read-only root and PID limits',
      ],
      status: 'IN_PROGRESS',
    },
    {
      id: 'TASK-03',
      title: 'Configure CI/CD automated validation workflow',
      problem: 'No GitHub Actions workflow found under .github/workflows for automated pull request checks.',
      priority: 'MEDIUM',
      evidence_refs: [],
      recommended_actions: [
        'Add .github/workflows/valgent-verify.yml',
        'Run lint, build, and test steps on push to main branch',
      ],
      acceptance_criteria: [
        'GitHub Actions status badge returns passing on repository head',
      ],
      status: 'PENDING',
    },
    {
      id: 'TASK-04',
      title: 'Add production environment variables configuration',
      problem: 'Only sample development values exist; production secrets manager setup is undocumented.',
      priority: 'LOW',
      evidence_refs: [],
      recommended_actions: [
        'Document required production secrets in backend deployment guide',
        'Configure Doppler or GCP Secret Manager for API keys',
      ],
      acceptance_criteria: [
        'Health check verifies presence of production secrets without leaking values',
      ],
      status: 'PENDING',
    },
  ];

  const graph: EvidenceGraphData = {
    nodes: [
      { id: 'node-clm-1', type: 'claim', label: 'Google Auth', status: 'VERIFIED' },
      { id: 'node-clm-2', type: 'claim', label: 'API Routes', status: 'VERIFIED' },
      { id: 'node-clm-3', type: 'claim', label: 'Payment Gateway', status: 'NOT_VERIFIED' },
      { id: 'node-clm-4', type: 'claim', label: 'Sandbox Execution', status: 'PARTIALLY_VERIFIED' },
      { id: 'node-clm-5', type: 'claim', label: 'Night Mode Theme', status: 'VERIFIED' },
      { id: 'node-evd-1', type: 'symbol', label: 'supabase.ts', sublabel: 'src/lib/supabase.ts' },
      { id: 'node-evd-2', type: 'symbol', label: 'AuthContext.tsx', sublabel: 'src/context/AuthContext.tsx' },
      { id: 'node-evd-3', type: 'route', label: 'POST /analyze', sublabel: 'src/api/routes.ts' },
      { id: 'node-evd-4', type: 'evidence', label: 'package.json', sublabel: 'No payment dependencies' },
      { id: 'node-evd-5', type: 'execution', label: 'Jest Test Runner', sublabel: '14 tests passed' },
    ],
    edges: [
      { id: 'edge-1', source: 'node-clm-1', target: 'node-evd-1', relation: 'verified_by' },
      { id: 'edge-2', source: 'node-clm-1', target: 'node-evd-2', relation: 'verified_by' },
      { id: 'edge-3', source: 'node-clm-2', target: 'node-evd-3', relation: 'verified_by' },
      { id: 'edge-4', source: 'node-clm-3', target: 'node-evd-4', relation: 'contradicted_by' },
      { id: 'edge-5', source: 'node-clm-4', target: 'node-evd-5', relation: 'supported_by' },
    ],
  };

  return {
    schema_version: '1.0.0',
    analysis_run_id: 'run_' + Math.random().toString(36).substring(2, 9),
    project_id: projId,
    repository_url: repoUrl,
    commit_sha: commitSha,
    branch: 'main',
    timestamp: new Date().toISOString(),
    duration_ms: 14250,
    status: 'COMPLETED',
    summary: {
      total_claims: 5,
      verified_count: 3,
      partially_verified_count: 1,
      not_verified_count: 1,
      insufficient_evidence_count: 0,
    },
    claims,
    evidence,
    graph,
    roadmap,
    architecture: {
      components: ['AuthContext', 'AnalyzePipeline', 'EvidenceGraph', 'ThemeToggle'],
      entry_points: ['src/index.ts', 'src/main.tsx'],
      api_routes: ['GET /health', 'POST /api/v1/analyze'],
      databases: ['Supabase Auth & PostgreSQL Session Store'],
    },
    diagnostics: {
      warnings: ['Docker container isolation was skipped for local verification run.'],
      errors: [],
      provider_info: 'Gemini 3.8 Flash + Static TypeScript Compiler AST',
    },
  };
}

export const DEMO_FIXTURES: Project[] = [
  {
    id: 'proj-valgent-demo',
    name: 'Valgent Demo',
    description: 'AI-powered project validation platform with AST semantic analysis',
    repositoryUrl: 'https://github.com/valgent/demo',
    branch: 'main',
    commitSha: '9f2a1c7',
    status: 'in_progress',
    lastAnalyzedAt: '2026-10-11T14:30:00Z',
    createdAt: '2026-10-10T10:00:00Z',
    ownerId: 'default',
    latestReport: buildReferenceDemoReport('proj-valgent-demo', 'Valgent Demo', 'https://github.com/valgent/demo', '9f2a1c7'),
  },
  {
    id: 'proj-civicpulse-ai',
    name: 'CivicPulse AI',
    description: 'Civic engagement and feedback platform for municipal transparency',
    repositoryUrl: 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git',
    branch: 'main',
    commitSha: 'a3c7e9d',
    status: 'needs_review',
    lastAnalyzedAt: '2026-10-10T18:15:00Z',
    createdAt: '2026-10-09T08:00:00Z',
    ownerId: 'default',
    latestReport: buildReferenceDemoReport('proj-civicpulse-ai', 'CivicPulse AI', 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git', 'a3c7e9d'),
  },
  {
    id: 'proj-campusconnect',
    name: 'CampusConnect',
    description: 'Student community and event platform with peer tutoring',
    repositoryUrl: 'https://github.com/campus/connect',
    branch: 'dev',
    commitSha: '5b8d2f1',
    status: 'completed',
    lastAnalyzedAt: '2026-10-09T11:20:00Z',
    createdAt: '2026-10-08T12:00:00Z',
    ownerId: 'default',
    latestReport: buildReferenceDemoReport('proj-campusconnect', 'CampusConnect', 'https://github.com/campus/connect', '5b8d2f1'),
  },
];

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

      const serverProjects: Project[] = rawList.map((p: any) => ({
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

      // Cache successful response in localStorage for offline resilience
      localStorage.setItem(cacheKey, JSON.stringify(serverProjects));

      return {
        projects: serverProjects,
        isOfflineFallback: false,
      };
    } catch (err: any) {
      console.warn('[ProjectService] Backend unreachable, using isolated offline cache:', err?.message);

      // Check offline cache or DEMO_FIXTURES
      const cached = localStorage.getItem(cacheKey);
      let fallbackList: Project[] = [];
      if (cached) {
        try {
          fallbackList = JSON.parse(cached);
        } catch {
          fallbackList = [];
        }
      } else if (!userId) {
        fallbackList = DEMO_FIXTURES;
      }

      return {
        projects: fallbackList,
        isOfflineFallback: true,
        serverError: err?.message || 'Connection refused',
      };
    }
  },

  /**
   * Fetch a single project by ID from backend.
   */
  async getProjectById(id: string, ownerId?: string): Promise<Project | null> {
    const userId = ownerId || getCurrentUserId();
    const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';

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
      // Fallback search in cache or DEMO_FIXTURES
      const cached = localStorage.getItem(cacheKey);
      const list = cached ? JSON.parse(cached) : (!userId ? DEMO_FIXTURES : []);
      return list.find((p: Project) => p.id === id) || null;
    }
  },

  /**
   * Create a project via real POST /api/v1/projects.
   */
  async createProject(name: string, repositoryUrl: string, branch = 'main', description = '', ownerId?: string): Promise<Project> {
    if (!name.trim()) {
      throw new Error('Project name is required');
    }
    if (!repositoryUrl.trim()) {
      throw new Error('Repository URL is required');
    }
    const userId = ownerId || getCurrentUserId();

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify({
          name: name.trim(),
          repositoryUrl: repositoryUrl.trim(),
          branch: branch.trim() || 'main',
          description: description.trim(),
          ownerId: userId || 'default',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to create project (HTTP ${res.status})`);
      }

      const p = await res.json();
      return {
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
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
        throw new Error('Valgent backend is unreachable. Please verify server is running on port 3000.');
      }
      throw err;
    }
  },

  /**
   * Update project fields via PATCH /api/v1/projects/:id.
   */
  async updateProject(
    id: string,
    patch: Partial<{ name: string; description: string; branch: string; status: ProjectStatus; repositoryUrl: string }>,
    ownerId?: string
  ): Promise<Project> {
    const userId = ownerId || getCurrentUserId();
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {})
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || `Failed to update project (HTTP ${res.status})`);
    }

    const p = await res.json();
    return {
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
  },

  /**
   * Delete project via real DELETE /api/v1/projects/:id.
   */
  async deleteProject(id: string, ownerId?: string): Promise<boolean> {
    const userId = ownerId || getCurrentUserId();
    const cacheKey = userId ? `valgent-server-projects-cache-${userId}` : 'valgent-server-projects-cache';

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

      // Also remove from user's offline cache
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const list: Project[] = JSON.parse(cached);
          const filtered = list.filter((p) => p.id !== id);
          localStorage.setItem(cacheKey, JSON.stringify(filtered));
        } catch {
          // ignore cache parse error
        }
      }

      return true;
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) {
        throw new Error('Backend server is unreachable. Cannot delete project.');
      }
      throw err;
    }
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
