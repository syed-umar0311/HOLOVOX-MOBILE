// Mirrors src/Pages/Auth.tsx's AuthSession shape on the web app, unchanged in structure so
// the same backend JWT payload maps 1:1 on both platforms.

export type AuthRole = 'user' | 'doctor' | 'lawyer' | 'expert' | 'guest';

export interface PendingSignupPayload {
  fullName: string;
  email: string;
  password: string;
  role: AuthRole;
}

export interface AuthSession {
  id?: string;
  email: string;
  name: string;
  fullName?: string;
  role: AuthRole;
  token: string;
  ts: number;
  subscription?: string;
  ProfilePicture?: string;
  profilePicture?: string;
  user?: Record<string, unknown>;
  trialActive?: boolean;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  trialDays?: number;
  subscriptionStatus?: string;
  subscriptionEndDate?: string | null;
  subscriptionStartDate?: string | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  enterpriseDetails?: {
    managers: number;
    reps: number;
    totalSeats: number;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
  } | null;
}

export type ApiRecord = Record<string, unknown>;
