# CivicPulse AI — Claim Test Set for Valgent

**Purpose:** Use these statements to test Valgent's repository-analysis and claim-verification pipeline.
**Important:** Each numbered statement is a claim to investigate, not a fact to assume. This list intentionally mixes supported, partly supported, over-broad, and contradicted assertions so the evaluator is tested across different evidence outcomes.

## Repository under test
- Repository: https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai
- Branch/ref: `main`
- Snapshot inspected: commit `644cb6e86e928cd2d956663d3bbcf7412fa79f84`
- Evidence to inspect: README, package manifests, server entry points, backend routes, middleware, database schema, incident engine, frontend components, and Firestore rules.

## Claims

### Product overview

- **CP-001** — CivicPulse AI is a full-stack civic-issue reporting and response application intended to help citizens submit local infrastructure complaints and help authorities manage the resulting incidents.

### Frontend architecture

- **CP-002** — The frontend is a React 19 single-page application bundled with Vite 8.

### Backend architecture

- **CP-003** — The backend is a Node.js application using Express 4.

### API routing

- **CP-004** — The backend mounts REST routes under /api/auth, /api/reports, /api/incidents, and /api/demo, and exposes a /health endpoint.

### Database

- **CP-005** — The primary backend records for users, incidents, reports, and incident status history are stored in SQLite using Node.js's built-in node:sqlite module.

### Firebase integration

- **CP-006** — The frontend initializes Firebase Authentication and a Cloud Firestore client.

### Firestore listener

- **CP-007** — The admin dashboard subscribes to the Firestore incidents collection with onSnapshot and refreshes dashboard data when snapshot updates arrive.

### Storage consistency

- **CP-008** — All report and incident records are stored exclusively in Firestore; SQLite is not used for application records.

### Root development command

- **CP-009** — The root package's development command runs the root server.js, which listens on port 3000 and mounts Vite middleware in development mode.

### Backend development command

- **CP-010** — The separate backend package's development command runs backend/server.js, which defaults to port 5000 unless PORT is configured.

### Startup configuration

- **CP-011** — The repository has one unambiguous development-server entry point and one consistent default port across the root and backend package scripts.

### Authentication

- **CP-012** — The backend supports email/password registration and login, hashes passwords with bcrypt, and signs its local JWTs with a seven-day expiry.

### Firebase token verification

- **CP-013** — The backend verifies Firebase ID-token signatures with the Firebase Admin SDK before trusting the token's identity and role.

### JWT secret handling

- **CP-014** — The backend refuses to start unless JWT_SECRET is configured and does not contain a hard-coded fallback signing secret.

### Role-specific authorization

- **CP-015** — Every backend action enforces the intended role for that action, with all crew-only operations restricted to crew accounts and all authority operations restricted to admins.

### Auth middleware

- **CP-016** — Protected routes use authentication middleware that expects a Bearer token and rejects requests when no authenticated request user is established.

### Image analysis endpoint

- **CP-017** — POST /api/reports/analyze is protected by authentication middleware and requires an uploaded image.

### Image upload restrictions

- **CP-018** — The report-analysis and resolution-evidence upload handlers limit files to 10 MB and accept JPEG/JPG, PNG, and WEBP image MIME types.

### Local image storage

- **CP-019** — Uploaded images are saved to a local backend/uploads directory and exposed through a static /uploads route.

### Supported evidence media

- **CP-020** — The report-analysis endpoint accepts video, PDF, DOCX, and PPTX files as evidence in addition to images.

### Multimodal AI analysis

- **CP-021** — The report-analysis route sends image bytes plus the optional citizen description and coordinates to Google's Gemini generateContent API and expects a structured problem, category, severity, and summary response.

### Single pinned model

- **CP-022** — CivicPulse exclusively uses the gemini-2.5-flash model; it does not try other Gemini model IDs.

### Fallback processing

- **CP-023** — If Gemini API keys are missing or Gemini requests fail, the report-analysis route falls back to local keyword-based heuristic classification.

### Separate computer-vision model

- **CP-024** — Image classification is implemented with a separately hosted YOLO/OpenCV model rather than the Gemini image-input API.

### Issue categories

- **CP-025** — The AI analysis response validates categories against Road Infrastructure, Damaged Infrastructure, Safety Hazards, Traffic, Water Leakage, Garbage / Dumping, and Other.

### Severity levels

- **CP-026** — The AI analysis response validates severity values against Low, Medium, High, and Critical.

### Report submission validation

- **CP-027** — POST /api/reports/submit requires an image URL, latitude, longitude, and AI problem/category/severity fields before saving a report.

### Report data model

- **CP-028** — A stored report includes the citizen ID, image URL, description, coordinates, address, AI analysis fields, timestamp, and an incident link when grouping succeeds.

### Priority scoring

- **CP-029** — CivicPulse computes a deterministic priority score capped at 100 using severity weight, category weight, a context modifier, and report frequency.

### Priority modifiers

- **CP-030** — The context modifier is derived from description keywords such as school, hospital, metro, highway, main road, junction, or market; the frequency modifier adds up to 15 points for additional reports.

### Geospatial risk scoring

- **CP-031** — The priority algorithm queries actual geographic locations of schools and hospitals and increases priority based on measured distance to those facilities.

### Distance calculation

- **CP-032** — Duplicate detection uses a Haversine distance calculation to estimate the distance between two latitude/longitude pairs.

### Duplicate-matching rule

- **CP-033** — A report can be grouped with an existing incident only when the category matches, the incident is not Resolved or Closed, and the distance is at most 100 metres.

### Category-independent duplicates

- **CP-034** — Any two reports within 100 metres are grouped into one incident regardless of category.

### Duplicate escalation

- **CP-035** — When a new report matches an existing incident, the grouping logic can raise the incident's severity when the new report is more severe and recalculate its priority using the report count.

### Citizen report history

- **CP-036** — The citizen portal can retrieve the signed-in citizen's reports and open report details that include linked incident data and incident status history.

### Withdraw own report

- **CP-037** — A citizen can delete their own report; if it was the incident's last linked report, the code deletes the orphaned incident and its status-history records.

### Admin statistics

- **CP-038** — The incidents stats endpoint returns aggregate counts including active, critical, high-priority, resolved, rejected, pending-approval, in-progress, and pending-verification incidents.

### Admin dashboard filtering

- **CP-039** — The admin dashboard includes severity/status filters and text search over incident category, address, assigned worker, and status.

### Admin lifecycle actions

- **CP-040** — Admin-protected routes support incident verification, rejection, crew assignment, resolution approval, resolution rejection, and closure.

### Crew workflow

- **CP-041** — The backend and frontend include crew-task workflows for accepting work, starting work, and submitting a resolution with an evidence image and notes.

### State-machine enforcement

- **CP-042** — Every status-changing endpoint consistently checks the complete VALID_TRANSITIONS state machine before updating an incident.

### Audit history

- **CP-043** — The database schema includes an incident_status_history table, and lifecycle operations write status-history entries for key changes.

### Authority notifications

- **CP-044** — Submitting a citizen report triggers a working email, SMS, or push-notification service to alert municipal authorities.

### Health check

- **CP-045** — GET /health returns a JSON response containing status 'ok' and a time value.

### Demo data

- **CP-046** — The repository includes a demo-seeding route and a login-screen action intended to reset and seed ten sample civic incidents centered in Delhi.

### Firestore rules artifact

- **CP-047** — The repository contains firestore.rules with rules for users, incidents, reports, and incident_status_history, including authenticated-user and role/ownership conditions.

### Rules apply to SQLite

- **CP-048** — The Firestore security rules automatically enforce row-level authorization on the SQLite records that the Express backend reads and writes.

### API rate limiting

- **CP-049** — The Express API has active per-user or per-endpoint rate-limiting middleware configured for all routes.

### Automated tests

- **CP-050** — The repository includes an automated unit-test suite that tests authentication, priority scoring, duplicate grouping, and incident lifecycle behavior.

### Map interface

- **CP-051** — The frontend contains a reusable MapComponent used by civilian and admin interfaces to support location/incident map interactions.

### Deployment topology

- **CP-052** — The default root development command and the separate backend development command are distinct startup paths, so their ports and Vite behavior should not be treated as interchangeable.

### Server-side document parsing

- **CP-053** — The backend extracts text and claims from uploaded PDF, DOCX, and PPTX documents before analyzing a report.

### API status-history completeness

- **CP-054** — Every possible incident status change, regardless of which endpoint performs it, is guaranteed to write a status-history row.
