# Valgent — Backend Architecture & API Specification

**Status:** Target implementation plan. Existing capabilities and planned SaaS additions are labelled separately.  
**Current backend:** Node.js + TypeScript + Express 5.  
**Recommended SaaS services:** Firebase Authentication, Firestore, Firebase Storage, BullMQ + Redis-compatible queue.  
**Architecture rule:** retain the current analysis engine as domain logic and add auth, persistence, queueing and product APIs around it.

## 1. What the backend must do

The backend owns trusted identity, project data, document ingestion, analysis execution, evidence-backed results and the report lifecycle. The React frontend must never decide a claim verdict or execute repository code itself.

1. Authenticate each private request and derive the owner from a verified token.
2. Create/list/update/archive projects belonging to the signed-in user.
3. Accept repository metadata and requirements files, validate them and pin immutable input fingerprints.
4. Dispatch long-running jobs to a durable queue instead of holding HTTP requests open.
5. Run discovery, static/semantic analysis, optional sandbox execution, graph building, claim evaluation/audit and roadmap generation.
6. Persist immutable analysis runs and reports, evidence, graph data, job stages and diagnostics.
7. Expose progress, reports, evidence graph and roadmap through owner-protected APIs.
8. Apply upload limits, rate limits, secret redaction, prompt-injection safeguards and Docker isolation.
9. Return schema-validated JSON and make incomplete/degraded results explicit.

## 2. Current backend baseline (confirmed in the uploaded repository ingest)

The uploaded backend already has:

- Node.js, strict TypeScript, Express 5, Zod validation, `GET /health` and `POST /api/v1/analyze`.
- `GithubFetcher`: clone/fetch a GitHub repository to a temporary workspace and resolve commit metadata.
- `ProjectMapper`: basic language, directory, package-manager, entry-point, script, dependency and framework hints.
- `DocumentAnalyzer`: reads root `README.md` up to 5,000 characters. It does **not** yet parse user-uploaded PDF/DOCX/PPTX files.
- `StaticAnalyzer` + TypeScript Compiler API parser: JS/TS-family symbols, imports, calls, Express-like routes, database operations and React components.
- `EvidenceEngine` and graph modules to model claims/requirements/evidence and code/execution relationships.
- Gemini and OpenRouter providers behind `LLMRouter` for structured reasoning and claim validation.
- `ExecutionOrchestrator` and Docker sandbox for supported install/build/test phases with resource/network controls.
- Validation evaluator/planner/orchestrator/safety policy, `ReportAuditor`, deterministic remediation roadmap, error classification and pipeline tracker.
- `ProjectReport` JSON response and Jest tests around parser, graph, provider, sandbox and validation behavior.

### Limitations to make visible

- The current analysis route is synchronous and returns after analysis finishes.
- No production Firebase token middleware, project CRUD, durable SaaS persistence, job queue/status route or full user-upload parser is visible in the ingest.
- Private GitHub OAuth/token handling is not visible.
- Static analysis is focused on JavaScript/TypeScript-family projects, not every language.
- The current analysis request accepts claims from the caller; extracting claims from uploaded requirements and retaining their source anchors is additional work.

Do not rewrite these domain modules just to create the SaaS UI. Put reusable orchestration around them and preserve their tests.

## 3. Target architecture

```text
Browser: React + Vite
  ├─ Firebase Auth SDK (signup/login, ID token)
  └─ Typed API client ─────────────────────────────────┐
                                                       │ HTTPS
                                                       ▼
Express API service
  ├─ Zod request/response validation, request IDs, CORS, rate limits
  ├─ Firebase Admin token verification + owner authorization
  ├─ Project / document / analysis / report controllers
  ├─ Services + Firestore repositories + private Storage adapter
  └─ AnalysisJobService ── enqueue ──► BullMQ + Redis
                                        │
                                        ▼
                                  Analysis worker
                                   1. Load pinned run inputs
                                   2. Fetch repository commit
                                   3. Parse normalized requirements
                                   4. Map project + static analysis
                                   5. Optional safe Docker checks
                                   6. Build/query evidence graph
                                   7. Targeted LLM reasoning + fallback
                                   8. Validate claims and audit references
                                   9. Generate roadmap + report
                                  10. Persist result and finish run

Firebase Auth = identity | Firestore = canonical application metadata
Firebase Storage = private original uploaded files / large artifacts
Redis = queue delivery/retry only, not source of truth
```

### Decisions

- **Separate API and worker processes** from one TypeScript codebase. The API accepts requests; the worker runs analysis.
- **Firestore** is the canonical store for projects, document metadata, runs, job state, evidence, reports and roadmap records.
- **BullMQ + Redis-compatible service** handles durable background jobs, retry and backoff. Local development may run Redis with Docker Compose; production should use a managed Redis-compatible service. Firestore remains the authoritative run state.
- **Firebase Authentication** handles accounts. Express verifies Firebase ID tokens with Firebase Admin.
- **Firebase Storage** keeps uploaded requirements private. Upload validation and ownership checks happen on the server.
- **Repositories and service boundaries** keep Firestore calls out of analysis logic. Queue, storage and persistence should be replaceable behind interfaces.

## 4. Recommended code organization

```text
src/
  index.ts                       # API process entry
  worker.ts                      # queue worker entry
  app.ts                         # Express app and middleware
  config/env.ts                  # validated environment
  api/routes.ts
  api/controllers/               # request/response adapters
  api/middleware/                # auth, ownership, limits, request ID
  schemas/                       # Zod API schemas
  services/                      # projects, documents, analysis jobs, reports
  repositories/                  # Firestore repositories
  queue/                         # AnalysisQueue interface + BullMQ adapter
  workers/analysis-worker.ts
  storage/                       # Firestore and Firebase Storage adapters
  ingestion/                     # parsers, claim normalizer, upload policy
  analyzers/ github/ evidence/ llm/ sandbox/ validation/ shared/ # existing domain modules
```

This is a target organization, not a requirement to create every empty file upfront. Controllers should be thin; services own application rules; repositories own persistence; analysis modules own evidence and verification rules.

## 5. API contract

New SaaS endpoints use `/api/v1`. Use `camelCase` for new public SaaS request/response objects; an adapter maps into existing core `snake_case` types. Keep current `POST /api/v1/analyze` temporarily for compatibility while the queued path is validated. `/api/reports` routes appearing under a test fixture are not Valgent API routes.

### Identity

| Method | Path | Purpose | Access |
|---|---|---|---|
| `GET` | `/health` | Liveness response | Public, no secrets |
| `GET` | `/ready` | Dependency/readiness status | Operational only, safe response |
| `GET` | `/api/v1/me` | Safe current account profile | Authenticated |

Firebase client SDK handles signup/login; Express should not implement its own password store.

### Projects

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/projects` | Create a project for authenticated user |
| `GET` | `/api/v1/projects` | Owner-only paginated list; search/filter |
| `GET` | `/api/v1/projects/:projectId` | Get one owned project |
| `PATCH` | `/api/v1/projects/:projectId` | Update permitted metadata/default ref |
| `DELETE` | `/api/v1/projects/:projectId` | Soft archive by default; keep report history |

Create accepts `name`, optional `description`, `repositoryUrl` and optional `defaultBranch`. The backend assigns `ownerId` from the verified token; reject or ignore a client-supplied owner.

### Documents

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/projects/:projectId/documents` | Upload requirements/planned files (multipart) |
| `GET` | `/api/v1/projects/:projectId/documents` | List file metadata and parse status |
| `DELETE` | `/api/v1/projects/:projectId/documents/:documentId` | Remove/unlink an owned document |

Initial parser scope: PDF, DOCX, PPTX, TXT and Markdown. Do not advertise a format as supported until its parser and tests exist.

### Analyses, reports and results

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/projects/:projectId/analyses` | Start initial analysis or Recheck; returns `202` |
| `GET` | `/api/v1/projects/:projectId/analyses` | Immutable run history |
| `GET` | `/api/v1/analyses/:analysisId/status` | Queue/run status and current stage |
| `GET` | `/api/v1/analyses/:analysisId` | Versioned report or terminal failure state |
| `GET` | `/api/v1/analyses/:analysisId/evidence-graph` | Graph nodes/edges and metadata |
| `GET` | `/api/v1/analyses/:analysisId/roadmap` | Roadmap tasks from that run |
| `GET` | `/api/v1/projects/:projectId/reports` | Report history view; may alias runs |
| `POST` | `/api/v1/analyses/:analysisId/cancel` | Optional; only after safe cancellation works end-to-end |

One endpoint handles initial analysis and recheck. Each accepted request creates a new run unless the same owner repeats the same operation with the same idempotency key and request hash.

### Start-analysis request

```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "ref": "main",
  "commitSha": null,
  "documentIds": ["doc_123"],
  "claims": [{ "claimId": "CLM-001", "text": "Google sign-in is implemented" }],
  "options": { "runBuild": true, "runTests": true, "allowLlmReasoning": true }
}
```

All fields need Zod validation. Restrict repository URLs to supported GitHub hosts/paths. Validate refs/SHAs and never interpolate them into shell commands. Verify that every selected document belongs to the current user and project. Server policy must retain mandatory security limits even if a user disables optional checks.

### Queue and status contracts

Start returns immediately:

```json
{
  "analysisId": "analysis_123",
  "projectId": "project_123",
  "status": "QUEUED",
  "statusUrl": "/api/v1/analyses/analysis_123/status"
}
```

Status returns `status`, `stage`, optional calibrated `progress`, `createdAt`, `updatedAt`, `startedAt`, `finishedAt`, safe message and retryability. Do not expose raw logs, server paths, secrets or stack traces.

- **Run status:** `QUEUED`, `RUNNING`, `COMPLETED`, `DEGRADED`, `FAILED`, `CANCELLED` (last only when cancellation is implemented).
- **Stage:** `QUEUED`, `INGESTING`, `DOCUMENT_PARSING`, `PROJECT_MAPPED`, `STATIC_ANALYSIS`, `DYNAMIC_ANALYSIS`, `EVIDENCE_BUILT`, `LLM_SYNTHESIS`, `AUTONOMOUS_VALIDATION`, `REPORT_AUDITED`, `PERSISTING`, `COMPLETED`.
- **Claim status:** `VERIFIED`, `PARTIALLY_VERIFIED`, `NOT_VERIFIED`, `INSUFFICIENT_EVIDENCE`.

These enums are separate. `DEGRADED` means useful output exists, but a provider/parser/runtime/check was unavailable. Skipped stages need an explicit reason. Poll every 2–3 seconds during active analysis initially, then slow down; stop at terminal state. SSE is a future enhancement, not an MVP requirement.

### Error envelope

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The repository URL is not valid.",
    "requestId": "req_123",
    "retryable": false,
    "details": []
  }
}
```

Use stable public error codes, adapting current `src/shared/errors.ts` classifications. Never return stack traces, tokens, secrets or raw internal paths.

## 6. Authentication and authorization

1. Firebase client SDK creates the user session.
2. The API client sends `Authorization: Bearer <Firebase ID token>`.
3. `requireAuth` verifies the token with Firebase Admin and sets trusted `uid` on request context.
4. Repository queries include `ownerId == uid`, or the service checks resource ownership before returning data.
5. Documents, analyses, evidence, graph, report and roadmap access must be checked against the owning project/run, not just an opaque ID.
6. Return generic `404 NOT_FOUND` for inaccessible cross-user resources to avoid revealing their existence.

Never trust `ownerId` from the browser. If app data is accessed only via Express/Admin SDK, deny direct client Firestore access by default. If direct client access is added later, implement and test per-owner rules first.

**GitHub authorization is separate from Valgent sign-in.** First release can support public repositories and label that clearly. Private repo support requires least-privilege GitHub OAuth, secure token storage, refresh/revocation handling and tests. Never ask users to paste a PAT into plain text.

## 7. Firestore persistence model

| Collection | Key fields |
|---|---|
| `profiles` | `uid`, safe display name/avatar, timestamps |
| `projects` | `id`, `ownerId`, `name`, `description`, `repositoryUrl`, `defaultBranch`, `archivedAt?`, `latestAnalysisId?`, timestamps |
| `documents` | `id`, `ownerId`, `projectId`, `originalName`, `mimeType`, `sizeBytes`, `storagePath`, `contentHash`, `parserVersion`, `parseStatus`, source anchors, timestamps |
| `analysisRuns` | `id`, `ownerId`, `projectId`, `status`, `stage`, requested ref, resolved `commitSha`, `documentHashes[]`, `schemaVersion`, `reportRef?`, diagnostic summary, provider/runtime metadata and timestamps |
| `jobs` | `analysisId`, `ownerId`, `queueJobId`, attempt, heartbeat/lease, last safe error code and timestamps |
| `evidence` | `id`, `ownerId`, `projectId`, `analysisId`, type/source/path/line anchors, content hash, redacted snippet or artifact ref, metadata |
| `roadmapTasks` | `id`, `ownerId`, `projectId`, `analysisId`, claim ref, title/problem, evidence refs, recommended actions, dependencies, criteria, optional user task state |
| `idempotencyKeys` | `ownerId`, key hash, operation, request hash, resulting run ID, expiry |

Embed small reports in the run or store a private JSON artifact with `reportRef` when large; avoid two mutable report copies. Store graph JSON with the run or as a bounded private artifact. Limit stdout/stderr and redact it.

Add `firestore.indexes.json` for real queries such as owner + archive state + updated time for projects, project + creation time for runs, and project + creation time for documents. Commit security rules. If Firestore access is backend-only, client rules default to deny. Update `projects.latestAnalysisId` only as a pointer to a successfully created run; failure runs still remain in history.

## 8. Durable job lifecycle and reliability

1. Validate request, token, ownership, selected docs and idempotency key.
2. Create an `analysisRuns` record and `jobs` record in `QUEUED` state.
3. Enqueue using `analysisId` as the stable queue job key; return `202`.
4. Worker claims job, updates stage and heartbeat, and loads pinned inputs.
5. Worker calls `AnalysisRunner`; each stage updates status through `RunStatusRepository`.
6. On success persist report/evidence/graph/roadmap and finish `COMPLETED` or `DEGRADED`.
7. On failure persist safe error code, failed stage, retryability and partial diagnostics; mark `FAILED` when retry budget is exhausted.
8. Always clean cloned repos, temporary uploads and containers in `finally` paths.

Reliability rules:

- Queue is at-least-once; worker must be idempotent for each `analysisId`.
- Use bounded attempts and exponential backoff; do not retry invalid requests or policy/security rejections.
- Heartbeats/watchdog recover stale `RUNNING` jobs.
- Keep worker concurrency low initially because a job may use Docker CPU/RAM; enforce per-user active job limits.
- Reuse an idempotency key with the same request returns the original run; same key with different request returns `409 IDEMPOTENCY_CONFLICT`.
- Do not promise cancellation until container/process/queue termination and cleanup work safely end-to-end.

## 9. Document ingestion and requirement normalization

The current analyzer only reads root README. User-upload parsing is new work.

1. Authenticate and verify project ownership before allocating storage.
2. Restrict types to PDF/DOCX/PPTX/TXT/Markdown only after parser support exists.
3. Enforce file count, per-file/total size, MIME sniffing, parse timeout and archive expansion limits (PPTX is ZIP-based); add malware scanning if available.
4. Store under a random key; treat original filenames as display metadata only.
5. Extract text with stable anchors: PDF page, DOCX heading/paragraph, PPTX slide, Markdown heading/line.
6. Normalize content into sections and atomic claims/requirements; keep document ID and source anchor.
7. Hash normalized content; cache only when parser version and input hash match.
8. Redact secrets before content reaches LLMs, logs, diagnostics or reports.
9. State transitions: `UPLOADED`, `PARSING`, `READY`, `FAILED`. Do not show “Ready” before extraction succeeds.

Demo/video processing is not in the first MVP; omit it or mark it planned until a real processor is implemented and tested.

## 10. AnalysisRunner responsibilities

The worker should invoke one shared application service rather than reimplement route logic:

1. Load the run, project, pinned commit and document versions.
2. Fetch repository with a safe Git process API; validate host/ref/commit.
3. Map project and record language/support limitations.
4. Parse README and uploaded files; normalize document/user claims while preserving source provenance.
5. Run deterministic static/semantic analysis first.
6. Optionally install/build/test supported JS/TS projects in Docker.
7. Build graph and query bounded claim subgraphs.
8. Send only selected, redacted evidence chunks to LLM; validate schema and use configured provider fallback.
9. Run validation planner/safety policy/orchestrator, auditor and graph-reference checks.
10. Generate roadmap tasks derived from observed gaps, not a generic template.
11. Validate report schema; persist report/evidence/graph/roadmap; update latest-run pointer; finish run.
12. Clean workspaces/containers and write sanitized audit metadata.

Never send a full repo dump to an LLM. Cache only against commit SHA, normalized document hashes, analyzer/prompt/schema versions and relevant options. A change to any cache key component invalidates the affected result.

## 11. Docker sandbox and security

The repository README documents read-only root FS, tmpfs, CPU/memory/PID caps, dropped Linux capabilities, `no-new-privileges`, non-root execution, restricted networking, no Docker socket/host home mount, no host secrets in the container, allow-listed package manager commands and ephemeral cleanup. Verify actual invocation and add regression tests for these guarantees before public use.

Required hardening:

- Review `GithubFetcher` shell calls. Validate `commitSha`/ref and prefer `execFile` with argument arrays over interpolated shell strings.
- Never accept browser-provided shell commands, scripts, Docker flags or arbitrary action types.
- Dependency install may need network; enable it only for that phase and pass no application secrets. Build/test phases should be network-disabled unless specifically justified.
- Test redaction across LLM context, command output, error detail, report and logs—not merely console log output.
- Treat README/source/docs as untrusted data, never instructions for the agent.
- Cap archive expansion, file size, output/log size, runtime, CPU, memory, PID count and concurrent jobs.
- Clean up repos, temporary files and containers on success, failure, timeout and supported cancellation.

## 12. Report contract and truth rules

Keep the existing `ProjectReport` meaning: `schema_version`, `analysis_run_id`, project/architecture, repository commit, timestamps/duration/stages, claim summary, requirements/claims, evidence, evidence graph, validation audit trail, roadmap, diagnostics, provider state, execution telemetry and analysis metadata. Add a versioned adapter for persistence rather than casually changing domain types.

- Validate report JSON with Zod before storing/serving.
- Every evidence reference must resolve to a real evidence record; every graph reference to a real graph node/edge.
- Absence of evidence is not automatically contradiction. Use `INSUFFICIENT_EVIDENCE` unless evidence conflicts with the claim.
- A dependency, component name or README claim alone does not prove an end-to-end feature.
- Skipped, unsupported or timed-out checks must not appear as passing.
- Provider outage may result in a `DEGRADED` run if deterministic findings are usable.
- No submitted claims means zero claims assessed, not a 100% pass rate.
- Reports are immutable per analysis run; Recheck creates another run.

## 13. Observability and service controls

Add `helmet`, restricted CORS, per-route rate limits, body/upload limits, request IDs and normalized error middleware. Validate required environment variables at startup and fail fast using sanitized messages.

Log structured fields such as request ID, analysis ID, project ID, stage, duration, queue attempt, provider name, safe error code, execution phase status and cleanup result. Do not log auth tokens, GitHub tokens, AI keys, raw file text, full prompts or source files.

Monitor queue depth/job age, stage latency, retries/worker crashes, provider timeout/fallback rates, token/cost estimates, parser/upload failures, sandbox timeouts/cleanup failures, API 401/403/404/429/5xx rates. Define retention for uploads, artifacts and logs and give users an archive/delete flow.

## 14. Testing and Definition of Done

- **Unit:** schemas, ownership helpers, state transitions, idempotency, redaction, status semantics, graph refs and roadmap consistency.
- **Integration:** Firebase token verification, Firestore repositories, Storage authorization, queue enqueue/retry/replay and worker persistence.
- **API:** every route plus invalid token, cross-user ID, bad repo/ref, oversized/malformed file, duplicate idempotency key and rate-limit response.
- **Worker E2E:** supported repository through status stages to report/graph/roadmap; provider outage; sandbox fail/timeout; worker restart/retry.
- **Security:** shell injection, path traversal, prompt injection, secret leakage, archive bomb, unauthorized artifact access, SSRF attempts and command allow-list violations.

Backend is ready for a usable MVP when a signed-in user can create private projects, upload and parse supported files, start an analysis that returns `202`, follow real progress after refresh, read an immutable evidence-backed report/graph/roadmap, and recheck without overwriting history; security tests and existing tests pass, and build/lint succeed.

## 15. Migration path

1. Run the current build/test/lint suite and freeze the current report schema.
2. Extract `/api/v1/analyze`'s pipeline into an `AnalysisRunner` used by both legacy route and worker.
3. Add validated configuration, safe process invocation, request/error middleware and redaction.
4. Add auth/ownership and Firestore project APIs.
5. Add upload/parser pipeline.
6. Add persisted analysis runs and BullMQ worker; do not switch the frontend yet.
7. Persist report/evidence/graph/roadmap and expose result APIs.
8. Integrate UI polling/history, run security tests, deploy API and worker.

Keep `POST /api/v1/analyze` as an internal/compatibility route until queued API integration tests pass. Use a feature flag to turn off queued public analysis if worker health drops.
