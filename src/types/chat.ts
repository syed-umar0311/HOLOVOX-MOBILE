export interface ChatConversation {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  time: string;
  body: string;
  fileUrl?: string;
  fileType?: string;
}
