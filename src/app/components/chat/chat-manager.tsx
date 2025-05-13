"use client";

import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import { clientPusher, getUserChannel, PusherEvents } from "@/lib/pusher";
import { ChatWindow } from "./chat-window";
import { MessageSquare } from "lucide-react";

type User = {
  id: string;
  name: string | null;
  image: string | null;
  online?: boolean;
};

type Chat = {
  id: string;
  otherUser: User;
  unreadCount: number;
};

// Define context for chat functions
type ChatContextType = {
  startChat: (userId: string) => void;
  error: { message: string; userId?: string } | null;
  isLoading: boolean;
  clearError: () => void;
};

// Create the context
const ChatContext = createContext<ChatContextType | null>(null);

// Hook to use chat context
export const useChatManager = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatManager must be used within a ChatManagerProvider');
  }
  return context;
};

// ChatProvider wrapper component for global access
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [errorState, setErrorState] = useState<{ message: string; userId?: string } | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  const { mutate: createChat, isLoading, isError, error } = api.chat.createOrGetChat.useMutation({
    onError: (err) => {
      console.error("Error creating chat:", err);
      setErrorState({ message: err.message });
    }
  });

  // Reset error when session changes
  useEffect(() => {
    if (errorState) {
      setErrorState(null);
    }
  }, [sessionStatus]);

  // Function to start a chat with a user with improved error handling
  const startChat = (userId: string) => {
    if (!session?.user?.id) {
      setErrorState({ message: "შესვლა საჭიროა ჩეთის დასაწყებად", userId });
      return;
    }

    if (userId === session.user.id) {
      setErrorState({ message: "საკუთარ თავთან ჩეთის დაწყება არ შეგიძლიათ", userId });
      return;
    }

    // Clear any previous errors
    setErrorState(null);

    try {
      // Validate userId to ensure it's not undefined or null
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }

      // Create a proper input object for the mutation
      const input = { userId };
      console.log('ChatProvider: Creating chat with input:', input);
      
      createChat(
        input,
        {
          onError: (err) => {
            console.error("Failed to start chat:", err);
            setErrorState({ message: "ჩეთის დაწყება ვერ მოხერხდა, გთხოვთ სცადოთ მოგვიანებით", userId });
          }
        }
      );
    } catch (err) {
      console.error("Unexpected error creating chat:", err);
      setErrorState({ message: "დაფიქსირდა შეცდომა. გთხოვთ სცადოთ მოგვიანებით.", userId });
    }
  };

  const clearError = () => setErrorState(null);

  const contextValue = {
    startChat,
    error: errorState,
    isLoading,
    clearError
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      <ChatManager />
    </ChatContext.Provider>
  );
}

export function ChatManager() {
  // We set initialActiveChats to empty to avoid showing chat on first load
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: session, status: sessionStatus } = useSession();

  // Reset error state when session changes
  useEffect(() => {
    setErrorMessage(null);
  }, [sessionStatus]);

  // trpc query to get recent chats with proper error handling
  const { data: chatData, error: chatDataError, isError: isChatDataError, isLoading: isChatDataLoading } = api.chat.getRecentChats.useQuery(
    { limit: 5 },
    {
      enabled: !!session?.user?.id,
      retry: false,
      retryOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      onError: (error) => {
        console.error("Error fetching recent chats:", error);
      }
    }
  );

  // trpc mutation to create a new chat
  const { mutate: createChat } = api.chat.createOrGetChat.useMutation({
    onSuccess: (newChat) => {
      console.log('Chat created successfully:', newChat);

      // Check if chat already exists in activeChats
      if (!activeChats.some((chat) => chat.id === newChat.id)) {
        // Find the other user in participants
        const otherParticipant = newChat.participants.find(
          (p) => p.user.id !== session?.user?.id
        );
        
        const chatToAdd = {
          id: newChat.id,
          otherUser: otherParticipant?.user || { id: "", name: "User", image: null },
          unreadCount: 0,
        };

        console.log('Adding new chat to activeChats:', chatToAdd);
        setActiveChats((prev) => [...prev, chatToAdd]);
      }

      // Make sure the chat is not minimized
      setMinimizedChats((prev) => prev.filter((id) => id !== newChat.id));
    },
    onError: (error) => {
      console.error('Error creating chat:', error);
      
      // Log detailed error for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          cause: error.cause,
          stack: error.stack
        });
      }

      // If the error is related to a specific user, show a detailed error message
      if (error.message.includes('User not found')) {
        // This is likely due to trying to chat with a user that doesn't exist in the database
        console.error('Cannot start chat: User ID not found in database');
        setErrorMessage('მომხმარებელი ვერ მოიძებნა ბაზაში. გთხოვთ სცადოთ სხვა მომხმარებელი.');
        setTimeout(() => setErrorMessage(null), 5000);
      } else if (error.message.includes('cannot create a chat')) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        // For other errors, create a placeholder chat for testing
        // This avoids blocking the UI when backend is not working
        const testId = `test-${Date.now()}`;
        const placeholderChat = {
          id: testId,
          otherUser: {
            id: testId,
            name: "Fallback Chat",
            image: "https://ui-avatars.com/api/?name=Fallback+Chat&background=FF5722&color=fff"
          },
          unreadCount: 0,
        };

        console.log('Creating fallback chat due to API error:', placeholderChat);
        setActiveChats(prev => [...prev, placeholderChat]);
      }
    }
  });

  // Function to start a chat with a user (used locally in the manager)
  const startChat = (userId: string) => {
    console.log(`ChatManager: Starting chat with user ${userId}`);

    // Clear error message if there was one
    setErrorMessage(null);

    // Validate user ID before proceeding
    if (!userId || typeof userId !== 'string') {
      setErrorMessage('Invalid user ID provided');
      return;
    }

    // Don't allow starting chat with yourself
    if (session?.user?.id && userId === session.user.id) {
      setErrorMessage('You cannot start a chat with yourself');
      return;
    }

    // Check if we already have a chat with this user
    const existingChat = activeChats.find(chat => chat.otherUser.id === userId);
    if (existingChat) {
      // If minimized, un-minimize it
      if (minimizedChats.includes(existingChat.id)) {
        setMinimizedChats(prev => prev.filter(id => id !== existingChat.id));
      }
      return;
    }

    // If user is logged in, make the API call
    if (session?.user?.id) {
      try {
        console.log('Calling createChat API with userId:', userId);
        
        // Make sure userId is a valid string and not undefined
        if (!userId || typeof userId !== 'string') {
          throw new Error('Invalid userId provided');
        }
        
        // Pass userId as an object parameter to follow tRPC's expected format
        // Double-check that we're creating a proper object here
        const input = { userId };
        console.log('Input object for createChat:', input);
        
        createChat(input);
      } catch (err) {
        console.error('Error calling createChat:', err);
        setErrorMessage('An error occurred while creating the chat');
      }
    } else {
      console.warn('Session not available - cannot create chat');
      setErrorMessage('You must be logged in to start a chat');
    }
  };

  // Set up Pusher subscription for new messages
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = clientPusher.subscribe(getUserChannel(session.user.id as string, "chat"));

    const handleNewMessage = (data: { chatId: string, senderId: string }) => {
      // Check if the chat is already active
      const chatExists = activeChats.some((chat) => chat.id === data.chatId);

      if (!chatExists && data.senderId) {
        // Fetch the chat details and add it to active chats
        const input = { userId: data.senderId };
        console.log('Creating chat from Pusher event with input:', input);
        createChat(input);
      } else {
        // Update unread count for this chat
        setActiveChats((prev) =>
          prev.map((chat) =>
            chat.id === data.chatId
              ? { ...chat, unreadCount: chat.unreadCount + 1 }
              : chat
          )
        );
      }
    };

    const handleUserOnline = (data: { userId: string }) => {
      setOnlineUsers((prev) => ({ ...prev, [data.userId]: true }));
    };

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUsers((prev) => ({ ...prev, [data.userId]: false }));
    };

    // Subscribe to events
    channel.bind(PusherEvents.NEW_MESSAGE, handleNewMessage);
    channel.bind(PusherEvents.USER_ONLINE, handleUserOnline);
    channel.bind(PusherEvents.USER_OFFLINE, handleUserOffline);

    // Clean up subscription
    return () => {
      channel.unbind(PusherEvents.NEW_MESSAGE, handleNewMessage);
      channel.unbind(PusherEvents.USER_ONLINE, handleUserOnline);
      channel.unbind(PusherEvents.USER_OFFLINE, handleUserOffline);
      clientPusher.unsubscribe(getUserChannel(session.user.id as string, "chat"));
    };
  // Remove the activeChats dependency to avoid re-subscribing when chats change
  }, [session?.user?.id, createChat]);

  // Functions for closing, minimizing, and maximizing chats
  const closeChat = (chatId: string) => {
    setActiveChats((prev) => prev.filter((chat) => chat.id !== chatId));
    setMinimizedChats((prev) => prev.filter((id) => id !== chatId));
  };

  const minimizeChat = (chatId: string) => {
    if (!minimizedChats.includes(chatId)) {
      setMinimizedChats((prev) => [...prev, chatId]);
    }
  };

  const maximizeChat = (chatId: string) => {
    setMinimizedChats((prev) => prev.filter((id) => id !== chatId));
  };

  // Calculate visible chats (not more than 3)
  const visibleChats = activeChats.filter((chat) => !minimizedChats.includes(chat.id)).slice(0, 3);
  
  // Position the chat windows with spacing
  const getChatPosition = (index: number) => {
    const baseRight = 4; // rem
    const width = 20; // rem (width of chat window)
    const spacing = 1; // rem
    
    return (width + spacing) * index + baseRight;
  };

  // Use useMemo to prevent unnecessary re-renders
  const chatContextValue = React.useMemo(() => ({
    startChat,
  }), [startChat]);

  return (
    <ChatContext.Provider value={chatContextValue}>
      {/* Active chat windows */}
      <div className="fixed bottom-0 right-0 z-[9999]">
        {visibleChats.map((chat, index) => (
          <div
            key={chat.id}
            style={{ right: `${getChatPosition(index)}rem` }}
            className="fixed bottom-0"
          >
            <ChatWindow
              chatId={chat.id}
              otherUser={{
                ...chat.otherUser,
                online: onlineUsers[chat.otherUser.id] || false,
              }}
              onClose={() => closeChat(chat.id)}
              onMinimize={() => minimizeChat(chat.id)}
              onMaximize={() => {}}
            />
          </div>
        ))}

        {/* Minimized chat windows */}
        {minimizedChats.map((chatId, index) => {
          const chat = activeChats.find((c) => c.id === chatId);
          if (!chat) return null;
          
          return (
            <div
              key={chatId}
              style={{ right: `${getChatPosition(visibleChats.length + index)}rem` }}
              className="fixed bottom-0"
            >
              <ChatWindow
                chatId={chatId}
                otherUser={{
                  ...chat.otherUser,
                  online: onlineUsers[chat.otherUser.id] || false,
                }}
                isMinimized
                onClose={() => closeChat(chatId)}
                onMinimize={() => {}}
                onMaximize={() => maximizeChat(chatId)}
              />
            </div>
          );
        })}
      </div>

      {/* Chat button */}
      <div className="fixed bottom-4 right-4 z-10">
        <button
          className="bg-accent-blue text-text-primary p-3 rounded-full shadow-lg hover:bg-accent-blue-hover"
          onClick={() => {
            // Create a test chat with random ID when clicked
            const testId = `test-${Date.now()}`;
            const chat = {
              id: testId,
              otherUser: {
                id: testId,
                name: "Test User",
                image: "https://ui-avatars.com/api/?name=Test+User&background=FF5722&color=fff"
              },
              unreadCount: 0,
            };
            setActiveChats(prev => [...prev, chat]);
          }}
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      </div>
    </ChatContext.Provider>
  );
}