# Valgent SaaS planning docs

This bundle contains the requested product and engineering documents for Valgent:

- `prd.md` — product requirements and acceptance criteria
- `tools.md` — existing tools vs proposed dependencies
- `flow.md` — page navigation and analysis pipeline
- `resources.md` — uploaded backend repository capability map and gaps
- `design.md` — visual system and page-by-page UI requirements
- `frontend.md` — React/Vite page architecture and implementation plan
- `backend.md` — backend architecture, API contracts, persistence, queue, security and operations
- `backend-plan.md` — phase-by-phase backend implementation plan with acceptance criteria
- `reference/valgent-first-mockup.png` — first generated four-screen UI reference

## Important source distinction

The uploaded Valgent ingest contains an analysis service and tests, not a complete SaaS frontend or production SaaS persistence/auth/queue layer. The documents label existing capabilities separately from planned work such as Firebase Auth, owner-scoped projects, upload parsing, Firestore persistence, BullMQ jobs and polling APIs. See `backend-plan.md` for implementation order and acceptance checks.

## Product navigation decision

- Landing → Sign up / Log in → Projects dashboard → project workspace.
- Projects dashboard has no lower-left Free plan / Upgrade card.
- Workspace sidebar contains only Overview, Evidence graph, Reports and Roadmap.
- No Settings item.
- User identity is never hard-coded; show authenticated account data only.

## Backend decision summary

- Express + TypeScript API; Firebase Auth ID token verification.
- Firestore is the canonical metadata/result store; Firebase Storage holds private requirement uploads.
- BullMQ + Redis-compatible queue dispatches long-running analysis to a separate worker.
- Existing analysis modules stay domain logic behind an `AnalysisRunner` service.
- No Settings navigation, no upgrade/billing card, and no hard-coded account name.
