export interface MeetingListItem {
  id: string;
  title: string;
  date: string;
  duration: string;
  tags: string[];
  people: string;
  rawDate: Date;
}

export interface TranscriptLine {
  who: string;
  time: string;
  text: string;
}

export interface TranscriptParticipant {
  name: string;
  texts: string[];
  timestamps: string[];
}

export interface TranscriptData {
  meetingId: string;
  participants: TranscriptParticipant[];
  totalParticipants: number;
  totalTexts: number;
}

export interface SummaryCard {
  id: string;
  text: string;
  timestamp: string;
}

export function flattenAndSortTranscripts(transcripts: TranscriptData | null): TranscriptLine[] {
  if (!transcripts || !transcripts.participants.length) return [];

  const lines: (TranscriptLine & { ts: number })[] = [];

  transcripts.participants.forEach(participant => {
    participant.texts.forEach((text, index) => {
      if (!text || text === '[NO SPEECH DETECTED]') return;

      const raw = participant.timestamps?.[index];
      const date = raw ? new Date(raw) : new Date();
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;

      lines.push({
        who: participant.name,
        time: `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`,
        text,
        ts: date.getTime(),
      });
    });
  });

  lines.sort((a, b) => a.ts - b.ts);
  return lines.map(({ who, time, text }) => ({ who, time, text }));
}
