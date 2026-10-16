export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  provider?: 'email' | 'google' | 'github' | 'demo';
  createdAt: string;
  username?: string;
  role?: string;
  company?: string;
  bio?: string;
  githubUrl?: string;
  location?: string;
  preferredTheme?: 'dark' | 'light';
  llmProvider?: 'gemini' | 'openrouter';
  autoRunVerification?: boolean;
  strictMode?: boolean;
  showConfidenceScores?: boolean;
}

export type AuthMode = 'login' | 'signup';

