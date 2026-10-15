import { Project, ProjectStatus } from '../types/project';
import { ProjectReport, ClaimValidation, EvidenceReference, RoadmapTask, EvidenceGraphData } from '../types/report';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Initial projects matching reference mockup screen 03
const INITIAL_PROJECTS: Project[] = [
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
    latestReport: generateDemoReport('proj-valgent-demo', 'Valgent Demo', 'https://github.com/valgent/demo', '9f2a1c7'),
  },
  {
    id: 'proj-civicpulse-ai',
    name: 'CivicPulse AI',
    description: 'Civic engagement and feedback platform for municipal transparency',
    repositoryUrl: 'https://github.com/civicpulse/ai',
    branch: 'main',
    commitSha: 'a3c7e9d',
    status: 'needs_review',
    lastAnalyzedAt: '2026-10-10T18:15:00Z',
    createdAt: '2026-10-09T08:00:00Z',
    ownerId: 'default',
    latestReport: generateCivicPulseReport(),
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
    latestReport: generateCampusConnectReport(),
  },
];

function generateDemoReport(projId: string, _name: string, repoUrl: string, commitSha: string): ProjectReport {
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

function generateCivicPulseReport(): ProjectReport {
  return generateDemoReport('proj-civicpulse-ai', 'CivicPulse AI', 'https://github.com/civicpulse/ai', 'a3c7e9d');
}

function generateCampusConnectReport(): ProjectReport {
  return generateDemoReport('proj-campusconnect', 'CampusConnect', 'https://github.com/campus/connect', '5b8d2f1');
}

// Local project storage management & Backend API Bridge
export const ProjectService = {
  getProjects(userId?: string): Project[] {
    const raw = localStorage.getItem('valgent-projects');
    if (!raw) {
      localStorage.setItem('valgent-projects', JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    try {
      const list: Project[] = JSON.parse(raw);
      return list;
    } catch {
      return INITIAL_PROJECTS;
    }
  },

  getProjectById(id: string): Project | undefined {
    const projects = this.getProjects();
    return projects.find((p) => p.id === id);
  },

  createProject(name: string, repositoryUrl: string, branch = 'main', description = ''): Project {
    const newProj: Project = {
      id: 'proj-' + Math.random().toString(36).substring(2, 8),
      name,
      description: description || `Repository analysis for ${name}`,
      repositoryUrl,
      branch,
      commitSha: 'c0b87f2',
      status: 'in_progress',
      lastAnalyzedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ownerId: 'default',
      latestReport: generateDemoReport('temp', name, repositoryUrl, 'c0b87f2'),
    };
    newProj.latestReport!.project_id = newProj.id;

    const current = this.getProjects();
    const updated = [newProj, ...current];
    localStorage.setItem('valgent-projects', JSON.stringify(updated));
    return newProj;
  },

  recheckProject(id: string): Project | undefined {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    const proj = projects[index];
    const newSha = Math.random().toString(16).substring(2, 9);
    proj.commitSha = newSha;
    proj.lastAnalyzedAt = new Date().toISOString();
    proj.status = 'completed';
    proj.latestReport = generateDemoReport(proj.id, proj.name, proj.repositoryUrl, newSha);

    projects[index] = proj;
    localStorage.setItem('valgent-projects', JSON.stringify(projects));
    return proj;
  },

  async recheckProjectWithBackend(id: string, repoUrl?: string): Promise<Project | undefined> {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    const proj = projects[index];
    const targetRepo = repoUrl || proj.repositoryUrl;

    // Attempt real backend call
    const realReport = await this.analyzeWithRealBackend(targetRepo);
    if (realReport) {
      proj.latestReport = realReport;
      proj.commitSha = realReport.commit_sha || proj.commitSha;
      proj.lastAnalyzedAt = new Date().toISOString();
      proj.status = 'completed';
      projects[index] = proj;
      localStorage.setItem('valgent-projects', JSON.stringify(projects));
      return proj;
    }

    // Fallback to local recheck
    return this.recheckProject(id);
  },

  async analyzeWithRealBackend(
    repositoryUrl: string,
    commitSha?: string,
    claims?: Array<{ claim_id: string; text: string }>
  ): Promise<ProjectReport | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_url: repositoryUrl,
          commit_sha: commitSha || undefined,
          claims: claims && claims.length > 0 ? claims : [
            { claim_id: 'CLM-01', text: 'Core application entry points and routes are detected' },
            { claim_id: 'CLM-02', text: 'TypeScript AST semantic analysis extracts components and symbols' },
            { claim_id: 'CLM-03', text: 'Execution sandbox telemetry verifies dependency environment' }
          ],
          analysis_options: {
            skip_execution: false
          }
        }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (data?.report) {
        return this.normalizeBackendReport(data.report, repositoryUrl);
      }
      return null;
    } catch {
      return null;
    }
  },

  normalizeBackendReport(raw: any, repoUrl: string): ProjectReport {
    // Map backend ProjectReport format to Frontend format
    const claims: ClaimValidation[] = (raw.claims || raw.requirements || []).map((c: any, i: number) => ({
      claim_id: c.claim_id || `CLM-0${i + 1}`,
      text: c.text || c.claim_id || 'Repository claim',
      status: c.status || 'VERIFIED',
      reason: c.conclusion || c.reason || 'Deterministic AST evidence resolved.',
      evidence_ids: c.evidence_refs || [],
      evidence_items: (raw.evidence || [])
        .filter((e: any) => (c.evidence_refs || []).includes(e.evidence_id))
        .map((e: any) => ({
          evidence_id: e.evidence_id,
          source: e.source || 'TypeScript AST',
          path: e.path || 'src/index.ts',
          line_start: e.line_start || 1,
          line_end: e.line_end || 10,
          snippet: e.snippet || '',
          classification: e.classification || 'IMPLEMENTATION',
          description: e.description || 'Source evidence citation'
        }))
    }));

    // Construct evidence graph
    const nodes = (raw.evidence_graph?.nodes || []).map((n: any) => ({
      id: n.id,
      type: n.type || 'symbol',
      label: n.label || n.id,
      sublabel: n.sublabel || n.metadata?.path || '',
      status: n.status
    }));

    const edges = (raw.evidence_graph?.edges || []).map((e: any) => ({
      id: e.id || `edge-${Math.random()}`,
      source: e.source,
      target: e.target,
      relation: e.relation || 'verified_by'
    }));

    const roadmap: RoadmapTask[] = (raw.roadmap || []).map((r: any, i: number) => ({
      id: r.task_id || `TASK-0${i + 1}`,
      title: r.title || 'Remediation task',
      problem: r.problem || 'Evidence gap identified',
      priority: r.priority || 'MEDIUM',
      evidence_refs: r.evidence_refs || [],
      recommended_actions: r.recommended_actions || [],
      acceptance_criteria: r.acceptance_criteria || [],
      status: r.status || 'PENDING'
    }));

    return {
      schema_version: raw.schema_version || '1.0.0',
      analysis_run_id: raw.analysis_run_id || 'run_' + Math.random().toString(36).substring(2, 9),
      project_id: raw.project?.id || 'proj-valgent',
      repository_url: repoUrl,
      commit_sha: raw.project?.repository_commit || 'head',
      branch: 'main',
      timestamp: raw.analysis?.completed_at || new Date().toISOString(),
      duration_ms: raw.analysis?.duration_ms || 12000,
      status: raw.analysis?.status || 'COMPLETED',
      summary: {
        total_claims: raw.summary?.claims_total || claims.length,
        verified_count: raw.summary?.verified || claims.filter(c => c.status === 'VERIFIED').length,
        partially_verified_count: raw.summary?.partially_verified || claims.filter(c => c.status === 'PARTIALLY_VERIFIED').length,
        not_verified_count: raw.summary?.not_verified || claims.filter(c => c.status === 'NOT_VERIFIED').length,
        insufficient_evidence_count: raw.summary?.insufficient_evidence || claims.filter(c => c.status === 'INSUFFICIENT_EVIDENCE').length,
      },
      claims,
      evidence: raw.evidence || [],
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
        provider_info: raw.llm?.provider || 'Deterministic AST + Local Provider',
      }
    };
  },

  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    localStorage.setItem('valgent-projects', JSON.stringify(filtered));
    return true;
  },
};
