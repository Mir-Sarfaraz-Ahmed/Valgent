import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signInDemo: (email?: string, name?: string) => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Check if demo user stored in localStorage
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
        }
      } catch (err: any) {
        console.warn('Supabase auth session check notice:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
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
      } else if (!localStorage.getItem('valgent-auth-demo')) {
        setUser(null);
        localStorage.removeItem('valgent-auth-user');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Google OAuth sign-in
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/projects`,
        },
      });
      if (authError) throw authError;
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err?.message || 'Google sign-in failed');
      setLoading(false);
      throw err;
    }
  };

  // Email + Password sign-in
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
        localStorage.removeItem('valgent-auth-demo');
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

  // Email + Password sign-up
  const signUpWithEmail = async (email: string, pass: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
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
        },
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
          fullName: fullName || email.split('@')[0],
          avatarUrl: undefined,
          provider: 'email',
          createdAt: data.user.created_at || new Date().toISOString(),
        };
        setUser(profile);
        localStorage.setItem('valgent-auth-user', JSON.stringify(profile));
        localStorage.removeItem('valgent-auth-demo');
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

  // Instant developer demo login (useful for reviewer preview)
  const signInDemo = (email = 'sarfaraz.developer@valgent.ai', name = 'Sarfaraz Ahmed') => {
    const profile: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email,
      fullName: name,
      provider: 'demo',
      createdAt: new Date().toISOString(),
    };
    setUser(profile);
    localStorage.setItem('valgent-auth-user', JSON.stringify(profile));
    localStorage.setItem('valgent-auth-demo', 'true');
    setError(null);
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
        signInDemo,
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
