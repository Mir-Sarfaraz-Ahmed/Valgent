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
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
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
    let username = authUser.user_metadata?.username;
    let bio = authUser.user_metadata?.bio;
    let role = authUser.user_metadata?.role;
    let company = authUser.user_metadata?.company;
    let location = authUser.user_metadata?.location;
    let githubUrl = authUser.user_metadata?.github_url;
    let preferredTheme = authUser.user_metadata?.preferred_theme;
    let llmProvider = authUser.user_metadata?.llm_provider;

    // Check profiles table for user's stored fields
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileRow?.avatar_url) rawAvatar = profileRow.avatar_url;
      if (profileRow?.full_name) fullName = profileRow.full_name;
      if (profileRow?.username) username = profileRow.username;
      if (profileRow?.bio) bio = profileRow.bio;
      if (profileRow?.role) role = profileRow.role;
      if (profileRow?.company) company = profileRow.company;
      if (profileRow?.location) location = profileRow.location;
      if (profileRow?.github_url) githubUrl = profileRow.github_url;
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
      username,
      bio,
      role,
      company,
      location,
      githubUrl,
      preferredTheme,
      llmProvider,
    };
  };

  useEffect(() => {
    // Check existing Supabase session or exchange OAuth code
    const initAuth = async () => {
      try {
        // Handle incoming OAuth callback with PKCE code
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('OAuth code exchange notice:', exchangeError.message);
          } else if (exchangeData?.session?.user) {
            const profile = await buildUserProfile(exchangeData.session.user, 'google');
            setUser(profile);
            localStorage.setItem('valgent-auth-user', JSON.stringify(profile));
            // Clean up the URL search params so the code isn't re-used
            window.history.replaceState({}, document.title, window.location.pathname);
            setLoading(false);
            return;
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          const profile = await buildUserProfile(session.user, 'email');
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await buildUserProfile(session.user, 'email');
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

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'No user signed in' };
      const updated: UserProfile = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem('valgent-auth-user', JSON.stringify(updated));

      // Attempt to sync to Supabase if authenticated
      try {
        const metadataUpdates: Record<string, any> = {};
        if (updates.fullName !== undefined) metadataUpdates.full_name = updates.fullName;
        if (updates.avatarUrl !== undefined) metadataUpdates.avatar_url = updates.avatarUrl;
        if (updates.username !== undefined) metadataUpdates.username = updates.username;
        if (updates.role !== undefined) metadataUpdates.role = updates.role;
        if (updates.company !== undefined) metadataUpdates.company = updates.company;
        if (updates.bio !== undefined) metadataUpdates.bio = updates.bio;
        if (updates.location !== undefined) metadataUpdates.location = updates.location;
        if (updates.githubUrl !== undefined) metadataUpdates.github_url = updates.githubUrl;
        if (updates.preferredTheme !== undefined) metadataUpdates.preferred_theme = updates.preferredTheme;
        if (updates.llmProvider !== undefined) metadataUpdates.llm_provider = updates.llmProvider;
        if (updates.autoRunVerification !== undefined) metadataUpdates.auto_run_verification = updates.autoRunVerification;
        if (updates.strictMode !== undefined) metadataUpdates.strict_mode = updates.strictMode;
        if (updates.showConfidenceScores !== undefined) metadataUpdates.show_confidence_scores = updates.showConfidenceScores;

        if (Object.keys(metadataUpdates).length > 0) {
          await supabase.auth.updateUser({ data: metadataUpdates });
        }

        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: updated.fullName,
          avatar_url: updated.avatarUrl,
          username: updated.username,
          bio: updated.bio,
          role: updated.role,
          company: updated.company,
          location: updated.location,
          github_url: updated.githubUrl,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Supabase remote profile sync note:', e);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.message || 'Failed to update profile' };
    }
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
        updateProfile,
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
