export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  provider?: 'email' | 'google' | 'demo';
  createdAt: string;
}

export type AuthMode = 'login' | 'signup';
