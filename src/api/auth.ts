import { AUTH_BASE_URL } from '@/config/env';
import { postJson, getTokenFromResponse, parseResponse } from './client';
import type { ApiRecord } from '@/types/auth';

export { getTokenFromResponse };

type AuthEndpoint = '/login' | '/signUp' | '/sendOtp' | '/verifyOtp' | '/forgotPassword' | '/resetPassword' | '/googleLogin';

export function postAuthRequest(endpoint: AuthEndpoint, payload: Record<string, unknown>): Promise<unknown> {
  return postJson(`${AUTH_BASE_URL}${endpoint}`, payload);
}

export function login(email: string, password: string) {
  return postAuthRequest('/login', { email, password });
}

export function sendOtp(email: string) {
  return postAuthRequest('/sendOtp', { email });
}

export function verifyOtp(email: string, otp: string) {
  return postAuthRequest('/verifyOtp', { email, otp });
}

export function signUp(fullName: string, email: string, password: string) {
  return postAuthRequest('/signUp', { fullName, email, password, role: 'user' });
}

export function forgotPassword(email: string) {
  return postAuthRequest('/forgotPassword', { email });
}

export function resetPassword(email: string, otp: string, newPassword: string, confirmPassword: string) {
  return postAuthRequest('/resetPassword', { email, otp, newPassword, confirmPassword });
}

/** Exchanges a Google access token + profile for a HOLOVOX JWT via the same
 * `/auth/googleLogin` endpoint the web app posts to after `useGoogleLogin` succeeds. */
export async function googleLogin(params: { email: string; name: string; picture?: string; googleAccessToken: string }) {
  const response = await fetch(`${AUTH_BASE_URL}/googleLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await parseResponse(response)) as ApiRecord;
  return data;
}
