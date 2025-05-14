"use client";

import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import { clientPusher, getUserChannel, PusherEvents } from "@/lib/pusher";
import { EnhancedChatWindow } from "./enhanced-chat-window";
import { MessageSquare } from "lucide-react";
import { chatEventBus, CHAT_EVENTS } from "@/lib/chat-events";

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
  startChat: (userId: string, onSuccess?: (chatId: string, user: User) => void) => void;
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

// Reference to the ChatManager instance
let chatManagerRef: any = null;

// ChatProvider wrapper component for global access
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [errorState, setErrorState] = useState<{ message: string; userId?: string } | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  
  // Make mutation result available through callback pattern
  const { mutate: createChat, isLoading } = api.chat.createOrGetChat.useMutation();

  // Reset error when session changes
  useEffect(() => {
    if (sessionStatus === 'authenticated' || sessionStatus === 'unauthenticated') {
      if (errorState) {
        setErrorState(null);
      }
    }
  }, [sessionStatus]); // Don't include errorState in dependencies

  // Function to start a chat with a user with improved error handling
  const startChat = (userId: string, onSuccess?: (chatId: string, user: User) => void) => {
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
      
      createChat(input, {
        onSuccess: (newChat) => {
          // Find the other user in participants
          const otherParticipant = newChat.participants.find(
            (p) => p.user.id !== session?.user?.id
          );
          
          if (otherParticipant && onSuccess) {
            onSuccess(newChat.id, otherParticipant.user);
          }
        },
        onError: (err) => {
          console.error("Failed to start chat:", err);
          setErrorState({ message: "ჩეთის დაწყება ვერ მოხერხდა, გთხოვთ სცადოთ მოგვიანებით", userId });
        }
      });
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
    </ChatContext.Provider>
  );
}

export function ChatManager() {
  // We set initialActiveChats to empty to avoid showing chat on first load
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localPendingChats, setLocalPendingChats] = useState<Map<string, User>>(new Map());
  const { data: session, status: sessionStatus } = useSession();
  const { startChat: globalStartChat } = useChatManager();
  
  console.log('ChatManager: activeChats:', activeChats);

  // Function to start a chat locally (wrapper around globalStartChat)
  const startChat = (userId: string) => {
    // Check if we already have an active chat with this user
    const existingChat = activeChats.find(chat => chat.otherUser.id === userId);
    if (existingChat) {
      console.log('Chat already exists with user:', userId);
      return;
    }

    // Create temporary chat with local user data
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}-${userId}`;
    const tempUser: User = {
      id: userId,
      name: 'Loading...',
      image: `https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff`
    };
    
    // Add to local pending chats
    setLocalPendingChats(prev => new Map(prev).set(tempId, tempUser));
    
    // Add temporary chat immediately
    const tempChat = {
      id: tempId,
      otherUser: tempUser,
      unreadCount: 0,
    };
    
    console.log('Adding temporary chat locally:', tempChat);
    setActiveChats((prev) => [...prev, tempChat]);
    
    // Call global startChat with callback to handle success
    globalStartChat(userId, (chatId, realUser) => {
      console.log('Chat created successfully:', { chatId, realUser });
      
      // Replace temp chat with real chat
      setActiveChats((prev) => {
        return prev.map(chat => {
          if (chat.id === tempId) {
            console.log('Replacing temp chat with real chat:', chatId);
            return {
              id: chatId,
              otherUser: realUser,
              unreadCount: 0,
            };
          }
          return chat;
        });
      });
      
      // Remove from pending chats
      setLocalPendingChats(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      
      // Make sure the chat is not minimized
      setMinimizedChats((prev) => prev.filter((id) => id !== chatId));
    });
  };

  // Reset error state when session changes
  useEffect(() => {
    setErrorMessage(null);
  }, [sessionStatus]);
  
  // Listen for chat events from other components
  useEffect(() => {
    const unsubscribe = chatEventBus.on(CHAT_EVENTS.START_CHAT, ({ userId }) => {
      console.log('ChatManager: Received START_CHAT event for user:', userId);
      startChat(userId);
    });
    
    return unsubscribe;
  }, [startChat]);

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

  // trpc mutation to create a new chat - REMOVED: now using context's mutation
  // Function to start a chat - REMOVED: now using context's startChat

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
        // Use context's startChat instead
        if (data.senderId && data.senderId !== session.user.id) {
          startChat(data.senderId);
        }
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
  }, [session?.user?.id, startChat]);

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

  return (
    <>
      {/* Error message display */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-[10000]">
          {errorMessage}
        </div>
      )}
      
      {/* Active chat windows */}
      <div className="fixed bottom-0 right-0 z-[9999]">
        {visibleChats.map((chat, index) => (
          <div
            key={chat.id}
            style={{ right: `${getChatPosition(index)}rem` }}
            className="fixed bottom-0"
          >
            <EnhancedChatWindow
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
              <EnhancedChatWindow
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

    </>
  );
}