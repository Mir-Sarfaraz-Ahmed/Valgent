import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getFrontendAppUrl, getAuthCallbackUrl } from './auth-config';

describe('auth-config URL resolution', () => {
  const originalEnv = { ...process.env };
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as any).location;
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    process.env = { ...originalEnv };
  });

  it('defaults to http://localhost:5173 in local dev when no VITE_APP_URL is set', () => {
    (window as any).location = {
      origin: 'http://localhost:5173',
    };
    expect(getFrontendAppUrl()).toBe('http://localhost:5173');
    expect(getAuthCallbackUrl()).toBe('http://localhost:5173/auth/callback');
  });

  it('uses VITE_APP_URL when configured in environment', () => {
    import.meta.env.VITE_APP_URL = 'https://valgent-production.vercel.app';
    (window as any).location = {
      origin: 'http://localhost:5173',
    };

    expect(getFrontendAppUrl()).toBe('https://valgent-production.vercel.app');
    expect(getAuthCallbackUrl()).toBe('https://valgent-production.vercel.app/auth/callback');

    // Clean up
    delete import.meta.env.VITE_APP_URL;
  });

  it('rejects backend port 3000 origin and falls back to http://localhost:5173', () => {
    (window as any).location = {
      origin: 'http://localhost:3000',
    };
    expect(getFrontendAppUrl()).toBe('http://localhost:5173');
    expect(getAuthCallbackUrl()).toBe('http://localhost:5173/auth/callback');
  });

  it('strips trailing slashes correctly', () => {
    import.meta.env.VITE_APP_URL = 'https://my-valgent-app.com///';
    expect(getFrontendAppUrl()).toBe('https://my-valgent-app.com');
    expect(getAuthCallbackUrl()).toBe('https://my-valgent-app.com/auth/callback');
    delete import.meta.env.VITE_APP_URL;
  });
});
