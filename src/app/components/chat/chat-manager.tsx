"use client";

import { useState, useEffect } from "react";
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

export function ChatManager() {
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const { data: session } = useSession();
  
  // trpc query to get recent chats
  const { data: chatData } = api.chat.getRecentChats.useQuery(
    { limit: 5 },
    { enabled: !!session?.user?.id }
  );
  
  // trpc mutation to create a new chat
  const { mutate: createChat } = api.chat.createOrGetChat.useMutation({
    onSuccess: (newChat) => {
      // Check if chat already exists in activeChats
      if (!activeChats.some((chat) => chat.id === newChat.id)) {
        setActiveChats((prev) => [...prev, {
          id: newChat.id,
          otherUser: newChat.participants.find(
            (p) => p.userId !== session?.user?.id
          )?.user || { id: "", name: "User", image: null },
          unreadCount: 0,
        }]);
      }
      
      // Make sure the chat is not minimized
      setMinimizedChats((prev) => prev.filter((id) => id !== newChat.id));
    },
  });

  // Set up Pusher subscription for new messages
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = clientPusher.subscribe(getUserChannel(session.user.id as string, "chat"));
    
    channel.bind(PusherEvents.NEW_MESSAGE, (data: { chatId: string, senderId: string }) => {
      // Check if the chat is already active
      const chatExists = activeChats.some((chat) => chat.id === data.chatId);

      if (!chatExists && data.senderId) {
        // Fetch the chat details and add it to active chats
        createChat({ userId: data.senderId });
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
    });
    
    // Subscribe to user online/offline events
    channel.bind(PusherEvents.USER_ONLINE, (data: { userId: string }) => {
      setOnlineUsers((prev) => ({ ...prev, [data.userId]: true }));
    });
    
    channel.bind(PusherEvents.USER_OFFLINE, (data: { userId: string }) => {
      setOnlineUsers((prev) => ({ ...prev, [data.userId]: false }));
    });

    // Clean up subscription
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getUserChannel(session.user.id as string, "chat"));
    };
  }, [session?.user?.id, activeChats, createChat]);

  // Update active chats when chat data changes
  useEffect(() => {
    if (chatData?.chats) {
      // Convert chatData to the format we need
      const chats = chatData.chats.map((chat) => ({
        id: chat.id,
        otherUser: chat.participants.find(
          (p: { userId: string }) => p.userId !== session?.user?.id
        )?.user || { id: "", name: "User", image: null },
        unreadCount: chat.unreadCount,
      }));

      // Only update if there are actually changes
      if (JSON.stringify(chats) !== JSON.stringify(activeChats)) {
        setActiveChats(chats);
      }
    }
  }, [chatData, session?.user?.id, activeChats]);

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
      {/* Active chat windows */}
      {visibleChats.map((chat, index) => (
        <div
          key={chat.id}
          style={{ right: `${getChatPosition(index)}rem` }}
          className="absolute bottom-0"
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
            className="absolute bottom-0"
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

      {/* Chat button */}
      <div className="fixed bottom-4 right-4 z-10">
        <button
          className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90"
          onClick={() => {
            // This would typically open a contacts list to choose who to chat with
            // For now, we'll just show a placeholder message
            alert("Chat functionality is here, but user selection isn't implemented in this demo.");
          }}
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}