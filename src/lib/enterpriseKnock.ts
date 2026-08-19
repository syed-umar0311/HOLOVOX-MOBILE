import AsyncStorage from '@react-native-async-storage/async-storage';
import { enterpriseApi } from '@/api/enterpriseApi';

export interface KnockSender {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'manager' | 'rep';
}

export interface KnockTarget {
  id: string;
  name: string;
}

/** Ported from src/lib/enterpriseKnock.ts — single entry point for "knock the door":
 * creates + joins an instant meeting, then notifies the target. Same room-id format and
 * request sequence as web so a knock sent from either platform lands the same way. */
export async function sendEnterpriseKnock({
  sender,
  target,
  token,
  enterpriseId,
}: {
  sender: KnockSender;
  target: KnockTarget;
  token?: string;
  enterpriseId?: string;
}): Promise<{ roomId: string; meetingTitle: string }> {
  const roomId = `xyz${Math.floor(Math.random() * 9000 + 1000)}`;
  const meetingTitle = `Instant Meeting with ${target.name}`;

  const result = await enterpriseApi.createInstantMeeting({
    hostId: sender.id,
    name: sender.name,
    email: sender.email || 'host@example.com',
    meetingId: roomId,
    meetingTitle,
  });
  if (!result.success) {
    throw new Error(result.error || result.message || 'Failed to create instant meeting');
  }
  await AsyncStorage.setItem(`HOLOVOX_host_${roomId}`, 'true');

  const message = `${sender.name} started an instant meeting with you`;
  const meeting = { roomId, meetingTitle };

  await enterpriseApi.knockUser(target.id, message, token, enterpriseId, meeting);

  return meeting;
}
