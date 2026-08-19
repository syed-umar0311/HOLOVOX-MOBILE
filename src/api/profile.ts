import { API_ROOT_URL } from '@/config/env';

export interface RemoteUserProfile {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  subscription?: string;
  profilePicture?: string | null;
  ProfilePicture?: string | null;
  isOtpVerified?: boolean;
  verified?: boolean;
  createdAt?: string;
  hasPassword?: boolean;
}

export async function fetchUserProfile(userId: string, token: string): Promise<RemoteUserProfile | null> {
  const res = await fetch(`${API_ROOT_URL}/user/profile?userId=${userId}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = (await res.json()) as { success?: boolean; user?: RemoteUserProfile };
  return data.success && data.user ? data.user : null;
}

export async function changePassword(
  userId: string,
  token: string,
  params: { currentPassword?: string; newPassword: string },
): Promise<void> {
  const res = await fetch(`${API_ROOT_URL}/user/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId, ...params }),
  });
  const data = (await res.json()) as { success?: boolean; error?: string };
  if (!data.success) throw new Error(data.error || 'Failed to update password');
}
