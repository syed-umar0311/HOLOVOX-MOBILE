import Config from 'react-native-config';

const DEFAULT_GOOGLE_CLIENT_ID =
  '615424693578-pcb1i9ldgufln2beg8cqmepavkl67jvu.apps.googleusercontent.com';

// react-native-config values are baked in at native build time (Config values come back
// undefined until the app is rebuilt after editing .env — Metro reload alone isn't enough).
export const API_BASE_URL = (
  Config.API_BASE_URL ?? 'https://holovoxserver-production-eb5d.up.railway.app/api'
).replace(/\/$/, '');

export const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

export const ENTERPRISE_API_BASE_URL = (
  Config.ENTERPRISE_API_BASE_URL ?? `${API_BASE_URL}/v1`
).replace(/\/$/, '');

// Same host as ENTERPRISE_API_BASE_URL — most of the general dashboard REST surface
// (meetings, recordings, chat, analytics) lives under /api/v1 too, not just enterprise
// endpoints. Alias kept so call sites read clearly.
export const V1_BASE_URL = ENTERPRISE_API_BASE_URL;

// A few endpoints (user profile/events/billing) hang directly off /api, one level up
// from /api/v1 — mirrors the web app's separate `API_BASE_URL = ".../api/"` constant
// used in Dashboard.tsx/Dashboard.profile.tsx instead of the /api/v1 one.
export const API_ROOT_URL = API_BASE_URL;

export const AI_ASSISTANT_API_BASE_URL = (
  Config.AI_ASSISTANT_API_BASE_URL ?? `${API_BASE_URL}/ai-assistant`
).replace(/\/$/, '');

export const LIVEKIT_URL = Config.LIVEKIT_URL ?? 'wss://syncrys-8lcpweam.livekit.cloud';

export const GOOGLE_WEB_CLIENT_ID = (Config.GOOGLE_WEB_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID).trim();

export const STRIPE_PUBLISHABLE_KEY = Config.STRIPE_PUBLISHABLE_KEY ?? '';
