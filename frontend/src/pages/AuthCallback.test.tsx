import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthCallback } from './AuthCallback';
import { supabase } from '../lib/supabase';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      setSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    loading: false,
  }),
}));

describe('AuthCallback Page', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
  });

  afterEach(() => {
    (window as any).location = originalLocation;
  });

  it('renders loading state initially', () => {
    (window as any).location = {
      pathname: '/auth/callback',
      search: '',
      hash: '',
    };
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    expect(screen.getByText('Completing authentication...')).toBeDefined();
  });

  it('handles PKCE authorization code exchange and redirects to /projects', async () => {
    const mockUser = { id: 'u1', email: 'dev@valgent.com' };

    (window as any).location = {
      pathname: '/auth/callback',
      search: '?code=valid-pkce-auth-code',
      hash: '',
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.exchangeCodeForSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid-pkce-auth-code');
      expect(replaceStateSpy).toHaveBeenCalledWith({}, document.title, '/auth/callback');
      expect(mockNavigate).toHaveBeenCalledWith('/projects', { replace: true });
    });
  });

  it('displays user-friendly error and does not loop if error is received from provider', async () => {
    (window as any).location = {
      pathname: '/auth/callback',
      search: '?error=access_denied&error_description=User+cancelled+the+login+request',
      hash: '',
    };

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Authentication Failed')).toBeDefined();
      expect(screen.getByText('User cancelled the login request')).toBeDefined();
      expect(screen.getByText('Return to Login')).toBeDefined();
    });

    // Should not call exchange or navigate to projects
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles already active session without duplicate code exchange', async () => {
    const mockUser = { id: 'u1', email: 'dev@valgent.com' };

    (window as any).location = {
      pathname: '/auth/callback',
      search: '?code=already-consumed-code',
      hash: '',
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/projects', { replace: true });
    });

    // Does not perform redundant exchange
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
