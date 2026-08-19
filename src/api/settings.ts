import { API_ROOT_URL } from '@/config/env';

export interface BillingData {
  subscription: string;
  trialActive: boolean;
  trialEndDate: string | null;
  trialDays: number;
  plan: { name: string; price: string; features: string[] };
}

export async function fetchBilling(userId: string, token: string): Promise<BillingData | null> {
  const res = await fetch(`${API_ROOT_URL}/user/billing?userId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { success?: boolean; data?: BillingData };
  return data.success ? data.data ?? null : null;
}

export async function startFreeTrial(userId: string, token: string): Promise<void> {
  const res = await fetch(`${API_ROOT_URL}/user/freeTrial?userId=${userId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { success?: boolean; error?: string };
  if (!data.success) throw new Error(data.error || 'Failed to start free trial');
}
