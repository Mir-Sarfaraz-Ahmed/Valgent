/**
 * Authentication & Redirect URL Configuration for Valgent
 *
 * Ensures a single, deterministic frontend application URL and OAuth callback
 * across local development (http://localhost:5173) and production environments.
 */

/**
 * Resolves the explicit frontend application origin URL.
 *
 * 1. Checks `VITE_APP_URL` environment variable first (e.g. deployed production domain).
 * 2. Checks browser `window.location.origin` if not running on port 3000 (backend API server).
 * 3. Fallback for local Vite dev server: 'http://localhost:5173'.
 */
export function getFrontendAppUrl(): string {
  const envAppUrl = import.meta.env.VITE_APP_URL;
  if (envAppUrl && typeof envAppUrl === 'string' && envAppUrl.trim().length > 0) {
    return envAppUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    // Guard against accidentally deriving from backend port 3000
    if (!origin.includes(':3000')) {
      return origin.replace(/\/+$/, '');
    }
  }

  return 'http://localhost:5173';
}

/**
 * Returns the canonical OAuth callback URL for Supabase Auth redirect.
 * E.g. 'http://localhost:5173/auth/callback' or 'https://valgent.app/auth/callback'
 */
export function getAuthCallbackUrl(): string {
  return `${getFrontendAppUrl()}/auth/callback`;
}
