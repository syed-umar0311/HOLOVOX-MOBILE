import { V1_BASE_URL } from '@/config/env';

export interface Conversation {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  author: 'You' | string;
  time: string;
  body: string;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const res = await fetch(`${V1_BASE_URL}/unique-participants/${encodeURIComponent(userId)}`);
  const json = (await res.json()) as { participants?: Array<{ userId: string; name?: string; email?: string }> };
  const participants = Array.isArray(json.participants) ? json.participants : [];
  return participants.map((p) => ({ id: String(p.userId), name: p.name || p.email || String(p.userId) }));
}

export async function fetchMessages(senderId: string, receiverId: string, opponentName: string): Promise<ChatMessage[]> {
  const url = new URL(`${V1_BASE_URL}/message`);
  url.searchParams.set('senderId', senderId);
  url.searchParams.set('receiverId', receiverId);
  const res = await fetch(url.toString());
  const json = (await res.json()) as { data?: Array<{ _id?: string; id?: string; sender?: string; createdAt?: string; text?: string }> };
  const data = Array.isArray(json.data) ? json.data : [];
  return data.map((m) => ({
    id: m._id || m.id || String(Math.random()),
    author: m.sender === senderId ? 'You' : opponentName,
    time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    body: m.text || '',
  }));
}

export async function sendMessage(senderId: string, receiverId: string, text: string): Promise<ChatMessage> {
  const res = await fetch(`${V1_BASE_URL}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, receiverId, text }),
  });
  const json = (await res.json()) as { data?: { _id?: string; id?: string; createdAt?: string } };
  const msg = json.data ?? {};
  return {
    id: msg._id || msg.id || String(Math.random()),
    author: 'You',
    time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString(),
    body: text,
  };
}
