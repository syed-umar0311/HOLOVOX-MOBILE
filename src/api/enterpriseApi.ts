import { V1_BASE_URL } from '@/config/env';
import type {
  EnterpriseFlagRecord,
  EnterpriseFlagWord,
  EnterpriseKnockTarget,
  EnterpriseOrgTreeData,
  EnterpriseOverviewData,
} from '@/types/enterprise';

// Ported from src/Pages/enterprise/api/enterpriseApi.ts — a practical subset (brain
// file upload/suggestion review and meeting-detail drill-down are left for a later
// pass; everything else backing the six enterprise views + org tree + knock is here).

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string; message?: string };

const parseResponse = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as ApiEnvelope<T>) : {};
  if (!response.ok) throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  return data;
};

const authHeaders = (token?: string): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});

const withEnterpriseFallback = (path: string, enterpriseId?: string) => {
  if (!enterpriseId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}enterpriseId=${encodeURIComponent(enterpriseId)}`;
};

export const enterpriseApi = {
  async getOverview(token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback('/enterprise/overview', enterpriseId)}`, {
      headers: authHeaders(token),
    });
    return (await parseResponse<EnterpriseOverviewData>(response)).data;
  },

  async getOrgTree(token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback('/enterprise/org-tree', enterpriseId)}`, {
      headers: authHeaders(token),
    });
    return (await parseResponse<EnterpriseOrgTreeData>(response)).data;
  },

  async getKnockTargets(token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback('/enterprise/knock-targets', enterpriseId)}`, {
      headers: authHeaders(token),
    });
    return (await parseResponse<EnterpriseKnockTarget[]>(response)).data || [];
  },

  async reparentUser(userId: string, managerId: string | null, token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}/enterprise/users/${encodeURIComponent(userId)}/manager`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ managerId, enterpriseId }),
    });
    return (await parseResponse(response)).data;
  },

  async deleteUser(userId: string, token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback(`/enterprise/users/${encodeURIComponent(userId)}`, enterpriseId)}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return (await parseResponse<{ id: string }>(response)).data;
  },

  async knockUser(
    userId: string,
    message: string,
    token?: string,
    enterpriseId?: string,
    meeting?: { roomId: string; meetingTitle?: string },
  ) {
    const response = await fetch(`${V1_BASE_URL}/enterprise/users/${encodeURIComponent(userId)}/knock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ message, enterpriseId, meeting }),
    });
    return (await parseResponse<{ id: string }>(response)).data;
  },

  async createInstantMeeting(payload: { hostId: string; name: string; email: string; meetingId: string; meetingTitle: string }) {
    const response = await fetch(`${V1_BASE_URL}/createmeeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        upcoming: false,
      }),
    });
    return parseResponse<{ meetingId?: string }>(response);
  },

  async getConstructSessions(token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback('/enterprise/construct/sessions', enterpriseId)}`, {
      headers: authHeaders(token),
    });
    return (await parseResponse<{ rounds: number }>(response)).data?.rounds ?? 0;
  },

  async launchConstructSession(token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback('/enterprise/construct/sessions', enterpriseId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ enterpriseId }),
    });
    return (await parseResponse<{ rounds: number }>(response)).data?.rounds ?? 0;
  },

  async getFlags(token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback('/enterprise/flags', enterpriseId)}`, {
      headers: authHeaders(token),
    });
    return (await parseResponse<EnterpriseFlagRecord[]>(response)).data || [];
  },

  async updateFlagStatus(id: string, status: EnterpriseFlagRecord['status'], token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback(`/enterprise/flags/${encodeURIComponent(id)}`, enterpriseId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ status, enterpriseId }),
    });
    return (await parseResponse<EnterpriseFlagRecord>(response)).data;
  },

  async getFlagWords(token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback('/enterprise/flag-words', enterpriseId)}`, {
      headers: authHeaders(token),
    });
    return (await parseResponse<EnterpriseFlagWord[]>(response)).data || [];
  },

  async createFlagWord(
    input: { word: string; type?: 'flag' | 'permitted'; severity?: 'low' | 'medium' | 'high'; category?: string },
    token?: string,
    enterpriseId?: string,
  ) {
    const response = await fetch(`${V1_BASE_URL}/enterprise/flag-words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ ...input, enterpriseId }),
    });
    return (await parseResponse<EnterpriseFlagWord>(response)).data;
  },

  async deleteFlagWord(id: string, token?: string, enterpriseId?: string) {
    const response = await fetch(`${V1_BASE_URL}${withEnterpriseFallback(`/enterprise/flag-words/${encodeURIComponent(id)}`, enterpriseId)}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return (await parseResponse<{ id: string }>(response)).data;
  },
};
