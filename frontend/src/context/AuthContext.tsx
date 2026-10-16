import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  clearError: () => void;
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

  useEffect(() => {
    // Check existing Supabase session
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Authenticated User',
            avatarUrl: session.user.user_metadata?.avatar_url,
            provider: (session.user.app_metadata?.provider as any) || 'email',
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setUser(profile);
          localStorage.setItem('valgent-auth-user', JSON.stringify(profile));
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Authenticated User',
          avatarUrl: session.user.user_metadata?.avatar_url,
          provider: (session.user.app_metadata?.provider as any) || 'email',
          createdAt: session.user.created_at || new Date().toISOString(),
        };
        setUser(profile);
        localStorage.setItem('valgent-auth-user', JSON.stringify(profile));
      } else {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        clearError,
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
