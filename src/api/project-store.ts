import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredProject {
  id: string;
  name: string;
  description: string;
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  status: 'in_progress' | 'completed' | 'needs_review' | 'failed';
  createdAt: string;
  updatedAt: string;
  lastAnalyzedAt?: string;
  ownerId?: string;
  latestReport?: any;
  reports?: any[];
}

export function createSampleReport(projectId: string, repoUrl: string, commitSha: string) {
  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'Project';
  return {
    schema_version: '1.0',
    analysis_run_id: `run_${crypto.randomUUID().substring(0, 8)}`,
    project: {
      id: projectId,
      name: repoName,
      repository_url: repoUrl,
      repository_commit: commitSha,
      context_metrics: { total_files: 42, eligible_files: 38, estimated_tokens: 14200 },
      package_manager: 'npm',
      architecture: {
        components: ['AuthContext', 'AnalyzePipeline', 'EvidenceGraph', 'ThemeToggle'],
        entry_points: ['src/index.ts', 'src/main.tsx'],
        api_routes: ['GET /health', 'POST /api/v1/analyze', 'GET /api/v1/projects'],
        databases: ['PostgreSQL & Supabase Auth Store']
      },
      features: ['Deterministic AST Analysis', 'Evidence Graph Navigation', 'Remediation Roadmap']
    },
    analysis: {
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3585000).toISOString(),
      duration_ms: 14250,
      status: 'COMPLETED',
      stages: ['INITIALIZED', 'INGESTING', 'PROJECT_MAPPED', 'STATIC_ANALYSIS', 'DYNAMIC_ANALYSIS', 'EVIDENCE_BUILT', 'LLM_SYNTHESIS', 'REPORT_AUDITED', 'COMPLETED']
    },
    summary: {
      total_claims: 5,
      verified: 3,
      partially_verified: 1,
      not_verified: 1,
      insufficient_evidence: 0
    },
    claims: [
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
            description: 'Supabase client instantiation with OAuth redirect session detection enabled.'
          },
          {
            evidence_id: 'EVD-02',
            source: 'TypeScript Semantic AST',
            path: 'src/context/AuthContext.tsx',
            line_start: 95,
            line_end: 110,
            snippet: 'await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ... } });',
            classification: 'IMPLEMENTATION',
            description: 'Google OAuth provider dispatch method with explicit redirect callback.'
          }
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
            description: 'Express POST /analyze route definition with Zod schema verification.'
          }
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
            description: 'Stripe, Razorpay, or payment webhooks absent from package manifest and source tree.'
          }
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
        text: 'Docker container sandbox isolation for dynamic execution',
        status: 'PARTIALLY_VERIFIED',
        reason: 'Docker client container creation logic detected in DockerSandbox class, but network isolation requires explicit runtime policy flags.',
        evidence_ids: ['EVD-05'],
        evidence_items: [
          {
            evidence_id: 'EVD-05',
            source: 'TypeScript Semantic AST',
            path: 'src/sandbox/docker.ts',
            line_start: 45,
            line_end: 78,
            snippet: 'const container = await docker.createContainer({ Image: "node:20-slim", NetworkDisabled: !networkEnabled, HostConfig: { Memory: memoryLimit } });',
            classification: 'IMPLEMENTATION',
            description: 'Docker container instantiation with configurable network and memory limits.'
          }
        ],
        recommended_actions: ['Enforce NetworkDisabled: true across dynamic install and test phases.']
      },
      {
        claim_id: 'CLM-05',
        text: 'Deterministic audit engine downgrades hallucinated claims',
        status: 'VERIFIED',
        reason: 'ReportAuditor implements rule-based overrides verifying AST and exit code citations prior to report generation.',
        evidence_ids: ['EVD-06'],
        evidence_items: [
          {
            evidence_id: 'EVD-06',
            source: 'TypeScript Semantic AST',
            path: 'src/validation/auditor.ts',
            line_start: 12,
            line_end: 35,
            snippet: 'export class ReportAuditor { audit(claim: ClaimValidation, evidence: Evidence[]): ClaimValidation { ... } }',
            classification: 'IMPLEMENTATION',
            description: 'Deterministic report auditor class implementation.'
          }
        ],
        recommended_actions: ['Add automated regression test cases for new status downgrade scenarios.']
      }
    ],
    evidence: [
      {
        evidence_id: 'EVD-01',
        source: 'TypeScript Semantic AST',
        path: 'src/lib/supabase.ts',
        line_start: 7,
        line_end: 18,
        snippet: 'export const supabase = createClient(supabaseUrl, supabaseAnonKey);',
        classification: 'IMPLEMENTATION',
        description: 'Supabase client creation.'
      },
      {
        evidence_id: 'EVD-02',
        source: 'TypeScript Semantic AST',
        path: 'src/context/AuthContext.tsx',
        line_start: 95,
        line_end: 110,
        snippet: 'await supabase.auth.signInWithOAuth({ provider: "google" });',
        classification: 'IMPLEMENTATION',
        description: 'OAuth signIn method.'
      },
      {
        evidence_id: 'EVD-03',
        source: 'Route Extraction',
        path: 'src/api/routes.ts',
        line_start: 60,
        line_end: 105,
        snippet: 'router.post("/analyze", ...)',
        classification: 'API_ROUTE',
        description: 'POST /analyze route definition.'
      },
      {
        evidence_id: 'EVD-04',
        source: 'Dependency & Symbol Scan',
        path: 'package.json',
        line_start: 17,
        line_end: 25,
        snippet: 'dependencies: { ... }',
        classification: 'MISSING_DEPENDENCY',
        description: 'Missing payment dependency.'
      },
      {
        evidence_id: 'EVD-05',
        source: 'TypeScript Semantic AST',
        path: 'src/sandbox/docker.ts',
        line_start: 45,
        line_end: 78,
        snippet: 'docker.createContainer(...)',
        classification: 'IMPLEMENTATION',
        description: 'Docker container configuration.'
      },
      {
        evidence_id: 'EVD-06',
        source: 'TypeScript Semantic AST',
        path: 'src/validation/auditor.ts',
        line_start: 12,
        line_end: 35,
        snippet: 'export class ReportAuditor { ... }',
        classification: 'IMPLEMENTATION',
        description: 'ReportAuditor implementation.'
      }
    ],
    evidence_graph: {
      nodes: [
        { id: 'node-clm-01', type: 'claim', label: 'OAuth Sign-in', sublabel: 'src/lib/supabase.ts', status: 'VERIFIED' },
        { id: 'node-clm-02', type: 'claim', label: 'Analysis API', sublabel: 'src/api/routes.ts', status: 'VERIFIED' },
        { id: 'node-clm-03', type: 'claim', label: 'Payment Gateway', sublabel: 'package.json', status: 'NOT_VERIFIED' },
        { id: 'node-clm-04', type: 'claim', label: 'Docker Sandbox', sublabel: 'src/sandbox/docker.ts', status: 'PARTIALLY_VERIFIED' },
        { id: 'node-clm-05', type: 'claim', label: 'Report Auditor', sublabel: 'src/validation/auditor.ts', status: 'VERIFIED' },
        { id: 'node-route-01', type: 'route', label: 'POST /analyze', sublabel: 'src/api/routes.ts:60' },
        { id: 'node-route-02', type: 'route', label: 'GET /health', sublabel: 'src/index.ts:14' },
        { id: 'node-sym-01', type: 'symbol', label: 'createClient', sublabel: 'src/lib/supabase.ts:7' },
        { id: 'node-sym-02', type: 'symbol', label: 'DockerSandbox', sublabel: 'src/sandbox/docker.ts:15' },
        { id: 'node-sym-03', type: 'symbol', label: 'ReportAuditor', sublabel: 'src/validation/auditor.ts:12' },
        { id: 'node-exe-01', type: 'execution', label: 'npm test (passed)', sublabel: 'auditor.test.ts: 3 passed' }
      ],
      edges: [
        { id: 'e1', source: 'node-clm-01', target: 'node-sym-01', relation: 'verified_by' },
        { id: 'e2', source: 'node-clm-02', target: 'node-route-01', relation: 'implements_route' },
        { id: 'e3', source: 'node-clm-04', target: 'node-sym-02', relation: 'partially_verified_by' },
        { id: 'e4', source: 'node-clm-05', target: 'node-sym-03', relation: 'verified_by' },
        { id: 'e5', source: 'node-sym-03', target: 'node-exe-01', relation: 'tested_by' },
        { id: 'e6', source: 'node-route-01', target: 'node-route-02', relation: 'shares_router' }
      ]
    },
    roadmap: [
      {
        id: 'TASK-01',
        task_id: 'TASK-01',
        claim_id: 'CLM-03',
        title: 'Integrate Stripe or Razorpay Payment Gateway SDK',
        problem: 'Claim mentions subscription tiers and payments, but no payment dependencies or webhook listener endpoints exist in the repository.',
        priority: 'HIGH',
        evidence_refs: ['EVD-04'],
        recommended_actions: [
          'Install @stripe/stripe-js and stripe package',
          'Create POST /api/v1/checkout session route',
          'Implement webhook signature validation endpoint'
        ],
        acceptance_criteria: [
          'package.json contains stripe dependency',
          'POST /api/v1/checkout returns a valid checkout session url',
          'Webhook route verifies stripe-signature header'
        ],
        status: 'PENDING'
      },
      {
        id: 'TASK-02',
        task_id: 'TASK-02',
        claim_id: 'CLM-04',
        title: 'Enforce Strict Docker Container Network Isolation During Tests',
        problem: 'Dynamic execution runs with default network access enabled during test phase.',
        priority: 'MEDIUM',
        evidence_refs: ['EVD-05'],
        recommended_actions: [
          'Update ExecutionOrchestrator to set network_mode: "none" for test containers',
          'Verify container exit codes without egress connectivity'
        ],
        acceptance_criteria: [
          'Docker container inspection reports NetworkDisabled: true during test phase',
          'Tests pass with isolated loopback network only'
        ],
        status: 'PENDING'
      }
    ],
    diagnostics: {
      warnings: ['Docker container isolation was skipped for local verification run.'],
      errors: [],
      provider_info: 'Gemini 3.8 Flash + Static TypeScript Compiler AST'
    }
  };
}

export class ProjectStore {
  private static DATA_DIR = path.resolve(process.cwd(), '.valgent-data');
  private static DATA_FILE = path.join(ProjectStore.DATA_DIR, 'projects.json');

  private static ensureDataDir(): void {
    if (!fs.existsSync(ProjectStore.DATA_DIR)) {
      fs.mkdirSync(ProjectStore.DATA_DIR, { recursive: true });
    }

    const demoReport1 = createSampleReport('proj-valgent-demo', 'https://github.com/valgent/demo', '9f2a1c7');
    const demoReport2 = createSampleReport('proj-civicpulse-ai', 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git', 'a3c7e9d');
    const demoReport3 = createSampleReport('proj-campusconnect', 'https://github.com/campus/connect', '5b8d2f1');

    if (!fs.existsSync(ProjectStore.DATA_FILE)) {
      const initialSeed: StoredProject[] = [
        {
          id: 'proj-valgent-demo',
          name: 'Valgent Demo',
          description: 'AI-powered project validation platform with AST semantic analysis',
          repositoryUrl: 'https://github.com/valgent/demo',
          branch: 'main',
          commitSha: '9f2a1c7',
          status: 'in_progress',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastAnalyzedAt: new Date().toISOString(),
          ownerId: 'default',
          latestReport: demoReport1,
          reports: [demoReport1]
        },
        {
          id: 'proj-civicpulse-ai',
          name: 'CivicPulse AI',
          description: 'Civic engagement and feedback platform for municipal transparency',
          repositoryUrl: 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git',
          branch: 'main',
          commitSha: 'a3c7e9d',
          status: 'needs_review',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastAnalyzedAt: new Date().toISOString(),
          ownerId: 'default',
          latestReport: demoReport2,
          reports: [demoReport2]
        },
        {
          id: 'proj-campusconnect',
          name: 'CampusConnect',
          description: 'Student community and event platform with peer tutoring',
          repositoryUrl: 'https://github.com/campus/connect',
          branch: 'dev',
          commitSha: '5b8d2f1',
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastAnalyzedAt: new Date().toISOString(),
          ownerId: 'default',
          latestReport: demoReport3,
          reports: [demoReport3]
        }
      ];
      fs.writeFileSync(ProjectStore.DATA_FILE, JSON.stringify(initialSeed, null, 2), 'utf-8');
    }
  }

  public static getAll(): StoredProject[] {
    try {
      ProjectStore.ensureDataDir();
      const raw = fs.readFileSync(ProjectStore.DATA_FILE, 'utf-8');
      const list: StoredProject[] = JSON.parse(raw);

      // Ensure default showcase projects exist and have latestReport populated
      let changed = false;
      const demoProjects = ['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'];
      for (const p of list) {
        if (demoProjects.includes(p.id) && !p.latestReport) {
          p.latestReport = createSampleReport(p.id, p.repositoryUrl, p.commitSha || 'latest');
          changed = true;
        }
      }

      if (changed) {
        ProjectStore.saveAll(list);
      }

      return list;
    } catch (err) {
      console.error('[ProjectStore] Failed to read projects:', err);
      return [];
    }
  }

  private static saveAll(projects: StoredProject[]): void {
    ProjectStore.ensureDataDir();
    fs.writeFileSync(ProjectStore.DATA_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  }

  public static getById(id: string): StoredProject | null {
    const list = ProjectStore.getAll();
    const found = list.find(p => p.id === id);
    if (found && !found.latestReport && ['proj-valgent-demo', 'proj-civicpulse-ai', 'proj-campusconnect'].includes(id)) {
      found.latestReport = createSampleReport(found.id, found.repositoryUrl, found.commitSha || 'latest');
      ProjectStore.saveAll(list);
    }
    return found || null;
  }

  public static create(data: { name: string; repositoryUrl: string; branch?: string; description?: string }): StoredProject {
    const list = ProjectStore.getAll();
    const hash = crypto.createHash('sha256').update(data.repositoryUrl + Date.now()).digest('hex').substring(0, 8);
    const now = new Date().toISOString();

    const newProject: StoredProject = {
      id: `proj-${hash}`,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      repositoryUrl: data.repositoryUrl.trim(),
      branch: data.branch?.trim() || 'main',
      commitSha: 'latest',
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
      lastAnalyzedAt: now,
      ownerId: 'default',
      reports: []
    };

    list.unshift(newProject);
    ProjectStore.saveAll(list);
    return newProject;
  }

  public static update(id: string, patch: Partial<StoredProject>): StoredProject | null {
    const list = ProjectStore.getAll();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };

    ProjectStore.saveAll(list);
    return list[idx];
  }

  public static delete(id: string): boolean {
    const list = ProjectStore.getAll();
    const filtered = list.filter(p => p.id !== id);
    if (filtered.length === list.length) return false;

    ProjectStore.saveAll(filtered);
    return true;
  }

  public static attachReport(projectId: string, report: any): StoredProject | null {
    const list = ProjectStore.getAll();
    let project = list.find(p => p.id === projectId);

    if (!project) {
      // If project doesn't exist, auto-create it from report
      const repoUrl = report.project?.repository_url || 'https://github.com/unknown/repo';
      const name = report.project?.name || repoUrl.split('/').pop() || 'Verified Project';
      project = {
        id: projectId,
        name,
        description: `Verified analysis project for ${name}`,
        repositoryUrl: repoUrl,
        branch: 'main',
        commitSha: report.project?.repository_commit || 'unknown',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAnalyzedAt: report.analysis?.completed_at || new Date().toISOString(),
        ownerId: 'default',
        latestReport: report,
        reports: [report]
      };
      list.unshift(project);
    } else {
      project.latestReport = report;
      project.commitSha = report.project?.repository_commit || project.commitSha;
      project.status = report.summary?.not_verified > 0 ? 'needs_review' : 'completed';
      project.lastAnalyzedAt = report.analysis?.completed_at || new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      const existingReports = project.reports || [];
      project.reports = [report, ...existingReports.filter((r: any) => r.analysis_run_id !== report.analysis_run_id)];
    }

    ProjectStore.saveAll(list);
    return project;
  }

  public static findAnalysisById(analysisId: string): any | null {
    const list = ProjectStore.getAll();
    for (const p of list) {
      if (p.latestReport && (p.latestReport.analysis_run_id === analysisId || p.latestReport.analysis_id === analysisId)) {
        return p.latestReport;
      }
      if (p.reports) {
        for (const r of p.reports) {
          if (r.analysis_run_id === analysisId || r.analysis_id === analysisId) {
            return r;
          }
        }
      }
    }
    return null;
  }
}
