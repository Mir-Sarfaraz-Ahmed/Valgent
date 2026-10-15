# Valgent — AI Build & Validation Agent

> **"Know what's built. See what's next."**  
> An evidence-first project validation workspace combining deterministic TypeScript AST semantic analysis, an interactive evidence graph, sandboxed verification telemetry, targeted LLM reasoning, claim auditing, and automated remediation roadmaps.

---

## 🌟 Key Features

* **Deterministic Code Grounding**: TypeScript Compiler API parses AST symbols, exports, API routes, React components, and database calls—no hallucinations.
* **Evidence Graph**: Visual, interactive trace links connecting builder claims, requirements, AST source symbols, and execution telemetry.
* **Sandboxed Build & Test Checks**: Docker container isolation with strict CPU, memory, read-only root, and network controls for safe execution.
* **Autonomous Claim Validation**: Categorizes claims into `VERIFIED`, `PARTIALLY_VERIFIED`, `NOT_VERIFIED`, or `INSUFFICIENT_EVIDENCE` with cited line references.
* **Actionable Execution Roadmap**: Generates prioritized remediation tasks with problem statements, recommended actions, and objective acceptance criteria.
* **High-Taste Responsive UI**: Editorial SaaS aesthetic using the signature Valgent warm palette (Peach, Coral, Rose, Wine, Berry, Plum), dark/light mode, and mobile drawer navigation.

---

## 📁 Repository Structure

```text
├── Backend/                    # Node.js + Express 5 + TypeScript analysis core
│   ├── src/
│   │   ├── agents/             # Execution and runtime environment orchestrators
│   │   ├── analyzers/          # Static, semantic AST, and documentation analyzers
│   │   ├── api/                # REST API routes and SaaS project management store
│   │   ├── evidence/           # Evidence engine, graph builder, and query system
│   │   ├── github/             # Repository clone and fetch manager
│   │   ├── llm/                # Gemini & OpenRouter multi-provider routing
│   │   ├── sandbox/            # Docker container execution environment
│   │   ├── shared/             # Pipeline tracker, types, error classifiers
│   │   └── validation/         # Claim evaluator, safety policy, roadmap generator
│   └── tests/                  # 19 Jest test suites covering AST, graph, and e2e
│
├── Frontend/                   # React 19 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/         # Responsive claims, evidence graph, roadmap, navigation
│   │   ├── context/            # AuthContext (Supabase / Google OAuth / Demo), ThemeContext
│   │   ├── lib/                # API client bridge and Supabase client
│   │   └── pages/              # Landing, Projects, Workspace (Overview, Graph, Reports, Roadmap), Auth
│   └── public/
│
└── Valgent_SaaS_Documentation/ # Product specifications, PRD, architecture, and design guides
```

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js**: v20+ or v22+
* **npm** or **pnpm**
* **Git**
* *(Optional)* Docker Desktop for isolated sandbox execution

---

### 2. Backend Setup

```bash
cd Backend
npm install
npm run build
npm run dev
```

The backend server runs on `http://localhost:3000`.

**Environment Variables (`Backend/.env`)**:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

To run the backend test suite:
```bash
npm test
```

---

### 3. Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

The frontend application runs on `http://localhost:5173`.

**Environment Variables (`Frontend/.env`)**:
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🔒 Security & Verification Principles

1. **Evidence Before Hype**: A README statement, dependency list, or route name alone never proves an end-to-end feature.
2. **Honest Reporting**: Skipped, unsupported, or timed-out checks are visibly labeled—never hidden behind false green badges.
3. **Secret Redaction**: Passwords, tokens, and credentials are automatically redacted from execution logs and report outputs.
4. **Isolated Execution**: Untrusted repository code executes only inside restricted containers with capability drops.

---

## 📄 License
ISC License © 2026 Valgent Team.
