export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  provider?: 'email' | 'google' | 'github' | 'demo';
  createdAt: string;
}

export type AuthMode = 'login' | 'signup';
