import { V1_BASE_URL } from '@/config/env';

export interface ShareMeetingParams {
  meetingLink?: string;
  emails: string[];
  meetingId?: string;
  hostName: string;
  hostEmail: string;
  title: string;
  agenda?: string;
  time?: string;
  date?: string;
  icsContent?: string;
  icsFilename?: string;
}

export async function shareMeetingLink(params: ShareMeetingParams): Promise<void> {
  const res = await fetch(`${V1_BASE_URL}/shareMeetingLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { message?: string };
  if (!res.ok) throw new Error(data.message || 'Failed to share meeting');
}
