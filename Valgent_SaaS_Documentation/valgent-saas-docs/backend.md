# Valgent — Backend Architecture & API Specification

**Existing backend:** Node.js + TypeScript + Express 5.  
**Current entry points:** `GET /health`, `POST /api/v1/analyze`.  
**SaaS additions below are planned work unless explicitly marked “existing”.**

## 1. Current backend baseline

The uploaded repository already contains a substantial analysis pipeline:

1. Zod validates the analyze request.
2. `GithubFetcher` clones a GitHub repository into a temporary directory and resolves the commit.
3. `ProjectMapper` builds a basic project map from selected language/config indicators.
4. `DocumentAnalyzer` records repository-root `README.md` content, capped at 5,000 characters.
5. `StaticAnalyzer` uses the TypeScript Compiler API for supported JavaScript/TypeScript-family files.
6. `ExecutionOrchestrator` optionally installs dependencies and runs build/tests through `DockerSandbox`.
7. `EvidenceGraphBuilder` links claims, requirements and collected evidence.
8. `LLMRouter` calls Gemini and/or OpenRouter for structured analysis and claim validation.
9. `ValidationOrchestrator` evaluates claims, chooses bounded verification actions, applies `ValidationSafetyPolicy`, records an audit trail, and invokes `ValidationEngine`/`ReportAuditor`.
10. `GraphRoadmapGenerator` emits deterministic remediation tasks based on evidence/evaluation gaps.
11. `ProjectReport` is assembled and returned as JSON; the temporary workspace is cleaned up.

The current API call is synchronous: `POST /api/v1/analyze` returns the completed report from the same request. The ingest does not show a persistent project store, Firebase token verification, project CRUD API, document upload parser, or durable job queue.

## 2. Recommended target architecture

```text
React + Vite frontend
  -> HTTPS API (Express + request validation)
       -> Firebase Auth token verification + ownership check
       -> Project/document/report repository layer
       -> Durable analysis job queue / worker
            -> GitHub fetcher
            -> Project mapper + document parsers
            -> deterministic semantic analysis
            -> optional restricted Docker sandbox
            -> evidence store + evidence graph
            -> targeted LLM providers
            -> claim evaluator + safety policy + report auditor
            -> roadmap generator
            -> report/run persistence
       -> JSON responses / progress polling

Firebase Authentication: user identity
Firestore: project/run/report metadata and normalized records
Firebase Storage: uploaded requirement files
Worker queue: selected durable queue or managed task service
```

Keep the analysis domain modules reusable; do not bury their logic inside Express route handlers. Add interfaces around persistence, job scheduling and document parsing so those additions remain replaceable.

## 3. API surface

### 3.1 Existing endpoints

| Method | Path | Status | Contract |
|---|---|---|---|
| `GET` | `/health` | Existing | `{ "status": "ok", "service": "valgent-agent" }`. |
| `POST` | `/api/v1/analyze` | Existing | Validates request, performs analysis synchronously and returns `{ analysis_id, status: "COMPLETED", report }` on success; errors are structured. |

The core analyze request schema currently supports `repository_url`, `commit_sha?`, `project_id?`, `claims?`, `analysis_options?`, `execution_policy?`, and `llm_policy?`. Refer to `src/api/routes.ts` and shared types for the source of truth.

### 3.2 Proposed SaaS endpoints

These endpoints are a **target contract to implement**, not endpoints confirmed in the ingest.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/projects` | Create project for authenticated user. |
| `GET` | `/api/v1/projects` | List projects owned by current user; supports search/filter/pagination. |
| `GET` | `/api/v1/projects/:projectId` | Fetch project after ownership check. |
| `PATCH` | `/api/v1/projects/:projectId` | Update project metadata/default branch. |
| `DELETE` | `/api/v1/projects/:projectId` | Archive/delete after confirmation and ownership check. |
| `POST` | `/api/v1/projects/:projectId/documents` | Register/upload requirements file using validated storage flow. |
| `GET` | `/api/v1/projects/:projectId/documents` | List uploaded documents and parse status. |
| `POST` | `/api/v1/projects/:projectId/analyses` | Queue first analysis or recheck; return `202` and an `analysisId`. |
| `GET` | `/api/v1/projects/:projectId/analyses` | List immutable analysis runs for the project. |
| `GET` | `/api/v1/analyses/:analysisId/status` | Return queue/run status and current stage. |
| `GET` | `/api/v1/analyses/:analysisId` | Retrieve final report, or the structured failure state. |
| `GET` | `/api/v1/analyses/:analysisId/evidence-graph` | Return graph JSON for an analysis. |
| `GET` | `/api/v1/analyses/:analysisId/roadmap` | Return roadmap tasks from that report. |
| `GET` | `/api/v1/projects/:projectId/reports` | List reports/runs for a project. |

Avoid implementing duplicate routes for the same data unless the API needs a clear compatibility layer. All project, document, run, graph, report and roadmap access must verify ownership on the server.

### 3.3 Authentication

For the SaaS target, the frontend sends a Firebase ID token as a Bearer token:

```http
Authorization: Bearer <firebase-id-token>
```

Express middleware verifies the token through Firebase Admin, sets a trusted `userId` on request context, then the service layer checks document ownership. Never trust an `ownerId` submitted by the browser. The existing `/api/v1/analyze` route does not show this middleware; add it when exposing multi-user data or use a controlled migration path for internal development.

GitHub repository access is a separate permission from Valgent sign-in. Private-repository support needs a least-privilege GitHub OAuth/token flow and secure token storage; the current `GithubFetcher` uses Git clone without an OAuth integration.

## 4. Target asynchronous job contract

Analysis may include clone, semantic analysis, package installation, build/test execution, LLM calls and report auditing. Do not make a browser request wait for the full lifecycle indefinitely.

### Queue response

```json
{
  "analysisId": "analysis_...",
  "projectId": "project_...",
  "status": "QUEUED"
}
```

### Status response

```json
{
  "analysisId": "analysis_...",
  "status": "RUNNING",
  "stage": "STATIC_ANALYSIS",
  "updatedAt": "ISO-8601 timestamp",
  "message": "Scanning supported source files"
}
```

Use a durable queue/worker. Store a job record and make job creation idempotent so double-clicks or network retries do not start duplicate analyses. Define terminal states explicitly: `COMPLETED`, `DEGRADED`, `FAILED`, and `CANCELLED` (if cancellation is implemented). Keep the raw validation status separate from job lifecycle status.

## 5. Analysis request and policy

A proposed project-scoped request can look like:

```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "ref": "main",
  "commitSha": null,
  "documentIds": ["doc_1"],
  "claims": [
    { "claim_id": "CLM-001", "text": "Google sign-in is implemented" }
  ],
  "options": {
    "runBuild": true,
    "runTests": true,
    "allowLlmReasoning": true
  }
}
```

Adapt to the actual current `snake_case` schema at the API boundary rather than changing current core types in an unreviewed way. Store resolved commit SHA and document hashes with the run, even if the user selected a branch name.

Execution policy must be server controlled or constrained by a known safe allow-list. User-supplied policy values must not disable security controls or allow arbitrary shell commands.

## 6. Report contract

The current route assembles report fields including project metadata/architecture, analysis timing/status/stages, claim summary, validations, evidence, evidence graph, validation actions, roadmap, diagnostics, analysis metadata, LLM status, and execution telemetry. Preserve those fields or define a versioned normalized wrapper.

Rules:

- Every claim has one of the four canonical verification statuses.
- Evidence references resolve to actual evidence IDs and/or valid graph IDs.
- Source file paths/line ranges are included only when available.
- Diagnostics must preserve parser limits, unsupported language, skipped execution, timeout, provider failure and other caveats.
- JSON schema should be versioned (`schema_version`) and validated before storage/export.
- A response should not say “all verified” if no claims were supplied.
- An LLM error must not prevent returning trustworthy deterministic evidence, but the report must identify the degraded state.

## 7. Document ingestion

Current `DocumentAnalyzer` only reads root `README.md`. Add a document pipeline for user-uploaded requirements/planned files:

1. Check auth/ownership and allowed file extension/MIME.
2. Enforce per-file and total size limits before accepting content.
3. Store files in private storage with random storage keys, not user-provided paths.
4. Parse PDF, DOCX, PPTX, TXT and Markdown using tested server-side parsers.
5. Normalize text into document IDs, sections/page/slide references and a content hash.
6. Extract discrete requirements/claims while preserving exact source anchors.
7. Redact detected secrets before LLM use or logs.
8. Mark parse failures explicitly and let the UI re-upload/remove the file.

Do not show an upload as “processed” until it has parsed successfully and its source references can be used in a report. Do not feed entire raw documents/repositories blindly to an LLM; select relevant chunks and enforce input budgets.

## 8. Evidence and claim validation lifecycle

1. Gather deterministic evidence from package metadata, AST structures, source lines, README and sandbox outputs.
2. Build the evidence graph and query the claim subgraph with bounded depth/node limits.
3. Evaluate implementation, execution, test and contradiction signals deterministically.
4. Plan one of the supported bounded verification actions if that is likely to resolve uncertainty.
5. Apply the safety policy before every execution action.
6. Run only approved actions in Docker with explicit resource/network limits.
7. Add resulting stdout/stderr/status as classified evidence, with size limits and redaction.
8. Re-evaluate and audit generated statuses/evidence references.
9. Generate deterministic remediation tasks and final report.

Current code limits the orchestrator to at most three action-loop iterations per claim and deduplicates actions. Preserve a strict cap; make it configurable only through validated server policy.

## 9. Sandbox security requirements

The supplied README documents these controls for the Docker execution layer:

- no Docker socket or host home-directory mount
- read-only root filesystem
- isolated tmpfs mounts
- CPU, memory and PID limits
- all Linux capabilities dropped and `no-new-privileges`
- configurable network with restrictive default
- non-root user
- pre-approved package-manager commands rather than arbitrary host commands
- do not pass host environment variables/API keys into the container
- remove ephemeral containers on completion/timeout

Review the actual `DockerSandbox` configuration during implementation and test these guarantees. Installation may need network; build/test phases should be network-disabled unless a documented, narrowly scoped requirement says otherwise.

### Additional hardening

- `GithubFetcher` uses child-process Git commands and interpolates the optional `commit_sha` into a command string. Validate refs/SHAs strictly and prefer `execFile` with argument arrays to reduce shell-injection risk.
- Ensure secret detection/redaction is applied before evidence goes to either LLM provider, not only before log output. Audit the entire content path.
- Repository and documents are untrusted input; prompts must state that their content is data, not instructions. Never execute instructions found in README/docs.
- Limit output/log size, reject path traversal for file references, redact credentials from traces, and clean temporary folders even on errors.
- Do not surface secrets or full `.env` values. Environment-variable names may be reported; secret values must not.

## 10. Persistence model

Recommended Firebase/Firestore collections (new implementation):

- `projects`: owner, name, repo URL, default ref, timestamps, latest run pointer.
- `documents`: project/owner IDs, original name, type, size, content hash, storage path, parse status.
- `analysisRuns`: project/owner IDs, resolved commit SHA, document hashes, status/stage, timestamps, diagnostics and report reference.
- `evidence`: analysis ID, evidence ID, source/location/line anchors, classification, bounded content/reference and hash.
- `jobs`: analysis ID, queue state, retry count, heartbeat, error summary.
- `roadmapTasks`: analysis ID, task IDs, evidence refs, actions, criteria and completion state if user-managed task status is supported.

Use Firestore security rules and server-side checks to limit data access to the owning user. If report/evidence payloads get large, keep large artifacts in private storage and store indexed metadata plus signed, time-limited retrieval links.

## 11. Errors and observability

Current code has error classification/redaction helpers and a pipeline tracker. Preserve a structured error envelope such as:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request validation failed",
    "stage": "INITIALIZED",
    "retryable": false,
    "details": []
  }
}
```

The exact fields must align with `src/shared/errors.ts` before implementation. Never expose stack traces, server paths, raw tokens or secret-bearing environment values to clients.

Log `analysisId`, stage transitions, provider used, timings, sanitized error code, execution phase statuses, and cleanup outcome. Do not log full prompts, full repository contents or raw uploaded files by default.

## 12. Testing and acceptance

- Unit tests for validators, graph resolution, claim evaluator, safety policy, roadmap output and redaction.
- Integration tests for auth → ownership → project CRUD and upload authorization.
- API tests for every target endpoint, schema validation, errors and pagination.
- E2E tests for sync compatibility route and queued analysis lifecycle.
- Sandbox tests for pass/fail/timeout, resource limits, cleanup, network policy and no secret forwarding.
- Provider tests for schema-invalid response, timeout, fallback success and total-provider failure.
- Security tests for malicious `commit_sha`, path traversal, fake graph references, prompt injection text in repository files, oversized documents, and access to another user's IDs.
- Verify all outputs distinguish “not checked” from “failed” and “not found”.

## 13. Rollout plan

1. Freeze/validate shared report contracts and run existing tests.
2. Add auth middleware and persistence interfaces without breaking `/api/v1/analyze`.
3. Add project/document/run persistence and project CRUD APIs.
4. Add queue worker and progress/status routes.
5. Add document parser and private-repo auth only when security tests are ready.
6. Connect React/Vite pages and implement report/graph/roadmap views.
7. Deploy with secret manager, restricted CORS, rate limits, upload limits, and monitoring.
