/**
 * Type definitions for tRPC API responses
 */

// Chat types
export interface ChatUser {
  id: string;
  name: string | null;
  image: string | null;
  username?: string | null;
}

export interface ChatParticipant {
  id: string;
  role: string;
  userId: string;
  chatId: string;
  lastReadMessageId?: string | null;
  user: ChatUser;
}

export interface ChatWithParticipants {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
  participants: ChatParticipant[];
  unreadCount: number;
}

// Messages types
export interface MessageMedia {
  id: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface Message {
  id: string;
  content: string | null;
  createdAt: Date;
  senderId: string;
  receiverId: string | null;
  sender: ChatUser;
  media: MessageMedia[];
}

// Post types
export interface PostMedia {
  id: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface Post {
  id: string;
  content: string;
  published: boolean;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: ChatUser;
  media: PostMedia[];
  reactions: Array<{
    id: string;
    type: string;
    userId: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    userId: string;
    createdAt: Date;
  }>;
  _count: {
    reactions: number;
    comments: number;
    savedBy?: number;
  };
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
  recipientId: string;
  senderId: string | null;
  sender: ChatUser | null;
  url: string | null;
  postId?: string | null;
  commentId?: string | null;
  messageId?: string | null;
}