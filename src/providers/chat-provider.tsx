"use client";

import { ReactNode, createContext, useContext, useState } from 'react';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';
import { ChatManager } from '@/app/components/chat/chat-manager';

// Define the context type
type ChatContextType = {
  startChat: (userId: string) => void;
};

// Create context
const ChatContext = createContext<ChatContextType | null>(null);

// Chat context provider
export function ChatProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const createChatMutation = api.chat.createOrGetChat.useMutation();
  
  // Function to start a chat with a user
  const startChat = (userId: string) => {
    if (session?.user?.id && userId !== session.user.id) {
      createChatMutation.mutate({ userId });
    }
  };
  
  return (
    <ChatContext.Provider value={{ startChat }}>
      {children}
      <ChatManager />
    </ChatContext.Provider>
  );
}

// Hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};