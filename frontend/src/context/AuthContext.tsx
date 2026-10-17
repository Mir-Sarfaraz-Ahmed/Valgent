import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';
import { resolveAvatarDisplayUrl } from '../lib/storage';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateAvatarUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('valgent-auth-user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const buildUserProfile = async (authUser: any, defaultProvider: string = 'email'): Promise<UserProfile> => {
    let rawAvatar = authUser.user_metadata?.avatar_url;
    let fullName =
      authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Authenticated User';

    // Check profiles table for user's stored avatar_url
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileRow?.avatar_url) {
        rawAvatar = profileRow.avatar_url;
      }
      if (profileRow?.full_name) {
        fullName = profileRow.full_name;
      }
    } catch {
      // ignore
    }

    const avatarUrl = await resolveAvatarDisplayUrl(rawAvatar);

    return {
      id: authUser.id,
      email: authUser.email || '',
      fullName,
      avatarUrl,
      provider: (authUser.app_metadata?.provider as any) || defaultProvider,
      createdAt: authUser.created_at || new Date().toISOString(),
    };
  };

  useEffect(() => {
    // Check existing Supabase session, URL hash tokens, or OAuth PKCE code
    const initAuth = async () => {
      try {
        let authSessionUser: any = null;
        let authProvider = 'email';

        let hasOAuthTokens = false;

        // 1. Handle incoming OAuth tokens in URL hash fragment (#access_token=...&refresh_token=...)
        const rawHash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;

        if (rawHash && rawHash.includes('access_token=')) {
          hasOAuthTokens = true;
          const hashParams = new URLSearchParams(rawHash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken) {
            try {
              const { data: hashSessionData, error: hashSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (hashSessionError) {
                console.warn('Supabase hash setSession notice:', hashSessionError.message);
              } else if (hashSessionData?.session?.user) {
                authSessionUser = hashSessionData.session.user;
                authProvider = (authSessionUser.app_metadata?.provider as any) || 'google';
              }
            } catch (hashErr: any) {
              console.warn('Error processing auth hash token:', hashErr?.message || hashErr);
            }
          }

          // Clean up the URL hash immediately so sensitive tokens do not linger in the address bar
          const cleanUrl = window.location.pathname + (window.location.search || '');
          window.history.replaceState({}, document.title, cleanUrl);
        }

        // 2. Handle incoming OAuth callback with PKCE code (?code=...)
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          hasOAuthTokens = true;
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('OAuth code exchange notice:', exchangeError.message);
          } else if (exchangeData?.session?.user) {
            authSessionUser = exchangeData.session.user;
            authProvider = (authSessionUser.app_metadata?.provider as any) || 'google';
          }
          // Clean up the URL search params so the code isn't re-used
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 3. Fallback: check active Supabase session
        if (!authSessionUser) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (session?.user) {
            authSessionUser = session.user;
            authProvider = (session.user.app_metadata?.provider as any) || 'email';
          }
        }

        if (authSessionUser) {
          const profile = await buildUserProfile(authSessionUser, authProvider);
          setUser(profile);
          localStorage.setItem('valgent-auth-user', JSON.stringify(profile));

          // If incoming OAuth tokens were processed on landing or auth pages, redirect to /projects
          if (
            hasOAuthTokens &&
            (window.location.pathname === '/' ||
             window.location.pathname === '/login' ||
             window.location.pathname === '/signup')
          ) {
            window.location.replace('/projects');
          }
        } else {
          setUser(null);
          localStorage.removeItem('valgent-auth-user');
        }
      } catch (err: any) {
        console.warn('Supabase auth session check notice:', err?.message || err);
        setUser(null);
        localStorage.removeItem('valgent-auth-user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clean up hash if detectSessionInUrl was triggered
      if (window.location.hash && window.location.hash.includes('access_token=')) {
        const cleanUrl = window.location.pathname + (window.location.search || '');
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (session?.user) {
        const provider = (session.user.app_metadata?.provider as any) || 'email';
        const profile = await buildUserProfile(session.user, provider);
        setUser(profile);
        localStorage.setItem('valgent-auth-user', JSON.stringify(profile));

        // If user logged in and is on landing or auth pages, forward to /projects
        if (
          event === 'SIGNED_IN' &&
          (window.location.pathname === '/login' || window.location.pathname === '/signup')
        ) {
          window.location.replace('/projects');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('valgent-auth-user');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Google OAuth sign-in via Supabase
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/projects`,
        },
      });

      if (authError) {
        if (
          authError.message?.toLowerCase().includes('not enabled') ||
          (authError as any).code === 'validation_failed' ||
          (authError as any).status === 400
        ) {
          throw new Error('Google sign-in is not enabled in your Supabase project dashboard. Please enable Google under Authentication → Providers in Supabase, or sign in using your email and password.');
        }
        throw authError;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const friendlyMessage =
        err?.message?.includes('not enabled')
          ? 'Google sign-in is not enabled in your Supabase project dashboard. Please enable Google under Authentication → Providers in Supabase, or sign in using your email and password.'
          : err?.message || 'Google sign-in failed. Please verify provider settings or sign in with email.';
      setError(friendlyMessage);
      setLoading(false);
      throw new Error(friendlyMessage);
    }
  };

  // GitHub OAuth sign-in via Supabase
  const signInWithGithub = async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/projects`,
        },
      });

      if (authError) {
        if (
          authError.message?.toLowerCase().includes('not enabled') ||
          (authError as any).code === 'validation_failed' ||
          (authError as any).status === 400
        ) {
          throw new Error('GitHub sign-in is not enabled in your Supabase project dashboard. Please enable GitHub under Authentication → Providers in Supabase, or sign in using your email and password.');
        }
        throw authError;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      console.error('GitHub sign-in error:', err);
      const friendlyMessage =
        err?.message?.includes('not enabled')
          ? 'GitHub sign-in is not enabled in your Supabase project dashboard. Please enable GitHub under Authentication → Providers in Supabase, or sign in using your email and password.'
          : err?.message || 'GitHub sign-in failed. Please verify provider settings or sign in with email.';
      setError(friendlyMessage);
      setLoading(false);
      throw new Error(friendlyMessage);
    }
  };

  // Email + Password sign-in via Supabase
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return { success: false, error: authError.message };
      }

      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          fullName: data.user.user_metadata?.full_name || email.split('@')[0],
          avatarUrl: data.user.user_metadata?.avatar_url,
          provider: 'email',
          createdAt: data.user.created_at || new Date().toISOString(),
        };
        setUser(profile);
        localStorage.setItem('valgent-auth-user', JSON.stringify(profile));
      }
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign in with email';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  // Email + Password sign-up via Supabase
  const signUpWithEmail = async (
    email: string,
    pass: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/projects`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return { success: false, error: authError.message };
      }

      if (data.user) {
        const needsConfirmation = !data.session;
        if (data.session) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: fullName || email.split('@')[0],
            avatarUrl: undefined,
            provider: 'email',
            createdAt: data.user.created_at || new Date().toISOString(),
          };
          setUser(profile);
          localStorage.setItem('valgent-auth-user', JSON.stringify(profile));
        }
        setLoading(false);
        return { success: true, needsConfirmation };
      }
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setUser(null);
    localStorage.removeItem('valgent-auth-user');
    localStorage.removeItem('valgent-auth-demo');
  };

  const clearError = () => setError(null);

  const updateAvatarUrl = (newAvatarUrl: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, avatarUrl: newAvatarUrl };
      localStorage.setItem('valgent-auth-user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signInWithGithub,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        clearError,
        updateAvatarUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
