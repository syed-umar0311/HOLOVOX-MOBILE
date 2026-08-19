import { V1_BASE_URL, API_ROOT_URL, AI_ASSISTANT_API_BASE_URL } from '@/config/env';

export interface RawMeetingParticipant {
  email?: string;
  name?: string;
  role?: string;
}

export interface RawMeeting {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  date?: string;
  time: string;
  upcoming: boolean;
  hostId?: string;
  participants?: RawMeetingParticipant[];
  meetingLink?: string;
  meetingUrl?: string;
  link?: string;
  joinLink?: string;
  inviteLink?: string;
  url?: string;
  agenda?: string;
}

export interface Meeting {
  id: string;
  title: string;
  withPeople: string;
  date: Date;
  timeLabel: string;
  meetingLink?: string;
  agenda?: string;
}

function resolveMeetingLink(m: RawMeeting): string | undefined {
  return m.meetingLink ?? m.meetingUrl ?? m.link ?? m.joinLink ?? m.inviteLink ?? m.url;
}

function mapMeeting(m: RawMeeting): Meeting {
  const invitees = (m.participants ?? []).filter((p) => p.role !== 'host').map((p) => p.name || p.email);
  return {
    id: m.meetingId,
    title: m.meetingTitle,
    withPeople: invitees.filter(Boolean).join(', ') || 'TBD',
    date: new Date(m.meetingDate ?? m.date ?? Date.now()),
    timeLabel: m.time,
    meetingLink: resolveMeetingLink(m),
    agenda: m.agenda,
  };
}

/** Mirrors dashboard.index.tsx's fetchMeetings: GET /getMeeting?email=, split into
 * upcoming/past filtered to meetings the current user hosts or is invited to. */
export async function fetchMeetings(
  email: string,
  userId: string,
): Promise<{ upcoming: Meeting[]; past: Meeting[] }> {
  const res = await fetch(`${V1_BASE_URL}/getMeeting?email=${encodeURIComponent(email)}`);
  const data = (await res.json()) as { success?: boolean; meetings?: RawMeeting[] };
  if (!data.success || !data.meetings) return { upcoming: [], past: [] };

  const belongsToUser = (m: RawMeeting) =>
    m.hostId === userId || (m.participants ?? []).some((p) => p.email === email);

  const upcoming = data.meetings.filter((m) => m.upcoming === true && belongsToUser(m)).map(mapMeeting);
  const past = data.meetings.filter((m) => m.upcoming === false && belongsToUser(m)).map(mapMeeting);
  return { upcoming, past };
}

/** All meetings the user belongs to, unfiltered by upcoming/past — used by the Calendar
 * screen's agenda list (web's Dashboard.calendar.tsx fetches GET /getMeeting with no
 * email filter, then filters client-side; kept the same filter approach here). */
export async function fetchAllMeetings(email: string, userId: string): Promise<Meeting[]> {
  const res = await fetch(`${V1_BASE_URL}/getMeeting`);
  const data = (await res.json()) as { success?: boolean; meetings?: RawMeeting[] };
  if (!data.success || !data.meetings) return [];
  return data.meetings
    .filter((m) => m.hostId === userId || (m.participants ?? []).some((p) => p.email === email))
    .map(mapMeeting);
}

export interface MeetingHours {
  label: string;
  isEstimated: boolean;
}

function formatTalkTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export async function fetchMeetingHours(userId: string): Promise<MeetingHours> {
  const res = await fetch(`${V1_BASE_URL}/analytics/${userId}?range=30d`);
  const payload = (await res.json()) as {
    success?: boolean;
    data?: { totals: { talkMinutes: number }; meta: { talkTimeIsEstimated: boolean } };
  };
  if (!res.ok || !payload.success || !payload.data) {
    throw new Error('Failed to load meeting hours');
  }
  return {
    label: formatTalkTime(payload.data.totals.talkMinutes),
    isEstimated: payload.data.meta.talkTimeIsEstimated,
  };
}

export interface Task {
  _id: string;
  meetingId: string;
  meetingTitle: string;
  task: string;
  context: string;
  assignedBy: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
}

export async function fetchTasks(identifier: { userEmail?: string; userId?: string; userName?: string }): Promise<Task[]> {
  const params = new URLSearchParams();
  if (identifier.userEmail) params.set('userEmail', identifier.userEmail);
  else if (identifier.userId) params.set('userId', identifier.userId);
  else if (identifier.userName) params.set('userName', identifier.userName);
  else return [];

  const res = await fetch(`${AI_ASSISTANT_API_BASE_URL}/tasks?${params.toString()}`);
  const data = (await res.json()) as { success?: boolean; data?: Task[] };
  return data.success ? data.data ?? [] : [];
}

export async function updateTaskStatus(
  taskId: string,
  status: Task['status'],
  identifier: { userId?: string; userEmail?: string; userName?: string },
): Promise<void> {
  const res = await fetch(`${AI_ASSISTANT_API_BASE_URL}/tasks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, status, ...identifier }),
  });
  const data = (await res.json()) as { success?: boolean; error?: string };
  if (!data.success) throw new Error(data.error || 'Failed to update task');
}

export async function fetchUnreadEventsCount(userId: string): Promise<number> {
  const res = await fetch(`${API_ROOT_URL}/events?userId=${encodeURIComponent(userId)}&limit=10`);
  const data = (await res.json()) as { success?: boolean; unreadCount?: number };
  return data.success ? data.unreadCount ?? 0 : 0;
}
