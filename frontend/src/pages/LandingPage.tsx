import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/navigation/PublicHeader';
import {
  ArrowRight,
  ShieldCheck,
  GitBranch,
  Network,
  CheckCircle2,
  Code2,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import AnimatedGradient from '@/components/ui/animated-gradient';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-page)] text-[var(--text-primary)] relative overflow-hidden">
      <PublicHeader />

      <main className="flex-1 w-full relative">
        {/* Ambient Animated Gradient extending across all content sections till before footer */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-25 dark:opacity-30 [mask-image:linear-gradient(to_bottom,black_0%,black_92%,transparent_100%)]">
          <AnimatedGradient
            config={{ preset: "ValgentPlum", speed: 14 }}
            noise={{ opacity: 0.08 }}
          />
        </div>

        {/* 1. Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Technical Narrative & Actions */}
            <div className="lg:col-span-7 flex flex-col items-start gap-5 sm:gap-6">
              {/* Category Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-merlot)]/20 text-[var(--color-dusty-rose)] border border-[var(--color-mauve)]/30">
                <span className="w-2 h-2 rounded-full bg-[var(--color-dusty-rose)] animate-pulse" />
                <span>AHGV BUILDVERSE 2026 · Problem Statement PS-02</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-heading tracking-tight text-[var(--text-primary)] leading-[1.12]">
                Deterministic First. <br className="hidden sm:inline" />
                <span className="gradient-brand">AI Second.</span>
              </h1>

              {/* Engineering Mission Statement */}
              <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
                Valgent inspects real software repositories to prove or disprove implementation claims.
                We bridge the critical gap between documentation claims and verified source code evidence.
              </p>

              {/* Core Principle Callout */}
              <div className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-strong)] text-xs text-[var(--text-secondary)] max-w-xl">
                <span className="font-bold text-[var(--color-dusty-rose)] uppercase tracking-wider block mb-1">
                  The Fundamental Rule:
                </span>
                <p className="font-mono text-[13px] text-[var(--color-pale-blush)]">
                  CLAIM ≠ PROOF &nbsp;|&nbsp; DOCUMENTATION ≠ IMPLEMENTATION
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  A README statement or dependency in package.json is not proof of functioning software.
                  Proof requires AST symbols, route handlers, and isolated execution telemetry.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 w-full sm:w-auto">
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Enter Validation Studio
                  </Button>
                </Link>
                <a href="#narrative" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" fullWidth>
                    Explore 5-Step Pipeline
                  </Button>
                </a>
              </div>

              {/* Engineering Guarantees */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-medium text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>TypeScript AST Symbol Mapping</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Isolated Docker Telemetry</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Deterministic Audit Rules</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual 5-Stage Verification Pipeline with Frosted Glass Effect */}
            <div className="lg:col-span-5 relative w-full group">
              {/* Outer decorative ambient glow behind the glass */}
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-tr from-[var(--color-merlot)]/50 via-[var(--color-mauve)]/30 to-[var(--color-dusty-rose)]/40 blur-2xl opacity-50 group-hover:opacity-75 transition-opacity pointer-events-none" />

              <div className="relative rounded-2xl p-5 sm:p-7 overflow-hidden border border-white/20 dark:border-white/15 bg-gradient-to-b from-white/[0.08] via-[var(--surface-card-elevated)]/45 to-[var(--surface-card)]/60 backdrop-blur-2xl backdrop-saturate-180 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_-1px_1px_0_rgba(0,0,0,0.3)] transition-all">
                {/* Specular light highlight along top rim */}
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

                {/* Subtle glass reflection angled sheen */}
                <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-br from-white/[0.05] via-transparent to-transparent rotate-12 pointer-events-none" />

                {/* Header inside mockup */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 dark:border-white/[0.08] relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-merlot)] shadow-inner ring-1 ring-white/10" />
                    <div className="w-3 h-3 rounded-full bg-[var(--color-mauve)] shadow-inner ring-1 ring-white/10" />
                    <div className="w-3 h-3 rounded-full bg-[var(--color-dusty-rose)] shadow-inner ring-1 ring-white/10" />
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-dusty-rose)] tracking-wider">
                    PS-02 Verification Core v1.0
                  </span>
                </div>

                {/* 5-Step Narrative Micro-Flow */}
                <div className="flex flex-col gap-3.5 py-4 relative">
                  {/* Connecting line */}
                  <div className="absolute left-5 sm:left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[var(--color-merlot)] via-[var(--color-mauve)] to-[var(--color-dusty-rose)] opacity-50" />

                  {/* Stage 1: Repository Ingestion */}
                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 dark:bg-white/[0.04] backdrop-blur-md border border-white/10 dark:border-white/[0.08] flex items-center justify-center text-[var(--color-dusty-rose)] flex-shrink-0 shadow-sm mt-0.5">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">1. Repository</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 dark:bg-white/[0.06] backdrop-blur-xs border border-white/10 dark:border-white/[0.08] text-[var(--text-muted)] font-mono">git clone</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                        Deep tree clone & commit SHA pinning
                      </span>
                    </div>
                  </div>

                  {/* Stage 2: Deterministic Static Analysis */}
                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 dark:bg-white/[0.04] backdrop-blur-md border border-white/10 dark:border-white/[0.08] flex items-center justify-center text-[var(--color-mauve)] flex-shrink-0 shadow-sm mt-0.5">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">2. Deterministic AST</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 backdrop-blur-xs border border-emerald-500/30 text-emerald-300 font-mono">no hallucinations</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                        AST symbols, function calls, route declarations & export graph
                      </span>
                    </div>
                  </div>

                  {/* Stage 3: Directed Evidence Graph */}
                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 dark:bg-white/[0.04] backdrop-blur-md border border-white/10 dark:border-white/[0.08] flex items-center justify-center text-[var(--color-dusty-rose)] flex-shrink-0 shadow-sm mt-0.5">
                      <Network className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">3. Evidence Graph</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-merlot)]/40 backdrop-blur-xs border border-[var(--color-mauve)]/30 text-[var(--color-pale-blush)] font-mono">directed edges</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                        Maps claims to exact file paths, line ranges & Docker test exit codes
                      </span>
                    </div>
                  </div>

                  {/* Stage 4: Targeted AI Reasoning */}
                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 dark:bg-white/[0.04] backdrop-blur-md border border-white/10 dark:border-white/[0.08] flex items-center justify-center text-[var(--color-pale-blush)] flex-shrink-0 shadow-sm mt-0.5">
                      <Sparkles className="w-5 h-5 text-[var(--color-dusty-rose)]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">4. Targeted AI</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 dark:bg-white/[0.06] backdrop-blur-xs border border-[var(--color-mauve)]/30 text-[var(--color-dusty-rose)] font-mono">grounded prompts</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                        Evaluates semantic alignment with strict AST citation constraints
                      </span>
                    </div>
                  </div>

                  {/* Stage 5: Audited Results & Roadmap */}
                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] flex items-center justify-center text-[var(--color-pale-blush)] flex-shrink-0 shadow-md mt-0.5 border border-white/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">5. Audited Results</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 backdrop-blur-xs border border-emerald-500/30 text-emerald-300 font-mono">4-status output</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                        Actionable gaps become prioritized technical debt tasks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Visual Narrative Section: The 5-Step Pipeline Explained */}
        <section id="narrative" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-[var(--border-soft)] relative z-10">
          <div className="flex flex-col items-center text-center gap-3.5 max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold tracking-widest text-[var(--color-dusty-rose)] uppercase">
              The Architecture of Truth
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)] leading-tight">
              Repository → Deterministic Analysis → Evidence Graph → Targeted AI → Audited Results
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              Traditional AI code reviewers guess based on superficial code snippets. Valgent executes
              a deterministic pipeline where code structure and execution evidence constrain every conclusion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Step 1 */}
            <div className="ui-card p-5 flex flex-col gap-3">
              <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)]">01 / INGESTION</span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Repository Cloning</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Clones repository securely, freezes commit SHA, identifies package manifests, configurations, and documentation.
              </p>
              <div className="mt-auto pt-2 border-t border-[var(--border-soft)] text-[10px] font-mono text-[var(--text-muted)]">
                Input: Git URL & branch
              </div>
            </div>

            {/* Step 2 */}
            <div className="ui-card p-5 flex flex-col gap-3">
              <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)]">02 / STRUCTURE</span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Deterministic AST</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Parses syntax trees to extract real functions, classes, imports, routes, and schemas without running LLMs.
              </p>
              <div className="mt-auto pt-2 border-t border-[var(--border-soft)] text-[10px] font-mono text-[var(--text-muted)]">
                Tech: Compiler AST parser
              </div>
            </div>

            {/* Step 3 */}
            <div className="ui-card p-5 flex flex-col gap-3">
              <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)]">03 / CORRELATION</span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Evidence Graph</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Builds directed graph connecting documentation claims to exact AST nodes and isolated Docker test outcomes.
              </p>
              <div className="mt-auto pt-2 border-t border-[var(--border-soft)] text-[10px] font-mono text-[var(--text-muted)]">
                Structure: Directed acyclic graph
              </div>
            </div>

            {/* Step 4 */}
            <div className="ui-card p-5 flex flex-col gap-3">
              <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)]">04 / REASONING</span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Targeted AI</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Small, strictly grounded LLM prompts evaluate semantic compliance with cited code snippets as ground truth.
              </p>
              <div className="mt-auto pt-2 border-t border-[var(--border-soft)] text-[10px] font-mono text-[var(--text-muted)]">
                Constraint: Grounded citations only
              </div>
            </div>

            {/* Step 5 */}
            <div className="ui-card p-5 flex flex-col gap-3">
              <span className="text-xs font-mono font-bold text-[var(--color-dusty-rose)]">05 / AUDIT</span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Audited Results</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Generates canonical 4-status report (Verified, Partially Verified, Not Verified, Insufficient) + remediation roadmap.
              </p>
              <div className="mt-auto pt-2 border-t border-[var(--border-soft)] text-[10px] font-mono text-[var(--text-muted)]">
                Output: Actionable debt tasks
              </div>
            </div>
          </div>
        </section>

        {/* 3. Implemented Capabilities vs Honest Roadmap */}
        <section id="capabilities" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-[var(--border-soft)] relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <span className="text-xs font-bold tracking-widest text-[var(--color-dusty-rose)] uppercase">
                Technical Disclosure
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
                Honest Verification Scope
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                We believe engineering tools must be transparent about their operational boundaries.
                Here is an exact audit of what is live in Valgent versus what is actively in development.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Implemented Box */}
              <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-card)] border border-emerald-500/30 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>VERIFIED LIVE CAPABILITIES</span>
                </div>
                <ul className="text-xs text-[var(--text-secondary)] space-y-2.5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span><strong>Git Repository Cloning:</strong> SHA-pinned branch fetching and file tree extraction.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span><strong>Static AST Parsing:</strong> Real symbol, route, and dependency extraction without AI.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span><strong>Docker Sandboxing:</strong> Isolated container execution for npm build and test suites.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span><strong>Evidence Graph:</strong> Directed mapping from requirement claims to code and test proofs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span><strong>Actionable Roadmap:</strong> Prioritized tasks generated for disproved or missing claims.</span>
                  </li>
                </ul>
              </div>

              {/* Planned / Future Box */}
              <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-card)] border border-[var(--border-strong)] flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[var(--color-dusty-rose)] font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>ROADMAP & FUTURE CAPABILITIES</span>
                </div>
                <ul className="text-xs text-[var(--text-secondary)] space-y-2.5">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mt-0.5">○</span>
                    <span><strong>Multi-Modal PDF/DOCX:</strong> Native OCR for binary specification documents (Markdown currently supported).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mt-0.5">○</span>
                    <span><strong>Video Demo Audio/Visual Audit:</strong> Automated validation of video screencasts against repo UI code.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mt-0.5">○</span>
                    <span><strong>Automated PR Remediations:</strong> Direct GitHub pull request creation for missing unit tests.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mt-0.5">○</span>
                    <span><strong>Dynamic API Fuzzing:</strong> Automatic runtime OpenAPI endpoint contract fuzzing in sandbox.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Architecture & Security Section */}
        <section id="architecture" className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 border-t border-[var(--border-soft)] pt-16 relative z-10">
          <div className="ui-card-elevated p-6 sm:p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 sm:gap-8 border border-[var(--border-strong)]">
            <div className="p-4 rounded-2xl bg-[var(--color-merlot)]/25 text-[var(--color-dusty-rose)] flex-shrink-0 border border-[var(--color-mauve)]/30">
              <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div className="flex flex-col gap-2 text-left">
              <h3 className="text-base sm:text-lg font-bold font-heading text-[var(--text-primary)]">
                Strict Isolation & Sandboxed Execution Security
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Untrusted code is executed exclusively inside restricted Docker containers with read-only filesystems,
                dropped capabilities, strict CPU/memory quotas, and network policy restrictions. Your source code and
                credentials are never leaked to external third-party training datasets.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[var(--text-muted)] font-mono">
                <span>• Non-root container user</span>
                <span>• Strict 100MB output log cap</span>
                <span>• Deterministic exit code verification</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border-soft)] bg-[var(--surface-card)] py-8 px-4 sm:px-6 text-xs text-[var(--text-muted)] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="font-semibold text-[var(--text-primary)]">Valgent</span>
            <span>·</span>
            <span>Build & Validation Agent for AHGV BUILDVERSE 2026 (PS-02)</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#narrative" className="hover:text-[var(--color-dusty-rose)] transition-colors">Pipeline</a>
            <a href="#capabilities" className="hover:text-[var(--color-dusty-rose)] transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-[var(--color-dusty-rose)] transition-colors">Security</a>
            <Link to="/login" className="hover:text-[var(--color-pale-blush)] transition-colors font-medium">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
