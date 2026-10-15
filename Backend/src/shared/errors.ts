/**
 * V1.0-A — Structured Analysis Error Model
 * 
 * Provides typed error codes, safe error formatting, and secret redaction.
 */

export type AnalysisErrorCode =
  | 'INVALID_REQUEST'
  | 'REPOSITORY_FETCH_FAILED'
  | 'PROJECT_MAPPING_FAILED'
  | 'STATIC_ANALYSIS_FAILED'
  | 'EXECUTION_FAILED'
  | 'LLM_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'REPORT_AUDIT_FAILED'
  | 'INTERNAL_ERROR';

export interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
  stage: string;
  retryable: boolean;
  details?: string[];
}

/** Patterns that must never appear in logs or error messages. */
const SECRET_PATTERNS = [
  /(?:AIza|sk-|or-)[A-Za-z0-9_-]{20,}/g,                   // API keys
  /Bearer\s+[A-Za-z0-9._~+\/=-]+/gi,                       // Auth headers
  /(?:GEMINI|OPENROUTER|JWT|SECRET|TOKEN)_?(?:API)?_?KEY\s*=\s*\S+/gi, // env vars
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,   // JWTs
];

/**
 * Redacts secret values from a string.
 * Replaces matched patterns with [REDACTED].
 */
export function redactSecrets(input: string): string {
  let sanitized = input;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Classifies an error into an AnalysisErrorCode based on the stage and error content.
 */
export function classifyError(error: any, stage: string): AnalysisError {
  const rawMessage = error?.message || String(error);
  const message = redactSecrets(rawMessage);

  // Stage-specific classification
  switch (stage) {
    case 'INITIALIZED':
    case 'INGESTING':
      if (rawMessage.includes('Invalid GitHub URL') || rawMessage.includes('ZodError')) {
        return { code: 'INVALID_REQUEST', message, stage, retryable: false };
      }
      return { code: 'REPOSITORY_FETCH_FAILED', message, stage, retryable: true };

    case 'PROJECT_MAPPED':
      return { code: 'PROJECT_MAPPING_FAILED', message, stage, retryable: false };

    case 'STATIC_ANALYSIS':
      return { code: 'STATIC_ANALYSIS_FAILED', message, stage, retryable: false };

    case 'DYNAMIC_ANALYSIS':
    case 'EXECUTION_PLANNING':
      return { code: 'EXECUTION_FAILED', message, stage, retryable: false };

    case 'LLM_SYNTHESIS':
      return { code: 'LLM_UNAVAILABLE', message, stage, retryable: true };

    case 'AUTONOMOUS_VALIDATION':
    case 'CLAIMS_VALIDATED':
      return { code: 'VALIDATION_FAILED', message, stage, retryable: false };

    case 'REPORT_GENERATED':
    case 'REPORT_AUDITED':
      return { code: 'REPORT_AUDIT_FAILED', message, stage, retryable: false };

    default:
      return { code: 'INTERNAL_ERROR', message, stage, retryable: false };
  }
}

/**
 * Classifies an LLM error into a specific error_code for the LlmStatus.
 */
export function classifyLlmError(error: any): { error_code: string; retryable: boolean } {
  const msg = error?.message || '';
  
  if (msg.includes('429') || msg.includes('QUOTA') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
    return { error_code: 'QUOTA_EXCEEDED', retryable: true };
  }
  if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('rate-limits')) {
    return { error_code: 'SERVICE_UNAVAILABLE', retryable: true };
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('API_KEY_INVALID')) {
    return { error_code: 'AUTHENTICATION_FAILED', retryable: false };
  }
  if (msg.includes('500')) {
    return { error_code: 'SERVICE_UNAVAILABLE', retryable: true };
  }
  if (msg.includes('timeout') || msg.includes('TIMEOUT') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET')) {
    return { error_code: 'SERVICE_UNAVAILABLE', retryable: true };
  }
  // Zod errors or JSON parse errors
  if (error?.constructor?.name === 'ZodError' || msg.includes('Unexpected token') || msg.includes('JSON')) {
    return { error_code: 'INVALID_RESPONSE', retryable: false };
  }
  
  return { error_code: 'UNKNOWN', retryable: false };
}
