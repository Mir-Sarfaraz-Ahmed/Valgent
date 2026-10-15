# Valgent — Backend Implementation Plan

This is the task-level execution plan for `backend.md`. It is deliberately ordered to produce usable vertical slices instead of building every subsystem at once.

## Architecture decision

- **API:** Express 5 + TypeScript + Zod.
- **Identity:** Firebase Authentication client SDK + Firebase Admin token verification.
- **Persistent data:** Firestore.
- **Private uploads/artifacts:** Firebase Storage.
- **Long-running jobs:** BullMQ + Redis-compatible managed service; Firestore remains the canonical job/run record.
- **Analysis:** existing `GithubFetcher`, mapper, analyzers, evidence graph, Gemini/OpenRouter router, validation/auditor, roadmap and Docker sandbox.
- **UI reference:** `reference/valgent-first-mockup.png`, the first generated 4-page collage (Landing, Sign up, Projects, Workspace).

## 1. Backend boundaries

| Boundary | Owns | Must not own |
|---|---|---|
| Controller | HTTP validation, status code, response mapping | Graph logic or claim verdict rules |
| Service | Project/document/run workflow and authorization | Scattered raw Firestore SDK logic |
| Repository | Firestore queries, transactions, persistence | Express request/response objects |
| Queue adapter | Enqueue, retry, status and job IDs | Evidence/claim policy |
| Worker | Run analysis, update stage/heartbeat, persist output | Holding browser requests open |
| `AnalysisRunner` | Compose existing analysis domain modules | User/project CRUD |
| Storage adapter | Private upload/read/delete, metadata | Trusting user filename as a path |

## 2. Implementation phases

### Phase 0 — Baseline and API contracts

- Run `npm install`, `npm run build`, `npm test`, `npm run lint`; record failures before refactoring.
- Add tests for current `POST /api/v1/analyze` request, response and error behavior.
- Freeze shared schemas/enums: claim status, run status, analysis stage, evidence anchors and roadmap task.
- Record limitations honestly: README-only document parsing, JS/TS-focused analyzer, synchronous endpoint, and no confirmed auth/project persistence/queue.

**Exit criteria:** baseline behavior is covered by tests and current-vs-planned functionality is documented.

### Phase 1 — Server foundation and security middleware

- Add Zod startup validation for `PORT`, `WEB_ORIGIN`, Firebase settings, Storage bucket, `REDIS_URL`, AI API keys and upload/analysis limits.
- Add request ID, Helmet, strict CORS, JSON body limit, rate limits and normalized error middleware.
- Review Git subprocess use; validate repository host/path/ref/SHA and use `execFile` with argument arrays rather than interpolated shell strings.
- Apply secret redaction to evidence-to-LLM path, logs, error output and reports.
- Add safe `/health` and `/ready` responses.

**Exit criteria:** invalid requests return stable errors, dangerous ref strings are rejected, and startup/errors do not leak credentials.

### Phase 2 — Authentication and ownership

- Implement Firebase Auth signup/login in the frontend; do not store passwords in Express.
- Add Firebase Admin `requireAuth` middleware.
- Set trusted request `uid` from the verified token; ignore/reject client `ownerId`.
- Implement reusable project/document/run ownership guards, including graph/report/roadmap fetches through their parent run/project.
- Add `GET /api/v1/me` with safe display name/avatar fields.
- First MVP: public GitHub repositories only unless private-repo OAuth is completed.

**Exit criteria:** missing/invalid token returns `401`; cross-account resource access cannot read or mutate records and does not reveal if the ID exists.

### Phase 3 — Firestore repositories and project CRUD

- Add repository interfaces for projects, documents, runs, jobs, evidence and roadmap tasks.
- Add create/list/detail/update/archive project endpoints.
- Validate name, description, URL and branch/ref fields; add cursor pagination and supported filters.
- Add required indexes and rules; prefer backend-only Firestore access and deny client direct reads/writes by default.
- Archive by default so report history stays linked; hard deletion requires a separate explicit purge policy.

**Exit criteria:** two test accounts see only their own projects; dashboard supports real empty/loading/error/search/pagination states.

### Phase 4 — Upload and requirement parsing

- Add multipart upload endpoint with per-file, total-size and file-count limits.
- Add tested parser adapters for PDF, DOCX, PPTX, TXT and Markdown; enable UI formats only when ready.
- Store source files privately under random keys. Preserve original filename as metadata only.
- Normalize extracted text into anchored sections (page/slide/heading/line) and discrete claims/requirements.
- Store hash, parser version and state: `UPLOADED`, `PARSING`, `READY`, `FAILED`.
- Add MIME sniffing, parser timeouts, archive expansion limits and safe temp-file cleanup.

**Exit criteria:** uploaded files are marked Ready only when parsing succeeds, and extracted claims can cite their exact source anchors.

### Phase 5 — Persisted analysis runs and queue

- Extract the current `POST /api/v1/analyze` pipeline into `AnalysisRunner`.
- Add `POST /api/v1/projects/:projectId/analyses`; create `analysisRuns` + `jobs` in Firestore, enqueue in BullMQ and return `202`.
- Use `analysisId` as stable queue key. Add `Idempotency-Key`, request hash and conflict handling.
- Create `worker.ts`, job heartbeat/stage updates, bounded retries/backoff and failed-job inspection.
- Set global worker concurrency and per-user active-run limits based on Docker resource usage.
- Do not implement cancellation until worker, child process and containers can be terminated and cleaned safely.

**Exit criteria:** request returns promptly; queued work survives a worker restart; network retries do not launch duplicate analyses; status polling reflects true state.

### Phase 6 — Reports, evidence, graph and roadmap persistence

- Persist run input fingerprints, commit SHA, document hashes, report schema version and diagnostics.
- Persist evidence records with source/line anchors, content hashes and redacted snippets/references.
- Persist graph as JSON or a size-limited private artifact; retain stable node/edge IDs.
- Persist roadmap tasks with reasons, evidence refs, actions, dependencies when known and acceptance criteria.
- Add run history, report detail, evidence graph and roadmap endpoints.
- Audit that references resolve before marking a report complete; keep each run immutable.

**Exit criteria:** refreshing the browser reloads the same report/graph/roadmap; recheck creates a new report history row.

### Phase 7 — AI reliability and cost controls

- Keep deterministic scanning before semantic AI reasoning.
- Route to Gemini/OpenRouter with timeouts and explicitly configured fallback order.
- Validate model output with Zod and cross-check evidence/graph IDs; invalid IDs cannot become valid citations.
- Redact secrets before provider calls; treat repository/doc text as untrusted content rather than instructions.
- Bound selected files, text chunks, total tokens and output size; avoid sending the entire repository.
- Cache against commit SHA + normalized document hashes + analyzer/prompt/schema version + options.
- Preserve deterministic results on provider failure and label the run degraded when appropriate.

**Exit criteria:** provider timeout/fallback and malformed-response tests pass; cache invalidates when inputs or relevant versions change.

### Phase 8 — UI integration and production readiness

- Add typed API client, auth-token attachment, safe error mapping and analysis polling.
- Stop polling terminal runs; refresh project summary and report history after completion.
- Configure production CORS, secret manager, dependency/secret scan, queue health alerts and retention.
- Deploy API and worker separately. Ensure the worker's Docker approach does not expose host credentials/socket to untrusted analyzed code.
- Run an end-to-end smoke test against a dedicated supported repository.

**Exit criteria:** a fresh user can sign up, create project, upload requirements, analyze, watch progress, view claims/evidence/roadmap and recheck a new commit without mock data.

## 3. Endpoint checklist

| Endpoint | Priority | Phase |
|---|---|---|
| `GET /health`, `GET /ready` | P0 | 1 |
| `GET /api/v1/me` | P0 | 2 |
| `POST/GET /api/v1/projects` | P0 | 3 |
| `GET/PATCH/DELETE /api/v1/projects/:projectId` | P0 | 3 |
| `POST/GET /api/v1/projects/:projectId/documents` | P0 | 4 |
| `DELETE /api/v1/projects/:projectId/documents/:documentId` | P1 | 4 |
| `POST /api/v1/projects/:projectId/analyses` | P0 | 5 |
| `GET /api/v1/analyses/:analysisId/status` | P0 | 5 |
| `GET /api/v1/projects/:projectId/analyses` | P0 | 6 |
| `GET /api/v1/analyses/:analysisId` | P0 | 6 |
| `GET /api/v1/analyses/:analysisId/evidence-graph` | P0 | 6 |
| `GET /api/v1/analyses/:analysisId/roadmap` | P0 | 6 |
| `GET /api/v1/projects/:projectId/reports` | P1, may alias analysis list | 6 |
| `POST /api/v1/analyses/:analysisId/cancel` | P2; only when safe | 8 |

Firebase handles user signup/login via the SDK; Express must not be a password server.

## 4. Environment configuration

```env
NODE_ENV=development
PORT=3000
WEB_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=
OPENROUTER_API_KEY=
MAX_UPLOAD_BYTES=10485760
MAX_FILES_PER_PROJECT=20
ANALYSIS_TIMEOUT_MS=120000
```

Validate the environment at startup. Production credentials go in the deployment secret manager, never in frontend `VITE_*` variables or Git.

## 5. Data, consistency and status rules

- `ownerId` comes only from verified auth.
- Each run records repository URL/ref, resolved commit SHA, document hashes, analyzer/schema version and options fingerprint.
- Reports are immutable per run; `project.latestAnalysisId` is only a pointer.
- Job lifecycle status and claim-verification status are distinct.
- Do not show a percentage unless stage weights are defined; otherwise show the current stage.
- Evidence anchors must identify source file/line/page/slide when available.
- Cap and redact source snippets, stdout/stderr and LLM payloads.
- A generated roadmap stays a recommendation until user task-state persistence is implemented.

## 6. Security acceptance checklist

- [ ] Every private endpoint verifies a token.
- [ ] Every resource is checked against owner and parent project/run relationships.
- [ ] Repo URL/ref/SHA are validated; Git uses argument arrays.
- [ ] Upload extension/MIME/size/count/parser timeout/archive expansion are checked.
- [ ] Secret redaction runs before LLM calls, logs and stored reports.
- [ ] Prompt-injection text cannot change tool policy or allowed actions.
- [ ] Docker execution has no host secrets/exposed host files, resource limits and cleanup.
- [ ] Per-user and global rate/concurrency limits are active.
- [ ] Idempotency, queue retries, worker crash and duplicate messages are tested.
- [ ] Responses never leak stack traces, tokens or raw server paths.

## 7. Recommended order for a small team

1. Baseline tests and shared contracts.
2. Auth + project persistence + CRUD.
3. Projects dashboard from real APIs.
4. Upload/parser pipeline.
5. Async queue + worker + polling.
6. Persist/report/evidence/graph/roadmap APIs and workspace integration.
7. Recheck history, exports, security hardening and deployment.
