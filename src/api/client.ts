import type { ApiRecord } from '@/types/auth';
import { getAuthToken } from '@/lib/session';

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
  if (typeof nestedData === 'string') return nestedData;
  if (typeof nestedData === 'object' && nestedData !== null) {
    const nestedRecord = nestedData as ApiRecord;
    if (typeof nestedRecord.message === 'string') return nestedRecord.message;
    if (typeof nestedRecord.error === 'string') return nestedRecord.error;
  }
  return undefined;
}

export async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  const data = parseJson(text);
  if (!response.ok) {
    throw new Error(readMessage(data) ?? `Request failed with status ${response.status}`);
  }
  return data;
}

export async function postJson(url: string, payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

/** Fetch wrapper that injects the stored bearer token — the RN equivalent of every
 * `fetch(..., { headers: { Authorization: ... } })` call scattered across the web app. */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getAuthToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, { ...init, headers });
  return parseResponse(response);
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
