// Wire-format types shared with the web app's call.$roomId.tsx / Whiteboardpanels.tsx /
// Pollpanels.tsx. Keep field names identical — RN and web users are in the same LiveKit
// room and must speak the same data-channel protocol.

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'CHAT';
}

export type WhiteboardTool = 'pen' | 'eraser';

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  authorId: string;
  authorName: string;
  color: string;
  size: number;
  tool: WhiteboardTool;
  points: WhiteboardPoint[];
}

export interface WhiteboardSession {
  active: boolean;
  presenterId: string;
  presenterName: string;
  startedAt: number;
}

export const emptyWhiteboardSession: WhiteboardSession = {
  active: false,
  presenterId: '',
  presenterName: '',
  startedAt: 0,
};

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  multiSelect: boolean;
  hostId: string;
  hostName: string;
  votes: Record<string, string[]>;
  createdAt: number;
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  sender: string;
}
