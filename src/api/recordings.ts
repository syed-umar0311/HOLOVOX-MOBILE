import { V1_BASE_URL } from '@/config/env';

export interface Recording {
  id: string;
  title: string;
  type: 'audio' | 'video' | 'screen';
  duration: string;
  size: string;
  date: string;
  source: string;
  transcribed: boolean;
  playbackUrl?: string;
}

interface RawRecording {
  _id?: string;
  id?: string;
  meetingId?: string;
  title?: string;
  type?: string;
  duration?: string;
  length?: string;
  size?: string;
  fileSize?: string;
  createdAt?: string;
  source?: string;
  transcribed?: boolean;
  videoUrl?: string;
  audioUrl?: string;
  fileUrl?: string;
  url?: string;
  downloadUrl?: string;
}

function mapRecording(item: RawRecording): Recording {
  return {
    id: item._id ?? item.id ?? `${item.meetingId ?? 'recording'}_${Math.random()}`,
    title: item.title ?? `Room: ${item.meetingId ?? 'Unknown'}`,
    type: (item.type as Recording['type']) ?? (item.videoUrl ? 'video' : item.audioUrl ? 'audio' : 'screen'),
    duration: item.duration ?? item.length ?? '00:00',
    size: item.size ?? item.fileSize ?? '-',
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Unknown',
    source: item.source ?? 'Manual',
    transcribed: item.transcribed ?? false,
    playbackUrl: item.videoUrl ?? item.audioUrl ?? item.fileUrl ?? item.url ?? item.downloadUrl,
  };
}

export async function fetchRecordings(userId: string): Promise<Recording[]> {
  const res = await fetch(`${V1_BASE_URL}/getRecording/${userId}`);
  const data = (await res.json()) as { success?: boolean; data?: RawRecording[] };
  return data.success && data.data ? data.data.map(mapRecording) : [];
}

export async function deleteRecording(recordingId: string): Promise<void> {
  const res = await fetch(`${V1_BASE_URL}/delRecording?recordingId=${recordingId}`, { method: 'DELETE' });
  const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
  if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to delete recording');
}
