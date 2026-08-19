import { V1_BASE_URL } from '@/config/env';

export type JoinResult =
  | { status: 'admitted'; token: string; url: string }
  | { status: 'waiting' }
  | { status: 'locked' }
  | { status: 'password_required' | 'invalid_password' };

interface RequestJoinParams {
  roomId: string;
  userId: string;
  name: string;
  isHost: boolean;
  image?: string | null;
  password?: string;
}

/** Mirrors call.$roomId.tsx's requestJoin: POST /token, with 423 (locked) and 401
 * (password required/invalid) handled as normal flow states rather than thrown errors. */
export async function requestJoinToken(params: RequestJoinParams): Promise<JoinResult> {
  const response = await fetch(`${V1_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: params.roomId,
      userId: params.userId,
      name: params.name,
      isHost: params.isHost,
      image: params.image ?? null,
      password: params.password || undefined,
    }),
  });

  if (response.status === 423) return { status: 'locked' };

  if (response.status === 401) {
    const body = (await response.json().catch(() => ({}))) as { status?: 'password_required' | 'invalid_password' };
    return { status: body.status ?? 'invalid_password' };
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(errBody?.message || 'Failed to generate connection token');
  }

  const data = (await response.json()) as { status?: string; token: string; url: string };
  if (data.status === 'waiting') return { status: 'waiting' };
  return { status: 'admitted', token: data.token, url: data.url };
}

export async function fetchWaitingStatus(roomId: string, userId: string): Promise<'waiting' | 'admitted' | 'denied' | 'locked'> {
  const res = await fetch(`${V1_BASE_URL}/waiting-status/${roomId}/${userId}`);
  const data = (await res.json()) as { status?: string };
  return (data.status as 'waiting' | 'admitted' | 'denied' | 'locked') ?? 'waiting';
}

export async function endMeeting(roomId: string, payload: { userId?: string; participantToken?: string }): Promise<void> {
  await fetch(`${V1_BASE_URL}/end-meeting/${roomId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteMicrophoneAudio(userId: string): Promise<void> {
  await fetch(`${V1_BASE_URL}/microphone-audio/${userId}`, { method: 'DELETE' });
}
