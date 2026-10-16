# Valgent SaaS planning docs

This bundle contains the requested product and engineering documents for Valgent:

- `prd.md` — product requirements and acceptance criteria
- `tools.md` — existing tools vs proposed dependencies
- `flow.md` — page navigation and analysis pipeline
- `resources.md` — uploaded backend repository capability map and gaps
- `design.md` — visual system and page-by-page UI requirements
- `frontend.md` — React/Vite page architecture and implementation plan
- `backend.md` — current API, target API, validation pipeline, persistence and security
- `reference/valgent-first-mockup.png` — first generated four-screen UI reference

## Important source distinction

The uploaded Valgent ingest contains the analysis service and test files, not a complete SaaS frontend. The documents label existing backend capabilities separately from required future work such as sign-up, user-owned project persistence, uploaded document parsing and asynchronous analysis jobs.

## Product navigation decision

- Landing → Sign up / Log in → Projects dashboard → project workspace.
- Projects dashboard has no lower-left Free plan / Upgrade card.
- Workspace sidebar contains only Overview, Evidence graph, Reports and Roadmap.
- No Settings item.
- User identity is never hard-coded; show authenticated account data only.
