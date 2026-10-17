import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      setSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

const TestConsumer = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading Auth...</div>;
  return <div>{user ? `User: ${user.email} (${user.provider})` : 'Not Logged In'}</div>;
};

describe('AuthContext Hash Fragment Token Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('detects access_token and refresh_token from URL hash and sets session', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'shadabalam3506@gmail.com',
      app_metadata: { provider: 'google' },
      user_metadata: { full_name: 'Shadab Alam' },
      created_at: new Date().toISOString(),
    };

    (supabase.auth.setSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const originalLocation = window.location;
    const replaceMock = vi.fn();
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      hash: '#access_token=test-access-token&refresh_token=test-refresh-token&token_type=bearer',
      pathname: '/',
      search: '',
      replace: replaceMock,
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      });
    });

    // Should clean the URL history
    expect(replaceStateSpy).toHaveBeenCalled();

    // Should display authenticated user with google provider
    await waitFor(() => {
      expect(screen.getByText(/shadabalam3506@gmail.com/)).toBeDefined();
      expect(screen.getByText(/google/)).toBeDefined();
    });

    (window as any).location = originalLocation;
  });
});
