import AsyncStorage from '@react-native-async-storage/async-storage';
import { V1_BASE_URL } from '@/config/env';
import type { AuthSession, ApiRecord } from '@/types/auth';

// Ported near-verbatim from call.$roomId.tsx's host-resolution logic — pure identity
// matching, portable as-is. Only isStoredHost/markStored below swap localStorage for
// AsyncStorage (async instead of sync).

const readIdValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'object' || value === null) return '';
  const record = value as ApiRecord;
  return readIdValue(record._id) || readIdValue(record.id) || readIdValue(record.userId) || readIdValue(record.$oid);
};

const normalizeId = (value: unknown): string => readIdValue(value).trim();

const sameId = (left: unknown, right: unknown): boolean => {
  const leftId = normalizeId(left);
  const rightId = normalizeId(right);
  return Boolean(leftId && rightId && leftId === rightId);
};

const readMeetingHostId = (meeting: unknown): string => {
  if (typeof meeting !== 'object' || meeting === null) return '';
  const record = meeting as ApiRecord;
  return (
    normalizeId(record.hostId) ||
    normalizeId(record.host) ||
    normalizeId(record.hostUserId) ||
    normalizeId(record.createdBy) ||
    normalizeId(record.creatorId) ||
    normalizeId(record.userId)
  );
};

function collectSessionIdentityCandidates(session: AuthSession | null, fallbackUserId?: string): string[] {
  const candidates = new Set<string>();
  const add = (value: unknown) => {
    const id = normalizeId(value);
    if (id) candidates.add(id);
  };

  add(fallbackUserId);
  add(session?.email);
  add(session?.token);

  const user = session?.user as ApiRecord | undefined;
  if (user) {
    add(user._id);
    add(user.id);
    add(user.userId);
    add(user.user_id);
    add(user.sub);
    add(user.email);
  }

  return [...candidates];
}

function participantLooksLikeHost(participant: unknown, sessionIds: string[]): boolean {
  if (typeof participant !== 'object' || participant === null) return false;
  const record = participant as ApiRecord;
  const role = typeof record.role === 'string' ? record.role.toLowerCase() : '';
  const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';

  const hasHostFlag = record.isHost === true || record.host === true || role === 'host' || type === 'host';
  if (!hasHostFlag) return false;

  const participantIds = [
    record.userId,
    record.user_id,
    record.participantId,
    record._id,
    record.id,
    record.email,
    record.token,
    record.participantToken,
  ];

  return participantIds.some((id) => sessionIds.some((sessionId) => sameId(id, sessionId)));
}

const hostStorageKey = (roomId: string) => `HOLOVOX_host_${roomId}`;

async function isStoredHost(roomId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(hostStorageKey(roomId))) === 'true';
}

async function markStoredHost(roomId: string): Promise<void> {
  await AsyncStorage.setItem(hostStorageKey(roomId), 'true');
}

export async function resolveIsMeetingHost(roomId: string, userId: string, session: AuthSession | null): Promise<boolean> {
  if (await isStoredHost(roomId)) return true;

  const sessionIds = collectSessionIdentityCandidates(session, userId);
  if (session?.role === 'guest' || sessionIds.length === 0) return false;

  try {
    const response = await fetch(`${V1_BASE_URL}/validate-meeting/${roomId}`);
    const data = (await response.json()) as ApiRecord;
    const nested = data.data as ApiRecord | undefined;
    const meeting = data.meeting || nested?.meeting || nested || data;
    const hostId = readMeetingHostId(meeting);
    const meetingRecord = typeof meeting === 'object' && meeting !== null ? (meeting as ApiRecord) : {};
    const participants = Array.isArray(meetingRecord.participants) ? meetingRecord.participants : [];

    const isHost =
      (Boolean(hostId) && sessionIds.some((sessionId) => sameId(hostId, sessionId))) ||
      participants.some((participant) => participantLooksLikeHost(participant, sessionIds));

    if (isHost) await markStoredHost(roomId);
    return isHost;
  } catch {
    return false;
  }
}
