import { AI_ASSISTANT_API_BASE_URL } from '@/config/env';

export async function sendHoloAssistMessage(userId: string, message: string): Promise<string> {
  const form = new FormData();
  form.append('userId', userId);
  form.append('message', message);

  const res = await fetch(AI_ASSISTANT_API_BASE_URL, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Server responded with ${res.status}`);
  const data = (await res.json()) as { reply?: string };
  return data.reply || 'No response.';
}
