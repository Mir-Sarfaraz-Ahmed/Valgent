# Valgent — Tools, Libraries & Development Setup

This document separates **tools already visible in the uploaded repository** from **tools proposed for the SaaS interface and persistence layer**. Do not describe a planned dependency as already integrated.

## 1. Existing backend stack (confirmed in the repository ingest)

| Area | Tool / library | Existing role |
|---|---|---|
| Runtime | Node.js | Runs the service and analysis logic. |
| Language | TypeScript | Strict TS compilation is enabled in `tsconfig.json`. |
| HTTP API | Express 5 | Health endpoint and analysis route. |
| Request validation | Zod | Parses and validates the `/analyze` request shape. |
| Git operations | Git CLI via `child_process` in `GithubFetcher` | Clones a GitHub repository to a temporary directory and optionally checks out a commit. |
| Repository mapping | Custom `ProjectMapper` | Detects selected root-level languages, package manager lockfiles, entry points, scripts, and dependencies. |
| Semantic analysis | TypeScript Compiler API | Extracts symbols, imports, function calls, Express-like routes, database operations, and React components from JS/TS-family files. |
| Evidence | `EvidenceEngine` | Creates source-linked evidence records. |
| Evidence graph | Custom graph builder/query/types/graph modules | Links claims, requirements, evidence, symbols, routes, calls, database operations, and execution signals. |
| LLM provider | `@google/genai` / Gemini | Structured JSON analysis and claim validation. |
| LLM provider | OpenRouter HTTP API | Alternate structured reasoning provider. |
| Provider selection | Custom `LLMRouter` | Tries configured providers and records the provider used. |
| Sandbox | Docker CLI via custom `DockerSandbox` | Runs supported install/build/test actions in resource-limited containers. |
| Validation | Custom evaluator, planner, orchestrator, auditor, safety policy, roadmap generator | Evaluates evidence, selects bounded actions, audits verdicts, and emits remediation tasks. |
| Config | `dotenv` | Loads server environment variables. |
| Tests | Jest, ts-jest, Supertest | Unit/integration/e2e-oriented test files are present. |
| Build | TypeScript compiler | `npm run build` compiles `src` to `dist`. |
| Dev server | `ts-node-dev` | `npm run dev`. |
| Lint | ESLint + TypeScript ESLint | `npm run lint`. |

Existing scripts from `package.json`:

```bash
npm install
npm run dev
npm run build
npm start
npm test
npm run lint
```

Runtime environment variables visible in `.env.example`:

```env
GEMINI_API_KEY=
TINYFISH_API_KEY=
PORT=3000
```

`PORT` is read by the server but is not listed in the supplied `.env.example`; add it to the example file when updating project setup docs. Never put real credentials in Git.

## 2. Proposed frontend stack

| Area | Recommendation | Why |
|---|---|---|
| App | React + Vite | Matches the requested implementation brief and supports a responsive SPA. |
| Language | TypeScript | Keeps API models and statuses aligned with the backend schema. |
| Routing | React Router | Landing/auth/dashboard/project workspace are separate routes. |
| Styling | Tailwind CSS plus CSS variables/custom CSS | Fast consistent spacing and design-token support for the glassmorphism UI. |
| Icons | Lucide React | Consistent scalable UI icons. |
| Forms | React Hook Form + Zod (optional but recommended) | Client-side validation aligned to API request constraints. |
| Server state | TanStack Query (recommended) | Handles loading, retries, polling, invalidation, and caching of API results. |
| Auth UI | Firebase Web SDK | Sign-up/sign-in/session state if Firebase Authentication is selected. |
| Charts/graph | SVG or React Flow (only if useful) | Render the evidence graph with node details and controlled interactions. Prefer a lightweight SVG first if only a small graph view is needed. |
| Unit/UI tests | Vitest + React Testing Library | Component tests. |
| Browser tests | Playwright | Critical sign-up → project → analysis → report user journeys. |

Create the app with Vite's React TypeScript template. Pin dependency versions in the lockfile and document tested versions at implementation time.

## 3. Proposed persistence and identity services

These services are not included in the current backend ingest. They are recommended additions for the multi-user SaaS:

- **Firebase Authentication:** sign-up, sign-in, session identity, and optional GitHub sign-in.
- **Firebase Admin SDK:** verify Firebase ID tokens on the Express server. Frontend route guards are UX; backend authorization is mandatory.
- **Cloud Firestore:** users' projects, analysis-run metadata, status, report indexes, and roadmap task records.
- **Firebase Storage:** uploaded requirements/planned files. Store metadata and content hashes alongside each upload.
- **Queue/worker (choose at deployment):** a durable worker queue such as BullMQ + Redis, or a platform-managed task queue. Needed when analysis is moved off the current synchronous HTTP request path. Keep the queue abstraction separate from domain logic.

Suggested new server variables if Firebase is selected:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
WEB_ORIGIN=http://localhost:5173
```

Use a deployment secret manager in production; do not put service-account JSON into frontend variables. Only public Firebase web config belongs in the client build, and it still needs Firestore/Storage security rules.

## 4. Document processing tools to add

Current `DocumentAnalyzer` reads only the repository root `README.md` (up to 5,000 characters). The following user-uploaded file parsing is **not implemented in the current ingest** and must be added before the upload UI is advertised as functional.

- PDF text extraction library suitable for server-side processing.
- DOCX text extraction library.
- PPTX parsing by extracting text from the package's XML files, with size/zip-bomb protections.
- Plain text and Markdown readers.
- A shared normalized document/claim representation so all file types feed the same claim extraction and evidence matching stages.
- Malware/format checks, MIME sniffing, maximum file size, page/slide/text limits, and temporary-file cleanup.

Initial UI-supported types should be PDF, DOCX, PPTX, TXT, and MD, but acceptance of a type must remain disabled until its parser and tests are implemented.

## 5. Security and review tools

- Run the existing Jest test suite before refactoring analyzer, graph, LLM, and sandbox modules.
- Add API authorization tests and project-owner isolation tests when auth/persistence is introduced.
- Add dependency audit and secret scanning to CI.
- Use structured logs with analysis IDs and redaction; never log uploaded document bodies, tokens, keys, or unredacted environment values.
- Ensure repository content is treated as untrusted data, never as system/developer instructions.
- Validate commit SHA/branch strings before passing them to Git commands. Prefer argument-array execution (`execFile`) over interpolated shell commands wherever possible.
- Keep Docker host socket, home directories, server secrets, and service credentials outside repository containers.

## 6. CI/deployment recommendation

1. Install dependencies with lockfile enforcement.
2. Run lint and TypeScript build.
3. Run unit and API tests.
4. Run sandbox tests in a controlled runner with Docker available.
5. Build the Vite frontend separately from the Express service.
6. Deploy frontend to a static host and backend/worker to a Node-capable service.
7. Inject credentials via secrets manager and configure allowed CORS origins.
8. Run smoke tests against `/health` and the analysis API.
