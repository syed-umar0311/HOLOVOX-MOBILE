/**
 * Mirrors the color tokens defined in src/index.css on the web app
 * (canvas, ink, magenta, cobalt, card, border, destructive, muted).
 */
export const colors = {
  canvas: '#FDF2F4',
  ink: '#1E1B1B',
  inkMuted60: 'rgba(30, 27, 27, 0.6)',
  inkMuted40: 'rgba(30, 27, 27, 0.4)',
  inkMuted15: 'rgba(30, 27, 27, 0.15)',
  inkMuted10: 'rgba(30, 27, 27, 0.1)',
  magenta: '#E11D48',
  magentaMuted: 'rgba(225, 29, 72, 0.9)',
  cobalt: '#2F5AF5',
  card: '#FFFFFF',
  border: '#E5E7EB',
  destructive: '#DC2626',
  mutedForeground: '#6B7280',
};

export type Colors = typeof colors;
