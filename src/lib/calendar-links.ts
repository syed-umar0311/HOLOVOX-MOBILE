import { Share } from 'react-native';

// Ported unchanged from the web app's src/lib/calendar-links.ts — this is pure date/string
// logic with no DOM dependency, so it works as-is on RN. Only the final "trigger a browser
// download" step at the bottom differs (see shareIcsFile).

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  joinUrl?: string;
  start: Date;
  durationMinutes?: number;
  end?: Date;
  organizer?: { name?: string; email?: string };
  participants?: string[];
}

interface NormalizedCalendarEvent {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  timezone: string;
  organizer?: { name?: string; email?: string };
  participants: string[];
}

export type CalendarProviderId = 'google' | 'outlook' | 'office365' | 'apple';

export type CalendarProviderLink =
  | { id: CalendarProviderId; label: string; kind: 'link'; href: string }
  | { id: CalendarProviderId; label: string; kind: 'download'; getFile: () => { filename: string; content: string } };

const DEFAULT_DURATION_MINUTES = 60;

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatLocalWallClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'meeting';
}

function generateUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@holovox.io`;
}

export function normalizeCalendarEvent(input: CalendarEventInput): NormalizedCalendarEvent | null {
  if (!isValidDate(input.start)) return null;

  const durationMinutes =
    typeof input.durationMinutes === 'number' && input.durationMinutes > 0 ? input.durationMinutes : DEFAULT_DURATION_MINUTES;
  const end = isValidDate(input.end) ? input.end : new Date(input.start.getTime() + durationMinutes * 60000);

  const title = input.title?.trim() || 'HOLOVOX Meeting';
  const joinUrl = input.joinUrl?.trim();
  const agenda = input.description?.trim() || 'No agenda provided';

  const descriptionParts = [`Agenda: ${agenda}`];
  if (joinUrl) descriptionParts.push(`Join link: ${joinUrl}`);

  return {
    title,
    description: descriptionParts.join('\n\n'),
    location: input.location?.trim() || joinUrl || '',
    start: input.start,
    end,
    timezone: 'UTC',
    organizer: input.organizer,
    participants: (input.participants ?? []).map((p) => p.trim()).filter(Boolean),
  };
}

function buildGoogleUrl(e: NormalizedCalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${formatLocalWallClock(e.start)}/${formatLocalWallClock(e.end)}`,
    details: e.description,
    ctz: e.timezone,
  });
  if (e.location) params.set('location', e.location);
  if (e.participants.length) params.set('add', e.participants.join(','));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookUrl(e: NormalizedCalendarEvent, host: 'outlook.live.com' | 'outlook.office.com'): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    subject: e.title,
    body: e.description,
  });
  if (e.location) params.set('location', e.location);
  return `https://${host}/calendar/0/deeplink/compose?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function buildIcsContent(e: NormalizedCalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HOLOVOX//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUid()}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(e.start)}`,
    `DTEND:${formatUtc(e.end)}`,
    `SUMMARY:${escapeIcsText(e.title)}`,
    `DESCRIPTION:${escapeIcsText(e.description)}`,
  ];
  if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
  if (e.organizer?.email) {
    const cn = e.organizer.name ? `;CN=${escapeIcsText(e.organizer.name)}` : '';
    lines.push(`ORGANIZER${cn}:mailto:${e.organizer.email}`);
  }
  e.participants.filter((p) => p.includes('@')).forEach((email) => lines.push(`ATTENDEE;CN=${escapeIcsText(email)}:mailto:${email}`));
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function getCalendarProviderLinks(input: CalendarEventInput): CalendarProviderLink[] {
  const normalized = normalizeCalendarEvent(input);
  if (!normalized) return [];

  const builders: Array<() => CalendarProviderLink> = [
    () => ({ id: 'google', label: 'Google Calendar', kind: 'link', href: buildGoogleUrl(normalized) }),
    () => ({ id: 'outlook', label: 'Outlook.com', kind: 'link', href: buildOutlookUrl(normalized, 'outlook.live.com') }),
    () => ({ id: 'office365', label: 'Office 365', kind: 'link', href: buildOutlookUrl(normalized, 'outlook.office.com') }),
    () => ({
      id: 'apple',
      label: 'Apple / Other (.ics)',
      kind: 'download',
      getFile: () => ({ filename: `${sanitizeFileName(normalized.title)}.ics`, content: buildIcsContent(normalized) }),
    }),
  ];

  const links: CalendarProviderLink[] = [];
  for (const build of builders) {
    try {
      links.push(build());
    } catch {
      // one bad provider link shouldn't drop the rest
    }
  }
  return links;
}

/** RN has no browser download API. The closest real equivalent to the web app's anchor-click
 * .ics download is Android's native Share sheet — the user picks a target (Drive, email,
 * a calendar app that accepts shared .ics text) to save/import it. */
export async function shareIcsFile(file: { filename: string; content: string }): Promise<void> {
  await Share.share({ title: file.filename, message: file.content });
}
