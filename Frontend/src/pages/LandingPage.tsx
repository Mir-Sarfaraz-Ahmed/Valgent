import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/navigation/PublicHeader';
import {
  ArrowRight,
  ShieldCheck,
  GitBranch,
  Cpu,
  CheckCircle2,
  FileCheck,
  Layers
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-page)] text-[var(--text-primary)]">
      <PublicHeader />

      <main className="flex-1 w-full">
        {/* 1. Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Headlines & Call to Actions */}
            <div className="lg:col-span-7 flex flex-col items-start gap-5 sm:gap-6">
              {/* Industry Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-rose)]/10 text-[var(--color-wine)] dark:text-[var(--color-peach)] border border-[var(--color-rose)]/20">
                <span className="w-2 h-2 rounded-full bg-[var(--color-rose)]" />
                <span>PS-02 · Industry Track</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-heading tracking-tight text-[var(--text-primary)] leading-[1.12]">
                Know what’s built. <br className="hidden sm:inline" />
                <span className="gradient-brand">See what’s next.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
                Validate project claims against real repository evidence and get actionable insights for what to build next.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 w-full sm:w-auto">
                <Link
                  to="/signup"
                  className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 w-full sm:w-auto"
                >
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn-secondary text-sm sm:text-base px-5 sm:px-6 py-3 sm:py-3.5 w-full sm:w-auto text-center"
                >
                  Explore workflow
                </a>
              </div>

              {/* Trust Guarantees */}
              <div className="flex flex-wrap items-center gap-5 pt-2 text-xs font-medium text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#107E5A] flex-shrink-0" />
                  <span>Deterministic AST Evidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#107E5A] flex-shrink-0" />
                  <span>Isolated Sandbox Telemetry</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Evidence Flow Mockup */}
            <div className="lg:col-span-5 relative w-full">
              <div className="ui-card-elevated p-6 sm:p-7 relative overflow-hidden">
                {/* Header inside mockup */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FB9590]" />
                    <div className="w-3 h-3 rounded-full bg-[#DC586D]" />
                    <div className="w-3 h-3 rounded-full bg-[#4C1D3D]" />
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    valgent-agent-v1.0
                  </span>
                </div>

                {/* Flow Steps / Interactive Nodes */}
                <div className="flex flex-col gap-4 py-4 relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-5 sm:left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#FB9590] via-[#DC586D] to-[#A33757] opacity-35" />

                  {/* Step 1: Repository Analyzed */}
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--color-wine)] dark:text-[var(--color-peach)] flex-shrink-0 shadow-sm">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        Repository Analyzed
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] truncate">
                        AST parsed, symbols mapped & routes extracted
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Claims Extracted */}
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--color-rose)] flex-shrink-0 shadow-sm">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        Claims Extracted
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] truncate">
                        PRD, README & requirements aligned to code
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Evidence Verified */}
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#107E5A] to-[#34D399] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          Evidence Verified
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#107E5A]/15 text-[#107E5A] flex-shrink-0">
                          AST proof
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] truncate">
                        OAuth & API routes cross-referenced
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Roadmap Generated */}
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--color-wine)] dark:text-[var(--color-peach)] flex-shrink-0 shadow-sm">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        Roadmap Generated
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] truncate">
                        Next actionable steps with acceptance criteria
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Feature Highlights Section */}
        <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[var(--border-soft)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {/* Card 1 */}
            <div className="ui-card p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-peach)]/25 flex items-center justify-center text-[var(--color-wine)] dark:text-[var(--color-peach)] flex-shrink-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                Repository analysis
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Understand your codebase and tech stack with TypeScript compiler AST symbol mapping and entry points.
              </p>
            </div>

            {/* Card 2 */}
            <div className="ui-card p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-coral)]/25 flex items-center justify-center text-[var(--color-rose)] flex-shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                Evidence-backed claims
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Verify what is built with real source citations, exact line numbers, and contradiction detection.
              </p>
            </div>

            {/* Card 3 */}
            <div className="ui-card p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-rose)]/20 flex items-center justify-center text-[var(--color-rose)] flex-shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                Safe sandbox checks
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Run build and test verification in an isolated Docker container with strict CPU, memory, and network limits.
              </p>
            </div>

            {/* Card 4 */}
            <div className="ui-card p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-plum)]/15 dark:bg-[var(--color-peach)]/15 flex items-center justify-center text-[var(--color-wine)] dark:text-[var(--color-peach)] flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                Actionable roadmap
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Get clear next steps for unverified gaps with prioritized action items and objective acceptance criteria.
              </p>
            </div>
          </div>
        </section>

        {/* 3. How It Works / Validation Architecture */}
        <section id="how-it-works" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-[var(--border-soft)]">
          <div className="flex flex-col items-center text-center gap-3.5 max-w-3xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[var(--color-rose)] uppercase">
              Validation Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)] leading-tight">
              Evidence before hype. Real proof over promises.
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              Valgent does not take README statements or dependency lists as truth. Every claim must have verifiable implementation code or test execution telemetry.
            </p>
          </div>
        </section>

        {/* 4. Security Section */}
        <section id="security" className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="ui-card-elevated p-6 sm:p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="p-4 rounded-2xl bg-[var(--color-rose)]/10 text-[var(--color-rose)] flex-shrink-0">
              <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div className="flex flex-col gap-2 text-left">
              <h3 className="text-base sm:text-lg font-bold font-heading text-[var(--text-primary)]">
                Enterprise-Grade Sandbox Security
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Untrusted code is executed exclusively inside restricted Docker containers with read-only filesystems, capability drops, PID limitations, and secret redaction. Your proprietary credentials are never forwarded to containers.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border-soft)] bg-[var(--surface-card)] py-6 sm:py-8 px-4 sm:px-6 text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 Valgent AI. Build & Validation Platform.</span>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">Architecture</a>
            <a href="#security" className="hover:text-[var(--text-primary)] transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
