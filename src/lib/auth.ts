/**
 * Auth API + session helpers, ported from the web app's src/Pages/Auth.tsx
 * so mobile identifies the same subscription/plan shape after login/signup.
 */

export const API_BASE_URL = 'https://holovoxserver-production-eb5d.up.railway.app/api/auth';

export type AuthRole = 'user' | 'doctor' | 'lawyer' | 'expert' | 'guest';

export interface PendingSignup {
  fullName: string;
  email: string;
  password: string;
}

export interface Session {
  id?: string;
  email: string;
  name: string;
  role: AuthRole;
  token: string;
  subscription: string;
  subscriptionStatus: string;
}

type ApiRecord = Record<string, unknown>;

function parseJson(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function readMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as ApiRecord;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  const nestedData = record.data;
  if (typeof nestedData === 'object' && nestedData !== null) {
    const nestedRecord = nestedData as ApiRecord;
    if (typeof nestedRecord.message === 'string') return nestedRecord.message;
    if (typeof nestedRecord.error === 'string') return nestedRecord.error;
  }
  return undefined;
}

export async function postAuthRequest(
  endpoint: '/login' | '/signUp' | '/sendOtp' | '/verifyOtp',
  payload: Record<string, unknown>,
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = parseJson(text);
  if (!response.ok) {
    throw new Error(readMessage(data) ?? `Request failed with status ${response.status}`);
  }
  return data;
}

export function getTokenFromResponse(responseData: unknown): string {
  if (typeof responseData !== 'object' || responseData === null) return '';
  const record = responseData as ApiRecord;
  const data = record.data;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null) {
    const nested = data as ApiRecord;
    if (typeof nested.token === 'string') return nested.token;
  }
  if (typeof record.token === 'string') return record.token;
  return '';
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// RN's JS engine (Hermes) has no built-in atob; decode base64 to raw bytes
// by hand so we don't need an extra dependency just to read a JWT payload.
function base64DecodeBytes(input: string): number[] {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

function utf8BytesToString(bytes: number[]): string {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const byte1 = bytes[i++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 >= 0xc0 && byte1 < 0xe0 && i < bytes.length) {
      const byte2 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 >= 0xe0 && i + 1 < bytes.length) {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
    } else {
      result += String.fromCharCode(byte1);
    }
  }
  return result;
}

export function decodeJwtPayload(token: string): unknown {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = utf8BytesToString(base64DecodeBytes(normalized));
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

// Backend returns subscription/status casing inconsistently ("Enterprise
// User", "spark_trial"); canonicalize once, same as the web dashboard.
export function normalizePlanValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s_]+/g, '-') : '';
}

function readSubscriptionClaim(record: ApiRecord): string | undefined {
  const direct = record.subscription;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const legacy = record.Subscription;
  if (typeof legacy === 'string' && legacy.trim()) return legacy;
  return undefined;
}

export function buildSessionFromToken(token: string, fallback?: Partial<Session>): Session | null {
  const payload = decodeJwtPayload(token);
  const record = typeof payload === 'object' && payload !== null ? (payload as ApiRecord) : {};

  const email = typeof record.email === 'string' ? record.email : fallback?.email;
  const name =
    typeof record.name === 'string' ? record.name : fallback?.name ?? (email ? email.split('@')[0] : undefined);
  const role = typeof record.role === 'string' ? (record.role as AuthRole) : fallback?.role ?? 'user';

  if (!email) return null;

  const subscription = normalizePlanValue(readSubscriptionClaim(record) ?? fallback?.subscription) || 'free';
  const enterpriseDetails =
    typeof record.enterpriseDetails === 'object' && record.enterpriseDetails !== null
      ? (record.enterpriseDetails as ApiRecord)
      : undefined;
  const subscriptionStatus =
    normalizePlanValue(enterpriseDetails?.subscriptionStatus ?? record.subscriptionStatus ?? fallback?.subscriptionStatus) ||
    'active';

  const id = typeof record.id === 'string' ? record.id : typeof record._id === 'string' ? record._id : undefined;

  return { id, email, name: name ?? email, role, token, subscription, subscriptionStatus };
}
