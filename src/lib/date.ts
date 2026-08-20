const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatMeetingDateTime(date: Date): string {
  if (isSameDay(date, new Date())) {
    return `Today, ${formatTime(date)}`;
  }
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${formatTime(date)}`;
}

export function formatShortDateTime(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${formatTime(date)}`;
}

export function formatTalkTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
