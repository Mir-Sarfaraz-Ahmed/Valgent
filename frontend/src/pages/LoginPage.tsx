import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ValgentLogo } from '../components/brand/ValgentLogo';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signInWithEmail, signInWithGoogle, signInWithGithub, error, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/projects', { replace: true });
    }
  }, [user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    setSubmitting(true);
    const result = await signInWithEmail(email, password);
    setSubmitting(false);

    if (result.success) {
      setEmail('');
      setPassword('');
      navigate('/projects');
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLocalError(null);
      setSubmitting(true);
      await signInWithGoogle();
    } catch (err: any) {
      setLocalError(err?.message || 'Google sign in encountered an issue');
      setSubmitting(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      setLocalError(null);
      setSubmitting(true);
      await signInWithGithub();
    } catch (err: any) {
      setLocalError(err?.message || 'GitHub sign in encountered an issue');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Sticky Top Header with Back to Landing Page, Logo & Theme Toggle */}
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border-soft)] bg-[var(--surface-page)]/85 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-card)] transition-colors border border-[var(--border-soft)] shadow-sm"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--color-dusty-rose)]" />
            <span>Back to Home</span>
          </Link>
          <div className="h-4 w-px bg-[var(--border-soft)]" />
          <ValgentLogo size="sm" to="/" />
        </div>
        <ThemeToggle showLabel={false} />
      </header>

      {/* Main Centered Login Card */}
      <main className="auth-main">
        <div className="auth-container">
          <div className="auth-card">
            {/* Top Card Back Link */}
            <div className="flex items-center justify-between pb-1 -mt-1">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--color-dusty-rose)] transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Return to Landing Page</span>
              </Link>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Supabase Auth
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5">
                Log in to access your validated projects and evidence graphs.
              </p>
            </div>

            {/* Error Banner */}
            {(localError || error) && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <span>{localError || error}</span>
              </div>
            )}

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    className="ui-input pl-11 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    className="ui-input pl-11 pr-11 text-xs sm:text-sm"
                    required
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
                className="btn-primary w-full py-3.5 mt-1"
              >
                <span>{submitting ? 'Authenticating...' : 'Sign in'}</span>
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
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="btn-secondary w-full py-2.5 sm:py-3 text-xs font-semibold"
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
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={submitting}
                className="btn-secondary w-full py-2.5 sm:py-3 text-xs font-semibold"
              >
                <svg className="w-4 h-4 mr-1.5 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* Footer Link to Sign Up */}
            <div className="pt-2 border-t border-[var(--border-soft)] text-center text-xs text-[var(--text-secondary)]">
              <span>Don't have an account? </span>
              <Link
                to="/signup"
                className="font-bold text-[var(--color-dusty-rose)] hover:text-[var(--color-pale-blush)] transition-colors"
              >
                Sign up
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
