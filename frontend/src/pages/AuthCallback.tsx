import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ValgentLogo } from '../components/brand/ValgentLogo';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const processedRef = useRef(false);

  useEffect(() => {
    // If user is already loaded and authenticated, navigate immediately
    if (user) {
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/projects', { replace: true });
      return;
    }

    if (processedRef.current) return;
    processedRef.current = true;

    let timeoutId: any = null;

    const processAuth = async () => {
      try {
        // 1. Check for error parameters in query or hash (e.g. access_denied when user cancels)
        const searchParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        const error =
          searchParams.get('error') ||
          hashParams.get('error') ||
          searchParams.get('error_description') ||
          hashParams.get('error_description');

        if (error) {
          // Clear query/hash from the visible address bar
          window.history.replaceState({}, document.title, window.location.pathname);
          const friendlyDesc = searchParams.get('error_description') || hashParams.get('error_description');
          setErrorMessage(
            friendlyDesc ? friendlyDesc.replace(/\+/g, ' ') : 'Authentication was cancelled or denied.'
          );
          setIsProcessing(false);
          return;
        }

        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // 2. Check if a session is already established
        const { data: initialData, error: initialError } = await supabase.auth.getSession();
        if (initialError) {
          console.warn('Callback session check notice:', initialError.message);
        }

        if (initialData?.session?.user) {
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/projects', { replace: true });
          return;
        }

        // 3. If explicit code is present and SDK hasn't exchanged yet, perform PKCE exchange
        if (code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // If the SDK's detectSessionInUrl already completed exchange, verify if session is active
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData?.session?.user) {
              window.history.replaceState({}, document.title, window.location.pathname);
              navigate('/projects', { replace: true });
              return;
            }
            throw new Error(exchangeError.message || 'Failed to exchange authorization code for session.');
          }

          if (exchangeData?.session?.user) {
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate('/projects', { replace: true });
            return;
          }
        } else if (accessToken) {
          // Fallback for hash fragment tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            throw new Error(sessionError.message || 'Failed to set session from token.');
          }

          if (sessionData?.session?.user) {
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate('/projects', { replace: true });
            return;
          }
        }

        // 4. Setup listener for SDK automatic background resolution
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            subscription.unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate('/projects', { replace: true });
          }
        });

        // 5. Safety timeout (8s) if neither session nor code exchange completes
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          setIsProcessing(false);
          setErrorMessage('Authentication timed out. No active session could be confirmed.');
        }, 8000);

      } catch (err: any) {
        // Clear sensitive tokens from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsProcessing(false);
        const msg = err?.message || 'Authentication could not be completed.';
        setErrorMessage(msg);
      }
    };

    processAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-page)] text-[var(--text-primary)] px-4">
      <div className="auth-card max-w-md w-full text-center p-8 border border-[var(--border-soft)] rounded-2xl bg-[var(--surface-card)] shadow-xl">
        <div className="flex justify-center mb-6">
          <ValgentLogo size="lg" to="/" />
        </div>

        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-10 h-10 rounded-full border-3 border-[var(--color-dusty-rose)] border-t-transparent animate-spin" />
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Completing authentication...
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Securely verifying your credentials and loading your workspace.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 text-center">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Authentication Failed
              </h2>
              <p className="text-xs text-red-400 leading-relaxed px-2">
                {errorMessage || 'Unable to complete sign-in. Please try again.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-3">
              <Link
                to="/login"
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
