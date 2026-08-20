export type RecordingType = 'audio' | 'video' | 'screen';

export interface Recording {
  id: string;
  title: string;
  type: RecordingType;
  duration: string;
  size: string;
  date: string;
  source: string;
  transcribed: boolean;
  starred?: boolean;
  playbackUrl?: string;
}
