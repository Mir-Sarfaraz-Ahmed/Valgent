import type { AnalyzeRequest, AnalysisResponse, ErrorResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  public code: string;
  public stage: string;
  public details?: string[];

  constructor(errorResponse: ErrorResponse) {
    super(errorResponse.error.message);
    this.name = 'ApiError';
    this.code = errorResponse.error.code;
    this.stage = errorResponse.error.stage;
    this.details = errorResponse.error.details;
  }
}

export async function analyzeProject(request: AnalyzeRequest): Promise<AnalysisResponse> {
  const controller = new AbortController();
  // 5 minute timeout
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData && errorData.error) {
        throw new ApiError(errorData);
      }
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Analysis request timed out after 5 minutes.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
