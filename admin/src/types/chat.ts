// Response types for /api/chat (docs/api/operations.md §3).

export interface LastMessage {
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ChannelItem {
  id: number;
  conversationId: string;
  name: string;
  description: string | null;
  icon: string;
  unread: number;
  lastMessageAt: string | null;
  lastMessage: LastMessage | null;
}

export interface DirectMessageItem {
  userId: number;
  displayName: string;
  username: string;
  role: string;
  title: string | null;
  conversationId: string;
  unread: number;
  lastMessageAt: string | null;
  lastMessage: LastMessage | null;
}

export interface ChatState {
  currentUserId: number;
  channels: ChannelItem[];
  directMessages: DirectMessageItem[];
  totalUnread: number;
}

export interface ChatMessageItem {
  id: number;
  conversationId: string;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
}
