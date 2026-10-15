# Valgent — Application & Analysis Flow

The user experience uses the **first generated four-screen mockup** as the visual reference. This is a multi-page SaaS, not a single dashboard screen.

## 1. Product navigation flow

```text
Public visitor
    |
    v
Landing page (/)
    |---------------------|
    v                     v
Sign up (/signup)       Log in (/login)
    |                     |
    +----------+----------+
               v
       Projects dashboard (/projects)
               |
       +-------+----------------------------+
       |                                    |
       v                                    v
New project (/projects/new)        Select existing project
       |                                    |
       +-------------------+----------------+
                           v
              Project workspace
         +---------+---------+----------+
         |         |         |          |
         v         v         v          v
     Overview  Evidence    Reports    Roadmap
               graph
```

### Navigation constraints

- Landing is public. Project list and workspace require authentication.
- Successful sign-up/log-in sends the user to Projects (or returns them to the protected destination they originally requested).
- Projects dashboard: the lower-left sidebar area remains empty/clean. Do not show a plan, upgrade card, or placeholder just to fill space.
- Workspace sidebar has only **Overview**, **Evidence graph**, **Reports**, **Roadmap**. No Settings link.
- Do not hard-code a person’s name in the top-right header. A profile/avatar can be shown after sign-in; any account identity comes from the authenticated user record.

## 2. New project flow

```text
Click New project
  -> Enter project name (required)
  -> Paste GitHub repository URL (required for repository analysis)
  -> Optional: branch / commit
  -> Optional: upload requirement / planned files
  -> Validate fields and file types
  -> Create project record
  -> Open workspace overview
  -> Start first analysis or save project as draft
```

If no repository has been entered, the project may exist as a draft but analysis cannot start. Make the next action and the blocking reason explicit.

## 3. Recheck flow

```text
Projects list or workspace
  -> Click Recheck / Analyze
  -> Confirm branch or commit and selected documents
  -> Create new AnalysisRun linked to Project
  -> Show progress stage-by-stage
  -> Fetch repository at a known commit
  -> Map project stack and scripts
  -> Read available repository documentation
  -> Run JS/TS semantic analysis when supported
  -> Optionally run allow-listed actions in Docker sandbox
  -> Build evidence graph
  -> Evaluate claims and select bounded verification actions
  -> Run targeted LLM reasoning with structured output
  -> Audit verdicts and references
  -> Generate roadmap tasks and report JSON
  -> Save immutable result and mark run complete/degraded/failed
  -> Refresh Overview, Evidence graph, Reports, and Roadmap
```

A recheck creates a new run. It does not replace or erase previous reports. Associate a run with a repository commit SHA and content hashes for the submitted documents.

## 4. Current backend analysis sequence (as represented in the uploaded repository)

```text
POST /api/v1/analyze
  -> Zod request validation
  -> GitHub URL validation + temporary clone
  -> ProjectMapper
  -> DocumentAnalyzer (currently root README only)
  -> StaticAnalyzer / TypeScript semantic parser (JS/TS-family support)
  -> Optional Docker install/build/test execution
  -> EvidenceGraphBuilder
  -> LLMRouter (Gemini / OpenRouter providers)
  -> ValidationOrchestrator (if claims were submitted)
       -> EvidenceGraphQuery
       -> ClaimEvidenceEvaluator
       -> ValidationPlanner
       -> ValidationSafetyPolicy
       -> optional sandbox action (max 3 action loop iterations per claim)
       -> ValidationEngine + ReportAuditor
       -> remediation tasks
  -> ProjectReport JSON
  -> remove temporary clone
  -> return response
```

**Important current-vs-target distinction:** the current analysis endpoint executes the full analysis within one HTTP request and returns the report when finished. The ingest does not show a durable async job queue, status-polling API, Firebase auth, project CRUD, persistent project/report store, or document upload route. Those are required product additions described in `backend.md`; do not pretend they already exist.

## 5. Analysis stage UX

Render stages from real backend metadata, not a fake timer:

1. **Repository ingestion** — fetching repository and resolving commit.
2. **Project mapping** — languages, package manager, entry points, scripts, dependencies.
3. **Static / semantic analysis** — AST symbols, imports, calls, routes, React components, and detected database operations where supported.
4. **Sandbox checks** — install/build/test status; show skipped, unsupported, timed out, or failed distinctly.
5. **Evidence graph** — claim/requirement/source relationships.
6. **Claim validation** — evidence sufficiency, contradictions, and audit checks.
7. **Report and roadmap** — final JSON and remediation tasks.

If execution is disabled, label the phases “Not attempted” or “Skipped”. If language support is unavailable, show the limitation and continue only with the evidence types that remain valid.

## 6. Claim status decision flow

```text
For each submitted claim
  -> retrieve its claim subgraph and related evidence
  -> evaluate implementation, contradiction, execution, and test signals
  -> if evidence is sufficient, prepare a supported verdict
  -> if useful verification action exists, pass it through safety policy
  -> execute only an allowed bounded action in sandbox
  -> attach new execution evidence and re-evaluate
  -> audit evidence IDs and graph references
  -> store canonical status + explanation + evidence + limitations
```

Canonical statuses:

- `VERIFIED`
- `PARTIALLY_VERIFIED`
- `NOT_VERIFIED`
- `INSUFFICIENT_EVIDENCE`

Absence of evidence is not automatically a contradiction. A missing file must not automatically result in `NOT_VERIFIED`; use `INSUFFICIENT_EVIDENCE` unless the evidence actually conflicts with the claim. Build/test evidence only counts if that action ran and produced results.

## 7. Failure and recovery paths

- **Invalid repository URL / request:** show actionable validation message; do not start a run.
- **Clone failure:** preserve the project; mark the run failed and provide retry guidance.
- **Unsupported language:** record unsupported static analysis. Never display it as a clean/passing scan.
- **Sandbox unavailable or timeout:** preserve the partial static evidence; show execution as failed/not attempted as appropriate.
- **LLM provider error:** try the configured provider fallback; if all providers fail, return deterministic findings and explicitly mark semantic analysis as degraded/insufficient. Never synthesize a successful verdict without evidence.
- **Document parser failure:** show filename and parse error; let the user remove/re-upload the file.
- **Authorization failure:** do not leak whether another user’s project ID exists.
- **Network retry:** retry only where safe and bounded; avoid duplicate runs through idempotency keys.

## 8. Target asynchronous contract

For production SaaS usability, move long-running analysis off the browser's request-response lifecycle:

```text
POST /api/v1/projects/:projectId/analyses
  -> 202 { analysisId, status: "QUEUED" }
GET  /api/v1/analyses/:analysisId/status
  -> { status, stage, progress?, updatedAt, message? }
GET  /api/v1/analyses/:analysisId
  -> completed report or structured failure
```

The current `/api/v1/analyze` route may remain as a compatibility/internal endpoint during migration. The job queue and polling routes are future work, not current functionality.
