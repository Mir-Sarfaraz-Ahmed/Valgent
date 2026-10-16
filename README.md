# Valgent

Valgent is an autonomous AI-powered Build, Validation, and Claim Verification Platform.

---

## Project Structure

The project is organized into dedicated, decoupled directories:

```
Valgent/
├── backend/               # Node.js + Express + TypeScript API Server
│   ├── src/               # Application logic & analyzers
│   │   ├── api/           # Express endpoints & routes
│   │   ├── analyzers/     # Static & AST mapping
│   │   ├── documents/     # Document parser & store
│   │   ├── gitdiagram/    # System architecture diagramming
│   │   ├── gitingest/     # Repository digest caching & client
│   │   ├── llm/           # Gemini & LLM synthesis
│   │   ├── sandbox/       # Hardened Docker sandbox
│   │   └── typesafe/      # TypeSafe AI client & comparator
│   ├── tests/             # Jest integration & unit test suites
│   ├── package.json       # Backend dependencies & scripts
│   ├── tsconfig.json      # Backend TypeScript configuration
│   └── .env.example       # Backend environment template
│
├── frontend/              # React 19 + Vite + TailwindCSS 4 SPA
│   ├── src/               # React components, pages, & context
│   │   ├── components/    # UI, navigation, claims, evidence components
│   │   ├── context/       # Auth & Theme state providers
│   │   ├── lib/           # API clients & Supabase service
│   │   ├── pages/         # View views (Home, Analyze, etc.)
│   │   └── types/         # Frontend data contracts
│   ├── package.json       # Frontend dependencies & scripts
│   ├── vite.config.ts     # Vite build configuration with proxy
│   └── .env.example       # Frontend environment template
│
├── supabase/              # Database schema & migrations
│   └── schema.sql
├── package.json           # Root workspace runner (runs both concurrently)
└── README.md
```

---

## Quick Start

### 1. Install Dependencies

You can install all dependencies from the root directory:
```bash
npm run install:all
```
Or install each independently:
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```bash
cp backend/.env.example backend/.env
```
Fill in:
- `GEMINI_API_KEY`: Google Gemini API key
- `TYPESAFE_API_KEY`: (Optional) TypeSafe AI key for automated code-doc verification
- `PORT`: Default 3000

**Frontend (`frontend/.env`):**
```bash
cp frontend/.env.example frontend/.env
```
Fill in:
- `VITE_API_BASE_URL`: `http://localhost:3000/api/v1` (defaults to port 3000 proxy)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key

### 3. Running the Development Servers

From the root repository:
```bash
# Run both backend and frontend concurrently
npm run dev

# Or run separately
npm run dev:backend    # Runs backend on http://localhost:3000
npm run dev:frontend   # Runs frontend on http://localhost:5173
```

### 4. Running Tests

```bash
# Run all tests
npm test

# Run backend tests (130 Jest tests)
npm run test:backend

# Run frontend tests (17 Vitest tests)
npm run test:frontend
```

---

## Sandbox Security Model

Valgent uses a hardened Docker execution layer to execute untrusted repository code safely:
1. **No Host Access**: Host filesystem and Docker socket are never mounted.
2. **Read-Only Root Filesystem**: Uses `--read-only` root filesystem.
3. **Tmpfs Mounts**: Uses isolated in-memory mounts for temp directories.
4. **Process & Resource Limits**: Enforces CPU, Memory, and PID limits.
5. **No Privileges**: Drops all capabilities (`--cap-drop=ALL`) and enables `no-new-privileges`.
6. **Network Policy**: Isolated network namespace (`--network none` by default).
7. **User Isolation**: Runs strictly as non-root `node` user.
8. **Command Abstraction**: Only pre-approved package manager operations are permitted.
9. **Environment Isolation**: Host secrets and environment variables are never passed to containers.
10. **Cleanup**: Ephemeral containers are automatically force-removed upon completion or timeout.
