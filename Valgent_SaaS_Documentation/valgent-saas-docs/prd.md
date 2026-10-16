# Valgent — Product Requirements Document (PRD)

**Version:** 1.0 · **Status:** Product/design specification  
**Product:** Valgent — AI Build & Validation Agent  
**Primary UI reference:** `reference/valgent-first-mockup.png` (the first generated four-screen collage)

## 1. Product summary

Valgent helps a builder answer four practical questions:

1. What does my repository actually contain?
2. Which project claims have implementation or execution evidence?
3. Where do my requirements, documentation, and code disagree?
4. What should I fix or verify next?

It is an evidence-first project validation workspace, not a general chat interface. It combines deterministic repository analysis, optional sandboxed build/test execution, an evidence graph, targeted LLM reasoning, claim auditing, and remediation tasks.

The supplied repository ingest shows a working Node.js/TypeScript analysis service with an Express API, GitHub clone/fetcher, JavaScript/TypeScript semantic analysis, evidence graph, Gemini/OpenRouter providers, Docker sandbox execution, validation/audit modules, roadmap generation, and Jest tests. The user-facing SaaS pages described in this document are the product to build around that service; they are not all present in the current backend repository.

## 2. Goals

- Give users a clear landing page that explains Valgent without overwhelming them with technical detail.
- Let a user create an account and access their own projects.
- Keep all projects in a dedicated Projects dashboard with search, filters, status, last analysis, and actions.
- Let users add a GitHub repository and upload requirements or planned files.
- Recheck an existing project against a newer commit or changed requirements.
- Show findings with explicit verification statuses and traceable evidence.
- Turn real gaps into actionable roadmap tasks with evidence and acceptance criteria.
- Export or retrieve a structured report that can be used by the host platform or other tools.
- Preserve safe execution and honest reporting when execution, LLM reasoning, or a language analyzer is unavailable.

## 3. Non-goals for the first release

- A generic AI chatbot or autonomous coding agent that modifies the repository.
- Automatically committing fixes or pushing code to GitHub.
- Payments, subscriptions, marketplace features, or an upgrade/billing UI.
- A separate Settings page (intentionally omitted from the product navigation).
- Production support for every programming language. The current static analyzer is focused on JavaScript/TypeScript.
- Automatic video understanding in the first release. Demo/video evidence is an extension point unless its processing pipeline is implemented and tested.
- Claiming that a feature is verified from its name, a README statement, or a dependency alone.

## 4. Target users

- **Student / independent builder:** wants a factual view of what is done and what to build next.
- **Project team:** wants a repeatable recheck after pushing a new commit.
- **Mentor / reviewer:** wants evidence-linked findings instead of manually reading the entire repository.
- **Hackathon / innovation reviewer:** wants to distinguish implemented work from unsupported claims.
- **Platform integrator:** needs consistent report JSON, claim statuses, graph references, and roadmap tasks.

## 5. Information architecture

The application has four main product stages plus a sign-in route:

1. **Landing page (`/`)** — public marketing page; explain the value, show workflow/features/security, and provide Sign up / Log in calls to action.
2. **Sign-up / Log-in (`/signup`, `/login`)** — account creation and returning-user sign-in. The name/avatar must come from the authenticated account, never a hard-coded “Shadab” label.
3. **Projects dashboard (`/projects`)** — list all projects belonging to the current user; includes search, status filters, New project, Open workspace, and Recheck. Do not render a Free plan / Upgrade / empty promotional card in the lower-left sidebar area. That area remains clean/empty.
4. **Project workspace (`/projects/:projectId/overview`)** — focused environment for one project. Its left sidebar has exactly these navigation items: **Overview, Evidence graph, Reports, Roadmap**. Do not include Settings. The top-right area must not hard-code a user name; use a profile/avatar control tied to the authenticated account.

### Workspace sections

- **Overview:** repository input/branch or commit selection, requirements/planned-files upload, analysis/recheck action, analysis pipeline, summary cards, and a compact set of claim results.
- **Evidence graph:** inspect claim → requirement → implementation/execution evidence relationships. Provide node-type filters and a details panel with file path/line references.
- **Reports:** browse report history for the selected project, inspect a report, and download/copy the structured JSON output. Do not fabricate a report when analysis fails.
- **Roadmap:** list remediation tasks derived from the analysis. Show why each task exists, evidence references, prerequisites/dependencies when available, suggested action, priority, and objective acceptance criteria.

## 6. Core user journeys

### 6.1 New user

Landing → Sign up → authenticated Projects dashboard → New project → enter project name/repository → optionally add requirements → save project → run first analysis → open workspace overview → review claims/evidence → follow roadmap.

### 6.2 Returning user

Landing → Log in → Projects dashboard → select a project → Open workspace.

### 6.3 Recheck an existing project

Projects dashboard or workspace → Recheck → choose/currently confirm branch or commit → optional updated requirements files → create a new analysis run → show progress → compare new results with the previous run → open updated report and roadmap.

Recheck creates a new immutable analysis record; it must not silently overwrite the previous report. The repository commit SHA and document hashes should identify the inputs for that run.

## 7. Functional requirements

### P0 — required for the first usable product

- Landing page with product summary, feature overview, process explanation, security explanation, Sign up, and Log in.
- Sign-up and sign-in with persistent authenticated sessions.
- User-scoped project list, create project, open workspace, edit project metadata, and delete/archive with confirmation.
- GitHub repository URL validation; optional branch/commit selection. Use only repositories the user is authorised to analyse. Current repository fetcher uses Git clone and does not implement GitHub OAuth; private-repo OAuth/token support must be added before promising private repository access.
- Requirements/planned-file upload UI with clear supported-file list, progress, validation errors, and removal. The current backend only reads the repository root `README.md`; file parsing and upload processing are an implementation task.
- Analysis pipeline state with distinct stages: repository ingestion, project mapping, static/semantic analysis, optional sandbox execution, evidence graph, claim validation, report generation, completion/failure.
- Claim statuses: `VERIFIED`, `PARTIALLY_VERIFIED`, `NOT_VERIFIED`, `INSUFFICIENT_EVIDENCE`. UI may show human-readable labels, but store/send canonical enum values.
- Each claim result includes explanation and resolvable evidence references. If evidence is absent or cannot be retrieved, do not fabricate a file or line reference.
- Report history by project and a detailed report page/view.
- Roadmap tasks tied to identified gaps and acceptance criteria.
- Error, loading, empty, cancelled/failed, unsupported-language, and LLM-unavailable states.
- Security: validate inputs, authenticate user-owned resources, redact secrets, treat repository/doc contents as untrusted data, and execute repository commands only in the isolated sandbox.

### P1 — high value after the core flow works

- Compare current analysis with previous runs (status changed, new evidence, new failures, fixed claims).
- Filter/sort evidence by claim, type, file, line range, and result status.
- Report JSON download and copy-to-clipboard.
- Reuse cached/static-analysis results for the same commit and document hashes where safe and correct.
- Demo URL field and evidence capture only after a real supported processing flow exists. Otherwise label it “Planned” or omit it.
- Keyboard accessibility, mobile layouts, and reduced-motion support.

### P2 — future extensions

- Additional repository providers behind a common adapter.
- Broader language analyzers.
- Demo/video processing.
- Team collaboration and reviewer sharing.
- Hosted webhooks or CI-triggered rechecks.

## 8. Verification and trust rules

| Status | Meaning | UI treatment |
|---|---|---|
| `VERIFIED` | Relevant implementation and/or execution evidence supports the stated claim within the checks performed. | Green/teal badge; show cited evidence. |
| `PARTIALLY_VERIFIED` | Some relevant evidence exists, but the full claim is not supported or a required check is missing. | Amber badge; say what remains unproven. |
| `NOT_VERIFIED` | Evidence contradicts the claim, or an actual verification check failed. Do not use this merely because no file was found. | Rose/red badge; show contradiction/failure evidence. |
| `INSUFFICIENT_EVIDENCE` | Available evidence is not enough to make a reliable decision. | Neutral badge; state the missing evidence. |

A dependency, route, component name, or README line on its own does not prove an end-to-end feature. Build/test claims should reflect execution telemetry where those checks were actually run. Skipped, unsupported, or timed-out checks must be visible as such.

## 9. Project and analysis data

The UI needs a persisted application layer in addition to the current in-memory analysis pipeline.

- **Project:** `id`, `ownerId`, `name`, `description`, `repositoryUrl`, `defaultBranch`, `createdAt`, `updatedAt`, `archivedAt?`, `latestAnalysisId?`.
- **AnalysisRun:** `id`, `projectId`, `ownerId`, `repositoryCommit`, `documentHashes[]`, `status`, `currentStage`, `startedAt`, `completedAt?`, `report`, `error?`, `providerInfo?`.
- **UploadedDocument:** `id`, `projectId`, `ownerId`, `originalName`, `mimeType`, `sizeBytes`, `storagePath`, `contentHash`, `parseStatus`, `createdAt`.
- **Report:** either the report embedded in an immutable AnalysisRun or a separately indexed record referencing the run. Avoid duplicate independent sources of truth.
- **Evidence and graph:** retain source IDs, paths, line references, classifications, content hashes, graph node IDs, and edge IDs. Store large text/logs with limits and redaction.
- **Roadmap task:** `id`, `analysisId`, `claimId?`, `title`, `problem`, `evidenceRefs[]`, `recommendedActions[]`, `dependencies[]`, `priority?`, `acceptanceCriteria[]`, `status`.

Recommended persistence is Firebase Authentication + Firestore + Firebase Storage to complement the existing Node/Express service. These integrations are **planned additions**, not dependencies visible in the current ingest.

## 10. Success criteria

- A signed-in user can create a project and see it only in their own dashboard.
- A user can trigger an analysis of a supported public JavaScript/TypeScript repository and see the result in a workspace.
- A report includes actual repository commit, analyzer findings, available execution telemetry, claim statuses, evidence references, diagnostics, and roadmap tasks.
- Unsupported or unexecuted checks are not presented as passing.
- Recheck creates a separate analysis run and preserves report history.
- A user cannot access another user's project, uploaded file, report, graph, or roadmap by changing an ID.
- The UI contains no hard-coded metrics or fake project claims in production. Mock data must be clearly isolated to development/design previews.

## 11. Delivery order

1. Align backend API contract and add automated API tests.
2. Add auth verification, project persistence, and ownership rules.
3. Add project CRUD and dashboard.
4. Connect the existing analysis service to persisted analysis runs and progress polling.
5. Add requirements file parsing/storage and evidence/report screens.
6. Add roadmap UI, historical comparisons, security hardening, and deployment.
