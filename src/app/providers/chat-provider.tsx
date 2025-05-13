'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';
import { ChatManager } from '../components/chat/chat-manager';

// Define the type for our context
interface ChatContextType {
  startChatWithUser: (userId: string) => void;
  isInitialized: boolean;
}

// Create context with a default value
const ChatContext = createContext<ChatContextType>({
  startChatWithUser: () => {},
  isInitialized: false,
});

// Chat provider component
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { data: session } = useSession();
  const chatMutation = api.chat.createOrGetChat.useMutation();

  // Initialize the chat system
  useEffect(() => {
    if (session?.user?.id) {
      setIsInitialized(true);
    }
  }, [session?.user?.id]);

  // Function to start a chat with a user
  const startChatWithUser = (userId: string) => {
    if (session?.user?.id && userId !== session.user.id) {
      chatMutation.mutate({ userId });
    }
  };

  return (
    <ChatContext.Provider value={{ startChatWithUser, isInitialized }}>
      {children}
      {isInitialized && <ChatManager />}
    </ChatContext.Provider>
  );
}

// Hook to use chat context
export const useChat = () => useContext(ChatContext);