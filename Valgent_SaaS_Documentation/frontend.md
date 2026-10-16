# Valgent — Frontend Implementation Specification

**Target:** React + Vite + TypeScript.  
**Design reference:** the first generated four-screen collage in `reference/valgent-first-mockup.png`.  
**Purpose:** implement the multi-page SaaS flow, not a static one-screen dashboard.

## 1. Frontend responsibilities

- Render the public landing page and auth pages.
- Keep authenticated users inside their own Projects dashboard and project workspaces.
- Create/manage projects and make analysis/recheck flows clear.
- Display real pipeline status, claim verification, evidence references, reports and roadmap tasks returned by the backend.
- Preserve backend uncertainty honestly: failed, skipped, timed-out, unsupported, or unavailable checks must never appear as success.
- Make all controls accessible, responsive and keyboard usable.

The frontend does not execute code, verify claims, read secrets, or decide a final status itself. These decisions come from the backend report/evidence contract.

## 2. Recommended dependencies

- Vite + React + TypeScript
- React Router for page routes
- Tailwind CSS with CSS variables for the palette; small custom CSS for gradient borders/glass cards
- Lucide React for icons
- Firebase Web SDK for auth if Firebase Authentication is adopted
- TanStack Query for API queries, mutations, loading/error state and polling
- React Hook Form + Zod for project/auth forms (optional but recommended)
- Vitest + React Testing Library for component tests; Playwright for browser-level journeys

Install pinned versions and commit the lockfile. Avoid bringing in an animation library just for small transitions; CSS transitions are sufficient.

## 3. Routes and page ownership

| Route | Component | Access | Description |
|---|---|---|---|
| `/` | `LandingPage` | Public | Brand, hero, features, how it works, security, CTA. |
| `/signup` | `SignUpPage` | Public | Create account; redirect to Projects on success. |
| `/login` | `LoginPage` | Public | Log in; respect protected-route return URL. |
| `/projects` | `ProjectsPage` | Authenticated | Search/filter projects, New project, Open workspace, Recheck. |
| `/projects/new` | `NewProjectPage` or modal/route | Authenticated | Create a project and capture repository details. |
| `/projects/:projectId/overview` | `WorkspaceOverviewPage` | Project owner | Overview and Analyze/Recheck flow. |
| `/projects/:projectId/evidence` | `EvidenceGraphPage` | Project owner | Evidence graph and source details. |
| `/projects/:projectId/reports` | `ReportsPage` | Project owner | Historical analysis runs and report JSON. |
| `/projects/:projectId/roadmap` | `RoadmapPage` | Project owner | Remediation tasks from findings. |

The four workspace routes render inside one `WorkspaceLayout`. There is no Settings route in this scope.

## 4. Component structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers.tsx
│   └── route-guards.tsx
├── layouts/
│   ├── PublicLayout.tsx
│   ├── AuthLayout.tsx
│   ├── ProjectsLayout.tsx
│   └── WorkspaceLayout.tsx
├── pages/
│   ├── LandingPage.tsx
│   ├── SignUpPage.tsx
│   ├── LoginPage.tsx
│   ├── ProjectsPage.tsx
│   ├── NewProjectPage.tsx
│   ├── WorkspaceOverviewPage.tsx
│   ├── EvidenceGraphPage.tsx
│   ├── ReportsPage.tsx
│   └── RoadmapPage.tsx
├── components/
│   ├── brand/ValgentLogo.tsx
│   ├── navigation/PublicHeader.tsx
│   ├── navigation/ProjectsSidebar.tsx
│   ├── navigation/WorkspaceSidebar.tsx
│   ├── projects/ProjectCard.tsx
│   ├── projects/ProjectFilters.tsx
│   ├── analysis/RepositoryForm.tsx
│   ├── analysis/RequirementsUploader.tsx
│   ├── analysis/AnalysisProgress.tsx
│   ├── claims/ClaimTable.tsx
│   ├── claims/ClaimStatusBadge.tsx
│   ├── evidence/EvidenceGraph.tsx
│   ├── evidence/EvidenceDetails.tsx
│   ├── reports/ReportSummary.tsx
│   ├── reports/ReportJsonViewer.tsx
│   ├── roadmap/RoadmapTaskCard.tsx
│   └── ui/...
├── features/
│   ├── auth/
│   ├── projects/
│   ├── analyses/
│   ├── evidence/
│   ├── reports/
│   └── roadmap/
├── lib/
│   ├── api-client.ts
│   ├── auth-client.ts
│   ├── query-client.ts
│   └── formatters.ts
├── types/
│   ├── api.ts
│   ├── project.ts
│   └── report.ts
├── styles/
│   ├── tokens.css
│   └── globals.css
└── main.tsx
```

This is a proposed frontend structure; it is not present in the uploaded backend ingest.

## 5. Layout rules

### Landing

- Public header with logo and Features / How it works / Security links.
- Log in and Sign up actions on right.
- Hero text: **“Know what’s built. See what’s next.”**
- CTA links to `/signup`; secondary CTA scrolls to process section.
- Abstract evidence visual and concise feature row.

### Sign up / Log in

- Central card, shared background and typography.
- Use labelled name/email/password fields and submit state.
- Show auth errors inline; do not show raw SDK error blobs.
- Redirect on success; maintain the requested destination for login.

### Projects page

- Project list/card collection with name, repository, branch/commit, last analysis, status and actions.
- Search and filters: All, In progress, Needs review, Completed (statuses should be computed from persisted data).
- New project button in heading.
- Empty state for first-time users.
- Lower-left sidebar area intentionally has no plan/upgrade card.

### Workspace shell

Sidebar order exactly:

1. Overview
2. Evidence graph
3. Reports
4. Roadmap

Keep the current project name/repository in the workspace header. Top-right account control uses authenticated account data and must not contain the hard-coded name “Shadab”. No Settings item.

### Overview components

- `RepositoryForm`: repository URL, optional branch/commit, Analyze/Recheck.
- `RequirementsUploader`: accepted types, per-file status and parse status.
- `AnalysisProgress`: real pipeline stages and current status; no fake time-based completion.
- Metric cards: counts derived from report `summary` only.
- `ClaimTable`: canonical status badge, reason, evidence reference(s), details.
- Roadmap preview: first few real roadmap tasks and “View roadmap”.

### Evidence graph

Use the backend graph node and edge IDs where provided. Selecting a node opens details without losing the current filter. Always provide an accessible list/table alternative for users who do not use a graph canvas.

### Reports

Display previous runs and the commit SHA for each. A run may be complete, degraded, failed, or unavailable; follow the actual API contract and extend it with a precise run status when async support is added. JSON export should use the stored report, not rebuild one from visible cards.

### Roadmap

Render real task title/problem, recommended actions, evidence references, and acceptance criteria. Show dependencies/priority only when the backend returns them. Do not let an unpersisted checkbox imply a task was completed.

## 6. API client contract

Create one typed API client, keep base URL in environment configuration, and centralize:

- authentication headers (Firebase ID token if adopted)
- JSON parsing and API error normalization
- request cancellation/timeouts
- retry rules for idempotent requests
- upload handling and progress
- polling for analysis jobs (after async endpoints exist)

During migration, the current backend route is:

```text
POST /api/v1/analyze
```

It returns a final `{ analysis_id, status, report }` response after synchronous analysis. Do not code against `/api/reports` as a Valgent route; the same path in the ingest belongs to a test fixture. New SaaS endpoints are specified in `backend.md` and must be implemented before their UI is enabled.

## 7. Type model

Use canonical report and claim types based on backend `src/shared/types.ts` and `src/llm/provider.ts` schemas. In particular:

```ts
export type ClaimStatus =
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "NOT_VERIFIED"
  | "INSUFFICIENT_EVIDENCE";
```

Keep UI labels separate from canonical enums. Normalize dates/numbers at the API boundary; do not coerce missing values into misleading successes.

## 8. Data state and cache rules

- Auth user state: a single source of truth from the auth provider.
- Project list: key cache by owner ID; clear user-scoped cache on sign-out.
- Project/workspace data: key by project ID and latest analysis ID.
- Report history: immutable analysis run IDs.
- On Recheck: invalidate/refresh project and run queries when the API indicates completion.
- If the backend uses a job queue, poll or subscribe through the documented transport; stop polling on terminal state and on route unmount.
- Do not cache private file content longer than necessary. Never store API keys in localStorage.

## 9. Forms and validation

- Validate required project name/repository URL before request.
- Validate selected branch/commit format before sending it; backend must validate again.
- Restrict upload type/size in UI for helpful feedback, but backend is authoritative.
- Prevent double submits; use loading states and idempotency keys where supported.
- Keep form data after recoverable errors so users do not lose work.

## 10. Testing plan

- Landing CTA navigation.
- Sign up/log in validation and protected-route redirects.
- Project list loading/empty/error/filter/search.
- Create project and open workspace.
- Upload progress, rejected type/size, parser failure.
- Analysis stage transitions from API events/status polling.
- Correct rendering of all four statuses and unknown/missing evidence.
- Graph empty state and selected-node detail.
- Report history and JSON download.
- Roadmap task rendering without invented fields.
- Authorization error state and cache clearing on sign-out.
- Responsive layout and keyboard navigation.

## 11. Environment configuration

Client environment variables must use the Vite prefix and contain only public values, e.g. `VITE_API_BASE_URL` and public Firebase web configuration. Secret keys for Gemini, OpenRouter, Firebase Admin, storage, or queue infrastructure belong on the server only.

## 12. Backend integration and implementation dependencies

Use `backend.md` as the canonical route/response contract and `backend-plan.md` for implementation order.

### Authentication and requests

- Firebase Auth state is the source of current identity. Attach a current ID token as `Authorization: Bearer <token>` to private API calls.
- Never send `ownerId` as an authority field. Never put Gemini/OpenRouter, Firebase Admin or Redis secrets in client variables.
- On `401`, re-authenticate or redirect to login. On inaccessible `403/404`, show a neutral resource-unavailable message. On `429`, show retry guidance.

### Analysis behavior

- `POST /api/v1/projects/:projectId/analyses` returns `202` with `analysisId`, not the final report.
- Poll `GET /api/v1/analyses/:analysisId/status` while `QUEUED`/`RUNNING`; stop on terminal state.
- Use a stable idempotency key for one user action to protect against duplicate clicks/network retries.
- Load report, graph and roadmap from the API. Never use mock constants for production metrics.
- Each Recheck adds a new run to history; allow the user to select previous reports.

### Build dependencies

The public landing/auth shells can be built first. Connect Projects and Workspace pages only as their respective APIs become available. Mock fixtures must stay in development/test code and must never ship as real project counts or fake claim results.
