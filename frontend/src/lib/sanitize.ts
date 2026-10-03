/**
 * A small helper to sanitize text that might be displayed in the UI,
 * specifically looking for and masking accidental secrets leaked from
 * the backend.
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';

  let sanitized = text;

  // Mask common API key patterns
  // Gemini/Google
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GOOGLE_API_KEY]');

  // Generic Bearer Token
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9-._~+/]+=*/g, 'Bearer [REDACTED_TOKEN]');

  // Private keys
  sanitized = sanitized.replace(/-----BEGIN PRIVATE KEY-----(?:.|[\r\n])*?-----END PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]');

  // Generic patterns like GEMINI_API_KEY=..., OPENROUTER_API_KEY=...
  sanitized = sanitized.replace(/(GEMINI_API_KEY|OPENROUTER_API_KEY|JWT_SECRET)[=:]\s*["']?([^\s"'&]+)["']?/g, '$1=[REDACTED]');

  return sanitized;
}

export function sanitizeObject(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const [k, v] of Object.entries(obj)) {
      newObj[k] = sanitizeObject(v);
    }
    return newObj;
  }
  return obj;
}
