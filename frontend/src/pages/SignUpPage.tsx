import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ValgentLogo } from '../components/brand/ValgentLogo';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signUpWithEmail, signInWithGoogle, signInDemo, error } = useAuth();
  const navigate = useNavigate();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!fullName.trim()) {
      setLocalError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    const result = await signUpWithEmail(email, password, fullName);
    setSubmitting(false);

    if (result.success) {
      navigate('/projects');
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setSubmitting(true);
      await signInWithGoogle();
    } catch (err: any) {
      setLocalError(err?.message || 'Google sign in encountered an issue');
      setSubmitting(false);
    }
  };

  const handleDemoAccess = () => {
    signInDemo('alex.builder@valgent.ai', fullName || 'Alex Mercer');
    navigate('/projects');
  };

  return (
    <div className="auth-page">
      {/* Header with Logo & Night Mode Button */}
      <header className="auth-header">
        <ValgentLogo size="md" to="/" />
        <ThemeToggle showLabel={true} />
      </header>

      {/* Main Centered Sign-Up Card */}
      <main className="auth-main">
        <div className="auth-container">
          <div className="auth-card">
            {/* Title & Subtitle */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
                Create your account
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5">
                Start validating your projects with deterministic evidence.
              </p>
            </div>

          {/* Error Banner */}
          {(localError || error) && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Email Sign-Up Form */}
          <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Full name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="ui-input pl-11 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ui-input pl-11 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input pl-11 pr-11 text-xs sm:text-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3.5 mt-2"
            >
              <span>{submitting ? 'Creating account...' : 'Create account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or continue with</span>
            <div className="auth-divider-line" />
          </div>

          {/* Social / OAuth Options */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={submitting}
              className="btn-secondary w-full py-3 text-xs font-semibold"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign up with Google</span>
            </button>

            {/* Instant Demo Access (Reviewer Mode) */}
            <button
              type="button"
              onClick={handleDemoAccess}
              className="btn-demo"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Reviewer Demo Mode</span>
            </button>
          </div>

          {/* Honest Disclosure Note */}
          <div className="p-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-soft)] text-[11px] text-[var(--text-muted)] text-center">
            <span>Authentication is powered by Supabase. Demo mode bypasses credentials for evaluation purposes.</span>
          </div>

          {/* Footer Link to Log In */}
          <div className="pt-2 border-t border-[var(--border-soft)] text-center text-xs text-[var(--text-secondary)]">
            <span>Already have an account? </span>
            <Link
              to="/login"
              className="font-bold text-[var(--color-dusty-rose)] hover:text-[var(--color-pale-blush)] transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-[var(--text-muted)]">
        <span>© 2026 Valgent AI. Evidence-first project verification.</span>
      </footer>
    </div>
  );
};
