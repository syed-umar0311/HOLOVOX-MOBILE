import { API_ROOT_URL } from '@/config/env';

export interface KnockEventMetadata {
  fromId?: string;
  fromName?: string;
  fromRole?: 'owner' | 'manager' | 'rep';
  isInstantMeeting?: boolean;
  roomId?: string;
  meetingTitle?: string;
}

export interface AppEvent {
  _id: string;
  type?: string;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
  metadata?: KnockEventMetadata;
}

export async function fetchEvents(userId: string, token?: string, limit = 20): Promise<AppEvent[]> {
  const res = await fetch(`${API_ROOT_URL}/events?userId=${encodeURIComponent(userId)}&limit=${limit}&_t=${Date.now()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const data = (await res.json()) as { success?: boolean; data?: AppEvent[] };
  return data.success ? data.data ?? [] : [];
}

export async function markEventRead(userId: string, eventId: string): Promise<void> {
  await fetch(`${API_ROOT_URL}/events`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, eventId }),
  });
}
