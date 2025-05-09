"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, Minimize, Maximize } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { api } from "@/lib/trpc/api";
import { clientPusher, getChatChannel, PusherEvents } from "@/lib/pusher";
import { formatDistanceToNow } from "date-fns";
import { MediaDisplay } from "../common/media-display";
import { UploadForm } from "../forms/upload-form";
import { MediaType } from "@prisma/client";

type Message = {
  id: string;
  content: string | null;
  createdAt: Date;
  senderId: string;
  receiverId: string | null;
  media: {
    id: string;
    type: MediaType;
    url: string;
    thumbnailUrl: string | null;
  }[];
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type User = {
  id: string;
  name: string | null;
  image: string | null;
  online?: boolean;
};

interface ChatWindowProps {
  chatId: string;
  otherUser: User;
  isMinimized?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function ChatWindow({
  chatId,
  otherUser,
  isMinimized = false,
  onClose,
  onMinimize,
  onMaximize,
}: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  
  // trpc query to get messages
  const { data, isLoading: messagesLoading } = api.chat.getMessages.useQuery(
    { chatId, limit: 50 },
    { enabled: !!session?.user?.id && !!chatId }
  );
  
  // trpc mutation to send a message
  const { mutate: sendMessageMutation } = api.chat.sendMessage.useMutation({
    onSuccess: (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    },
  });
  
  // trpc mutation to mark messages as read
  const { mutate: markAsRead } = api.chat.markAsRead.useMutation();

  // Update messages when data changes
  useEffect(() => {
    if (data?.messages) {
      setMessages(data.messages);
      setIsLoading(false);
      scrollToBottom();
      
      // Mark messages as read if needed
      if (data.unreadCount > 0) {
        markAsRead({ chatId });
      }
    }
  }, [data, chatId, markAsRead]);

  // Set up Pusher subscription
  useEffect(() => {
    if (!session?.user?.id || !chatId) return;

    const channel = clientPusher.subscribe(getChatChannel(chatId));
    
    channel.bind(PusherEvents.NEW_MESSAGE, (newMessage: Message) => {
      if (newMessage.senderId !== session.user.id) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
        markAsRead({ chatId });
      }
    });
    
    channel.bind(PusherEvents.TYPING, (data: { userId: string }) => {
      if (data.userId !== session.user.id) {
        setIsTyping(true);
      }
    });
    
    channel.bind(PusherEvents.STOP_TYPING, (data: { userId: string }) => {
      if (data.userId !== session.user.id) {
        setIsTyping(false);
      }
    });

    // Clean up subscription
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getChatChannel(chatId));
    };
  }, [session?.user?.id, chatId, markAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!message.trim() && !showUploadForm) return;
    
    if (session?.user?.id) {
      sendMessageMutation({
        chatId,
        content: message.trim(),
        receiverId: otherUser.id,
      });
      
      setMessage("");
      
      // Clear typing indicator
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      
      // Trigger stop typing event
      if (clientPusher.channel(getChatChannel(chatId))) {
        clientPusher.channel(getChatChannel(chatId)).trigger(PusherEvents.STOP_TYPING, {
          userId: session.user.id,
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    
    // Handle typing indicator
    if (session?.user?.id && message.trim()) {
      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Trigger typing event
      if (clientPusher.channel(getChatChannel(chatId))) {
        clientPusher.channel(getChatChannel(chatId)).trigger(PusherEvents.TYPING, {
          userId: session.user.id,
        });
      }
      
      // Set timeout to clear typing indicator after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        if (clientPusher.channel(getChatChannel(chatId))) {
          clientPusher.channel(getChatChannel(chatId)).trigger(PusherEvents.STOP_TYPING, {
            userId: session.user.id,
          });
        }
      }, 3000);
      
      setTypingTimeout(timeout);
    }
  };
  
  const handleUploadComplete = (url: string, type: MediaType, thumbnailUrl?: string) => {
    if (session?.user?.id) {
      sendMessageMutation({
        chatId,
        content: "",
        receiverId: otherUser.id,
        mediaUrl: url,
        mediaType: type,
        thumbnailUrl,
      });
      
      setShowUploadForm(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-72 bg-background border border-border rounded-t-lg shadow-lg">
        <div className="p-3 border-b border-border flex justify-between items-center cursor-pointer" onClick={onMaximize}>
          <div className="flex items-center">
            <div className="relative">
              <Image
                src={otherUser.image || "/placeholder-avatar.png"}
                alt={otherUser.name || "User"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              {otherUser.online && (
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500"></span>
              )}
            </div>
            <span className="ml-2 font-medium truncate">{otherUser.name || "User"}</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-4 w-80 h-96 bg-background border border-border rounded-t-lg shadow-lg flex flex-col z-10">
      {/* Chat header */}
      <div className="p-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center">
          <div className="relative">
            <Image
              src={otherUser.image || "/placeholder-avatar.png"}
              alt={otherUser.name || "User"}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
            {otherUser.online && (
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500"></span>
            )}
          </div>
          <span className="ml-2 font-medium truncate">{otherUser.name || "User"}</span>
        </div>
        <div className="flex items-center">
          <button
            onClick={onMinimize}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <Minimize className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading || messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.senderId === session?.user?.id;
            
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  
                  {msg.media.length > 0 && (
                    <div className="mt-2">
                      {msg.media.map((media) => (
                        <MediaDisplay
                          key={media.id}
                          url={media.url}
                          type={media.type}
                          thumbnailUrl={media.thumbnailUrl || undefined}
                          className="rounded-md overflow-hidden max-w-full"
                        />
                      ))}
                    </div>
                  )}
                  
                  <p
                    className={`text-xs mt-1 ${
                      isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"></div>
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-75"></div>
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Upload form */}
      {showUploadForm && (
        <div className="p-3 border-t border-border">
          <UploadForm
            onUploadComplete={handleUploadComplete}
            allowedTypes={["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]}
          />
          <button
            type="button"
            onClick={() => setShowUploadForm(false)}
            className="mt-2 w-full py-1 px-3 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input area */}
      {!showUploadForm && (
        <div className="p-3 border-t border-border">
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowUploadForm(true)}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-2 bg-transparent border-none focus:outline-none resize-none text-sm"
              rows={1}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!message.trim() && !showUploadForm}
              className="p-2 text-muted-foreground hover:text-primary disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}