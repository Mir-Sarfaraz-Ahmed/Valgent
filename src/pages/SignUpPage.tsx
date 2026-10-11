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
    <div className="min-h-screen flex flex-col justify-between p-6 relative z-10">
      {/* Header with Logo & Night Mode Button */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <ValgentLogo size="md" to="/" />
        <ThemeToggle showLabel={true} />
      </header>

      {/* Main Centered Sign-Up Card */}
      <main className="w-full max-w-md mx-auto my-8">
        <div className="glass-panel-strong p-8 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
              Create your account
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              Start validating your projects with AI.
            </p>
          </div>

          {/* Error Banner */}
          {(localError || error) && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#C52243]/10 border border-[#C52243]/30 text-xs text-[#C52243] flex items-center gap-2.5">
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
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pl-10 text-xs"
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
                  className="input-field pl-10 text-xs"
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
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10 text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-2 py-3 text-sm font-semibold shadow-lg"
            >
              <span>{submitting ? 'Creating account...' : 'Create account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-soft)]" />
            </div>
            <span className="relative px-3 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-card-strong)]">
              or continue with
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-soft)] hover:border-[var(--border-strong)] bg-white dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-xs font-semibold text-[var(--text-primary)] shadow-sm"
          >
            {/* Google Logo SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Quick Demo Preview Button */}
          <button
            type="button"
            onClick={handleDemoAccess}
            className="w-full mt-2.5 py-2 px-3 rounded-xl border border-dashed border-[#DC586D]/40 text-[#DC586D] hover:bg-[#DC586D]/10 transition-all flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Demo Guest Sign In</span>
          </button>

          {/* Footer Link */}
          <div className="text-center mt-6 text-xs text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--color-rose)] hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-[var(--text-muted)]">
        <span>Protected with Supabase Authentication & encrypted tokens</span>
      </footer>
    </div>
  );
};
