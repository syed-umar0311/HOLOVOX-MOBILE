export interface CalendarMeeting {
  id: string;
  title: string;
  start: string;
  hour: number;
  minute: number;
  duration: number;
  date: Date;
  meetingLink?: string;
  agenda?: string;
  participants: string[];
}

export type MeetingCategory = 'upcoming' | 'ongoing' | 'past';

export function getMeetingStart(meeting: CalendarMeeting): Date {
  const start = new Date(meeting.date);
  start.setHours(meeting.hour, meeting.minute, 0, 0);
  return start;
}

export function getMeetingEnd(meeting: CalendarMeeting): Date {
  const start = getMeetingStart(meeting);
  return new Date(start.getTime() + (meeting.duration || 1) * 60 * 60000);
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
