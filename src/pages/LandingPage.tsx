import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/navigation/PublicHeader';
import { ArrowRight, ShieldCheck, GitBranch, Cpu, CheckCircle2, Sparkles, Terminal, FileCheck, Layers } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <PublicHeader />

      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#DC586D]/15 to-[#FFBB94]/25 text-[#A33757] dark:text-[#FFBB94] border border-[#DC586D]/20 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#DC586D] animate-ping" />
              <span>PS-02 · Industry Track</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold font-heading tracking-tight leading-[1.08] text-[var(--text-primary)]">
              Know what’s built.{' '}
              <span className="gradient-text">See what’s next.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-xl leading-relaxed">
              An AI-powered agent that validates your project claims against real repository evidence — and turns gaps into an actionable roadmap.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/signup" className="btn-primary text-base px-7 py-3.5 shadow-lg">
                <span>Get started free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works" className="btn-secondary text-base px-6 py-3.5">
                Explore workflow
              </a>
            </div>

            {/* Trust metrics & guarantees */}
            <div className="flex items-center gap-6 pt-4 text-xs font-medium text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#107E5A]" />
                <span>Deterministic AST Evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#107E5A]" />
                <span>Isolated Sandbox Telemetry</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Evidence Flow Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl p-8 glass-panel-strong shadow-2xl overflow-hidden animate-float">
              {/* Decorative background glow */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-[#FFBB94] to-[#DC586D] opacity-30 blur-2xl pointer-events-none" />

              {/* Header inside mockup */}
              <div className="flex items-center justify-between pb-6 border-b border-[var(--border-soft)]">
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
              <div className="flex flex-col gap-5 py-6 relative">
                {/* Connecting glowing line */}
                <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-gradient-to-b from-[#FB9590] via-[#DC586D] to-[#A33757] opacity-40" />

                {/* Step 1: Repository Analyzed */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 shadow-md border border-[var(--border-soft)] flex items-center justify-center text-[#A33757] dark:text-[#FFBB94] flex-shrink-0">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Repository Analyzed
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      AST parsed, symbols mapped & routes extracted
                    </span>
                  </div>
                </div>

                {/* Step 2: Claims Extracted */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 shadow-md border border-[var(--border-soft)] flex items-center justify-center text-[#DC586D] flex-shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Claims Extracted
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      PRD, README & requirements aligned to code
                    </span>
                  </div>
                </div>

                {/* Step 3: Evidence Verified */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#107E5A] to-[#34D399] shadow-lg flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Evidence Verified
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#107E5A]/15 text-[#107E5A]">
                        Live AST proof
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Google OAuth & API routes cross-referenced
                    </span>
                  </div>
                </div>

                {/* Step 4: Roadmap Generated */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 shadow-md border border-[var(--border-soft)] flex items-center justify-center text-[#A33757] dark:text-[#FFBB94] flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Roadmap Generated
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Next actionable steps with acceptance criteria
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 4 Feature Cards (Directly matching mockup 01) */}
        <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-20">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FFBB94]/30 to-[#FB9590]/30 flex items-center justify-center text-[#DC586D]">
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
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FB9590]/30 to-[#DC586D]/30 flex items-center justify-center text-[#DC586D]">
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
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#DC586D]/30 to-[#A33757]/30 flex items-center justify-center text-[#DC586D]">
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
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#A33757]/30 to-[#4C1D3D]/30 flex items-center justify-center text-[#DC586D]">
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

        {/* How It Works Section */}
        <div id="how-it-works" className="mt-28 flex flex-col items-center text-center gap-4">
          <span className="text-xs font-bold tracking-widest text-[var(--color-rose)] uppercase">
            Validation Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Evidence before hype. Real proof over promises.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Valgent does not take README statements or dependency lists as truth. Every claim must have verifiable implementation code or test execution telemetry.
          </p>
        </div>

        {/* Security Section */}
        <div id="security" className="mt-16 glass-panel-strong p-8 rounded-3xl max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="p-4 rounded-2xl bg-[#A33757]/15 text-[#DC586D] flex-shrink-0">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <div className="flex flex-col gap-2 text-left">
            <h3 className="text-lg font-bold font-heading text-[var(--text-primary)]">
              Enterprise-Grade Sandbox Security
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Untrusted code is executed exclusively inside restricted Docker containers with read-only filesystems, capability drops, PID limitations, and secret redaction. Your proprietary credentials are never forwarded to containers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border-soft)] py-8 px-6 text-center text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 Valgent AI. Build & Validation Platform.</span>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-[var(--text-primary)]">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)]">Architecture</a>
            <a href="#security" className="hover:text-[var(--text-primary)]">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
