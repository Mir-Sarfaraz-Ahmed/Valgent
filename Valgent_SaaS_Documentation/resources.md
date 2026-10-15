# Valgent — Repository Resources & Capability Map

This document maps the uploaded `mir-sarfaraz-ahmed-valgent-8a5edab282632443(1).txt` repository ingest to product capabilities. It distinguishes what the code contains from what the SaaS UI still needs.

## 1. Repository overview

The ingest describes a Node.js + TypeScript backend called **Valgent**. Its core analysis modules are organized under `src/`; tests are under `tests/`. It is not a complete frontend SaaS repository: no React/Vite application, user-authentication integration, project database, or document-upload service is visible in this ingest.

```text
src/
├── index.ts
├── api/routes.ts
├── agents/
│   ├── environment.ts
│   └── execution.ts
├── analyzers/
│   ├── document.ts
│   ├── mapper.ts
│   ├── static.ts
│   └── semantic/ (parser, types)
├── evidence/ (engine, graph builder/query/types/graph)
├── github/fetcher.ts
├── llm/ (Gemini, OpenRouter, provider contract, router)
├── sandbox/docker.ts
├── shared/ (errors, pipeline tracker, types)
└── validation/ (auditor, engine, evaluator, orchestrator, planner, roadmap, safety)
```

## 2. Module-to-product mapping

| Resource | What the ingest shows | Product use |
|---|---|---|
| `src/index.ts` | Express service; `/health`; mounts API router at `/api/v1`; port defaults to 3000. | Health checks and server entry point. |
| `src/api/routes.ts` | Main `POST /analyze` pipeline, Zod request schema, policy options, report response, error classification, secret-redacted logs. | The API adapter used by the workspace's Analyze/Recheck action. Must be extended for user auth, project CRUD, uploads, and async jobs. |
| `src/github/fetcher.ts` | Validates a GitHub URL, clones to a temporary directory, resolves commit/branch metadata, cleans up the temp directory. | Repository connection and repeatable commit-level analysis. OAuth/private-repository support is not visible. |
| `src/analyzers/mapper.ts` | Detects selected JS/TS languages, top-level folders, common entry-point names, lockfiles, package scripts, dependency list, and some frameworks from `package.json`. | Technology stack and repository overview card. Root-level mapping is heuristic rather than a complete framework detector. |
| `src/analyzers/document.ts` | Reads repository-root `README.md` if present, capped at 5,000 characters, and records it as evidence. | Current documentation evidence. Uploaded PDF/DOCX/PPTX/TXT/MD parsing is not implemented in this module. |
| `src/analyzers/static.ts` | Recursively gathers files, then runs the semantic parser for supported JS/TS repositories and records findings into the evidence engine. | Static/semantic analysis panel and source-linked evidence. It explicitly records that non-JS/TS analysis is not fully supported. |
| `src/analyzers/semantic/parser.ts` | Uses the TypeScript Compiler API; extracts JS/TS/JSX/TSX symbols, imports, calls, Express-like route declarations, React components, and heuristically detected database operations. | Evidence graph nodes and architecture details. Its call resolution is intentionally simple and can mark calls unresolved. |
| `src/analyzers/semantic/types.ts` | Data contracts for AST symbols, imports/exports, calls, API routes, DB operations, React components, and semantic project. | Typed frontend/backend data mapping. |
| `src/evidence/engine.ts` | Creates and stores evidence records with IDs, type, location, content hash, description, source, line range, classification, and metadata. | Evidence list, detail drawer, source citations, and report JSON. |
| `src/evidence/graph-builder.ts` | Builds nodes/edges for claims, requirements, evidence, symbols, routes, calls, database operations, and execution information, including cross-file relationships. | Evidence Graph page. |
| `src/evidence/graph-query.ts` | Retrieves bounded claim subgraphs and related evidence. | Claim detail view and targeted validation. |
| `src/evidence/graph-types.ts`, `graph.ts` | Graph node/edge types, graph operations, serialization, completeness markers. | Consistent graph JSON and filtering. |
| `src/llm/provider.ts` | Typed Zod schemas for structured analysis/claim validation and a provider interface. | Stable UI contract for statuses and findings. |
| `src/llm/gemini.ts` | Gemini provider; structured JSON prompts for architecture summary and claim status; requires `GEMINI_API_KEY`. | LLM-backed meaning/contradiction reasoning, when configured. |
| `src/llm/openrouter.ts` | OpenRouter provider; structured JSON requests; requires `OPENROUTER_API_KEY`. | Alternate provider. |
| `src/llm/router.ts` | Provider fallback loop and last-used-provider tracking. | Provider diagnostics. Show a degraded state if every provider fails. |
| `src/agents/environment.ts` | Resolves Node/Bun runtime versions from selected files/config and records environment telemetry. | Environment detail in the report. |
| `src/agents/execution.ts` | Detects npm/yarn/pnpm/bun; orchestrates discovery, install, build, and test phases; stores command output evidence; records exit status, duration, network flag, and container limits. JS/TS only. | Sandbox checks and build/test proof. Every phase needs an honest status. |
| `src/sandbox/docker.ts` | Docker execution with configurable network, timeout, memory, CPU, PID limits, no-new-privileges/capability drop/read-only behavior and cleanup. See `README.md` security model. | Isolated verification actions against untrusted repository code. |
| `src/validation/evaluator.ts` | Deterministically evaluates implementation/execution/test/contradiction/evidence-sufficiency signals for a claim. | Initial claim evidence assessment. |
| `src/validation/planner.ts` | Selects useful verification actions such as BUILD, TEST, or TARGETED_TEST from current evaluation state. | Bounded “verify more” step. |
| `src/validation/safety.ts` | Allow-list of action types and command construction; rejects unsupported action types and certain shell-metacharacter targets; applies conservative sandbox defaults. | Guardrail between a recommendation and actual execution. |
| `src/validation/orchestrator.ts` | Runs bounded claim-validation loops, queries claim subgraphs, selects non-duplicate actions, applies safety policy, adds new evidence, then validates claims and emits audit trail/roadmap. At most three action-loop iterations per claim. | Workspace progress and action audit trail. |
| `src/validation/engine.ts` | Aggregates validation results, warnings, audit trail, and roadmap. | Final verification result and metrics. |
| `src/validation/auditor.ts` | Audits LLM/deterministic validation outputs against available evidence and graph references; invalid evidence references can downgrade a claim. | Report integrity before rendering a definitive verdict. |
| `src/validation/roadmap.ts` | Creates deterministic remediation tasks for partial implementation, failed execution/tests, or present implementation without execution/test proof. Tasks include evidence refs, recommended actions, and acceptance criteria. | Roadmap page with traceable next steps. |
| `src/validation/` and `src/shared/types.ts` | Shared statuses and typed report, evidence, validation, execution and analysis-stage models. | Avoids UI and API inventing incompatible fields. |
| `src/shared/errors.ts` | Error classification and secret-redaction helpers used by API logging/report failure handling. | Clear retryable/non-retryable error messaging. |
| `src/shared/pipeline.ts` | Tracks analysis ID, current/completed stages, execution IDs, evidence IDs and provider metadata. | Real pipeline status and report metadata. Current route still returns a synchronous result. |

## 3. Existing API surface

The core service mounts its router at `/api/v1`.

| Method | Path | Status | Purpose |
|---|---|---|---|
| `GET` | `/health` | Exists in `src/index.ts` | Simple service health response. |
| `POST` | `/api/v1/analyze` | Exists in `src/api/routes.ts` | Runs analysis and returns `{ analysis_id, status, report }` on success. The request accepts `repository_url`, optional `commit_sha`, optional `project_id`, optional claim array, analysis options, execution policy, and LLM policy. |

The `/api/reports` handlers visible later in the ingest are inside a **test fixture project** under `tests/fixtures/semantic-project/...`; they are not Valgent API endpoints. Do not use them as a source for the SaaS API contract.

## 4. Existing request options

The current analyze request schema includes:

- `repository_url` (required URL string)
- `commit_sha?`
- `project_id?`
- `claims?: [{ claim_id, text }]`
- `analysis_options?: { skip_llm?, skip_execution?, timeout_ms? }`
- `execution_policy?: { allow_install?, allow_build?, allow_tests?, timeout_ms?, memory_limit_mb? }`
- `llm_policy?: { preferred_providers?, timeout_ms? }`

The current endpoint has no async job queue/status route and is synchronous from the caller’s perspective. This needs to change or be wrapped by a durable worker before long analyses are treated as a production SaaS workflow.

## 5. Existing output model

The report object assembled by the current route includes:

- `schema_version`, `analysis_run_id`
- project identity, repository URL/commit, package manager, architecture summary, dependency names and features
- analysis start/completion times, duration, status and stages
- summary counts for the four claim statuses
- requirements/claims validations
- evidence records and serialized evidence graph
- validation action audit trail and roadmap tasks
- diagnostics: warnings, errors, execution failures, provider failures and unsupported features
- analysis metadata, LLM status/provider, execution support and telemetry

Frontend types should be derived from `src/shared/types.ts` / provider Zod schemas and normalized with a versioned adapter if the SaaS adds its own persistence wrapper.

## 6. Existing test assets

The ingest includes tests for:

- GitHub fetcher behavior
- project mapper and static analyzer
- semantic parser
- evidence engine and cross-file graph resolution
- deterministic graph output and report auditor
- Gemini/OpenRouter provider and router behavior
- Docker sandbox, environment detection, and execution orchestration
- end-to-end analyze/claim validation/remediation
- version-focused V0.8/V0.9 validation cases

`package.json` exposes `npm test`, `npm run build`, and `npm run lint`. This document does not assert that these tests currently pass; run them in the actual repository before/after changes.

## 7. Gaps to close for SaaS readiness

1. **Auth and ownership:** no Firebase ID-token middleware or project-owner authorization is visible in the current core API.
2. **Persistence:** no project database/repository layer is visible. Current analysis is request-scoped; persist runs and reports before depending on history.
3. **Async jobs:** create a durable queue, stage/status endpoint, cancellation/retry policy and idempotency protection.
4. **Documents:** parse uploaded PDFs/DOCX/PPTX/TXT/MD, normalize claims, limit size, scan/validate files and store hashes. Current document analyzer only reads root README.
5. **Private repositories:** current fetcher uses Git clone; implement least-privilege GitHub OAuth/token handling if private repos are required.
6. **Secret redaction:** ensure secrets are removed from evidence payloads before any LLM request—not only from logs. Audit every handoff and report path.
7. **Input safety:** validate `commit_sha` / ref data and use safe process argument APIs instead of interpolated shell strings for Git operations.
8. **Coverage honest-state:** retain unsupported language, skipped execution, timeout, provider failure and missing document-parser statuses in UI and exported JSON.
9. **Frontend integration:** add typed API client and explicit API contract tests between React/Vite and Express.
10. **No mock claims in production:** use live project/report data and show real zero/empty/error states.

## 8. Reference UI asset

The bundled `reference/valgent-first-mockup.png` is the first generated four-screen collage and should be used as the visual starting point. Treat it as a visual reference, not as a source of product metrics or proof that any pictured feature is implemented.

## 9. Backend integration plan

Wrap, do not rewrite, the current analysis engine:

1. Extract `POST /api/v1/analyze` into a reusable `AnalysisRunner` application service.
2. Keep the current route as a compatibility/internal path while queue integration is tested.
3. Add Firebase Admin authentication and owner-scoped project/document/run repositories.
4. Add Firestore metadata persistence and Firebase Storage for uploaded files/artifacts.
5. Add BullMQ + Redis and a separate worker for long-running analysis.
6. Have the worker invoke existing fetcher, mapper, analyzers, evidence graph, LLM router, validation orchestrator, auditor and roadmap modules.
7. Persist reports/evidence/graph/roadmap and expose result APIs.
8. Add file parser adapters/source anchors; README parsing remains a baseline only.

### Explicit support boundary

- **Existing:** synchronous analysis endpoint, JS/TS-oriented static analysis, evidence/graph generation, Gemini/OpenRouter routing, Docker execution, claim validation/audit and report/roadmap JSON.
- **SaaS additions:** user auth/ownership, project CRUD, persistent history, upload/parser service, durable job/progress, report/graph/roadmap retrieval routes and frontend API contract.
- **Not assumed for MVP:** private GitHub access without OAuth, video analysis, all-language analysis, team sharing, billing or Settings page.

See `backend-plan.md` for the implementation phases, security checks and definition of done.
