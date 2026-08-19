/**
 * Design tokens mirrored from the web app's src/index.css (oklch custom properties,
 * converted to sRGB hex). Keep this file as the single source of truth for color/radius/
 * typography in the RN app instead of re-deriving values ad hoc in components.
 */

export const radius = {
  sm: 12, // calc(var(--radius) - 4px) @ base 14px
  md: 12.5,
  lg: 14, // --radius base (0.875rem)
  xl: 18,
  '2xl': 22,
  '3xl': 26,
  '4xl': 30,
  full: 9999,
};

export const brand = {
  magenta: '#e11855',
  cobalt: '#005cff',
  lime: '#a1f400',
  amber: '#ff9710',
  violet: '#9a0eef',
  bandLemon: '#fff98d',
  bandBlush: '#ffd9d4',
  bandSky: '#c4eeff',
  bandMint: '#c3fee3',
  bandLilac: '#e7dcff',
};

export const lightColors = {
  canvas: '#fdf1f2',
  ink: '#1b1615',
  monitor: '#17100f',
  background: '#fdf1f2',
  foreground: '#1b1615',
  card: '#ffffff',
  cardForeground: '#1b1615',
  popover: '#ffffff',
  popoverForeground: '#1b1615',
  primary: brand.magenta,
  primaryForeground: '#fcfcfc',
  secondary: '#efeeeb',
  secondaryForeground: '#1b1615',
  muted: '#ecebe7',
  mutedForeground: '#515561',
  accent: '#e9e8e4',
  accentForeground: '#1b1615',
  destructive: '#f20016',
  destructiveForeground: '#fcfcfc',
  border: '#dfe1e4',
  input: '#dfe1e4',
  ring: brand.magenta,
  sidebar: '#f3f2ee',
  sidebarForeground: '#1b1615',
  sidebarPrimary: brand.magenta,
  sidebarPrimaryForeground: '#fcfcfc',
  sidebarAccent: '#e9e8e4',
  sidebarAccentForeground: '#1b1615',
  sidebarBorder: '#dfded8',
  sidebarRing: brand.magenta,
  chart1: brand.magenta,
  chart2: brand.cobalt,
  chart3: brand.lime,
  chart4: brand.amber,
  chart5: brand.violet,
};

export const darkColors = {
  canvas: '#14171e',
  ink: '#f9fafc',
  monitor: '#04070f',
  background: '#080c14',
  foreground: '#f9fafc',
  card: '#161921',
  cardForeground: '#f9fafc',
  popover: '#161921',
  popoverForeground: '#f9fafc',
  primary: brand.magenta,
  primaryForeground: '#fcfcfc',
  secondary: '#1e2229',
  secondaryForeground: '#f9fafc',
  muted: '#1e2229',
  mutedForeground: '#b2b8c1',
  accent: '#252930',
  accentForeground: '#f9fafc',
  destructive: '#f20016',
  destructiveForeground: '#fcfcfc',
  border: '#ffffff1a',
  input: '#ffffff24',
  ring: brand.magenta,
  sidebar: '#0e121a',
  sidebarForeground: '#f9fafc',
  sidebarPrimary: brand.magenta,
  sidebarPrimaryForeground: '#fcfcfc',
  sidebarAccent: '#252930',
  sidebarAccentForeground: '#f9fafc',
  sidebarBorder: '#ffffff1a',
  sidebarRing: brand.magenta,
  chart1: brand.magenta,
  chart2: brand.cobalt,
  chart3: brand.lime,
  chart4: brand.amber,
  chart5: brand.violet,
};

export type ThemeColors = typeof lightColors;

// Geist/GeistMono are loaded from a CDN as webfonts on the web app — RN needs bundled
// font files. Until those are added under android/app/src/main/assets/fonts, fall back
// to the platform system font so text still renders correctly.
export const fonts = {
  sans: 'System',
  mono: 'monospace',
  display: 'System',
};

export const spacing = (n: number) => n * 4;
