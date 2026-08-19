import { V1_BASE_URL } from '@/config/env';

export interface AnalyticsPayload {
  range: string;
  totals: { calls: number; talkMinutes: number; winRate: number; activeReps: number };
  callsData: { day: string; calls: number; talkTime: number }[];
  sentimentData: { name: string; value: number; color: string }[];
  topicsData: { topic: string; count: number; sentiment: number }[];
  repsData: { rep: string; calls: number; win: number; talk: number }[];
  meta: { winRateIsHeuristic: boolean; talkTimeIsEstimated: boolean; transcriptCoverage: string };
}

export async function fetchAnalytics(userId: string, range: '7d' | '30d' | '90d'): Promise<AnalyticsPayload> {
  const res = await fetch(`${V1_BASE_URL}/analytics/${userId}?range=${range}`);
  const payload = (await res.json()) as { success?: boolean; message?: string; data?: AnalyticsPayload };
  if (!payload.success || !payload.data) throw new Error(payload.message || 'Failed to load analytics');
  return payload.data;
}
