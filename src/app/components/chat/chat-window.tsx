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
import { getDemoMessages, addDemoMessage } from "./demo-messages";

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
  otherUser: User & { isDemo?: boolean }; // Added isDemo flag
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
  
  // Detect if this is a demo chat by checking the otherUser properties or ID format
  const isDemo = otherUser.isDemo || (chatId && chatId.startsWith('clb'));
  
  // trpc query to get messages - only for non-demo chats
  const { data, isLoading: messagesLoading } = api.chat.getMessages.useQuery(
    { chatId, limit: 50 },
    { enabled: !isDemo && !!session?.user?.id && !!chatId }
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
  
  // Initialize with demo messages or update with real messages
  useEffect(() => {
    if (isDemo) {
      // For demo chats, use the demo message generator
      setMessages(getDemoMessages(otherUser.name || 'Demo User', session?.user?.name || 'You'));
      setIsLoading(false);
      scrollToBottom();
    } else if (data?.messages) {
      // For real chats, use the API data
      setMessages(data.messages);
      setIsLoading(false);
      scrollToBottom();
      
      // Mark messages as read if needed
      if (data.unreadCount > 0) {
        markAsRead({ chatId });
      }
    }
  }, [data, chatId, markAsRead, isDemo, otherUser.name, session?.user?.name]);

  // Set up Pusher subscription - only for non-demo chats
  useEffect(() => {
    if (isDemo || !session?.user?.id || !chatId) return;

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
    
    if (isDemo) {
      // For demo chats, handle locally
      const newDemoMessage = addDemoMessage(
        messages,
        message.trim(),
        true, // is current user
        otherUser.name || 'Demo User',
        session?.user?.name || 'You'
      );
      
      setMessages(prev => [...prev, newDemoMessage]);
      setMessage("");
      scrollToBottom();
      
      // Simulate a response after a delay
      setTimeout(() => {
        const responses = [
          "That's interesting!",
          "I see what you mean.",
          "Thanks for sharing that.",
          "I agree with you.",
          "Let me think about that.",
          "Great point!",
          "I hadn't thought of it that way before.",
          "You make a good argument.",
          "That's really helpful, thank you.",
          "I appreciate your perspective."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const demoResponse = addDemoMessage(
          [...messages, newDemoMessage],
          randomResponse,
          false, // not current user
          otherUser.name || 'Demo User',
          session?.user?.name || 'You'
        );
        
        setMessages(prev => [...prev, demoResponse]);
        scrollToBottom();
      }, 1500);
    } else if (session?.user?.id) {
      // For real chats, use the API
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
    
    if (isDemo) {
      // For demo chats, simulate typing indicator behavior locally
      if (message.trim()) {
        // No need to actually trigger any events, just update local state
        if (Math.random() > 0.7) { // Random chance to show typing
          setIsTyping(true);
          
          // Clear after 2-3 seconds
          setTimeout(() => {
            setIsTyping(false);
          }, 2000 + Math.random() * 1000);
        }
      }
    } 
    // Handle typing indicator for real chats
    else if (session?.user?.id && message.trim()) {
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
    if (isDemo) {
      // For demo chats, create a local media message
      const mediaMessage = {
        id: `demo-media-${Date.now()}`,
        content: "Media message",
        createdAt: new Date(),
        senderId: 'current-user',
        receiverId: 'demo-contact',
        media: [{
          id: `demo-media-${Date.now()}`,
          type: type,
          url: url,
          thumbnailUrl: thumbnailUrl || null
        }],
        sender: {
          id: 'current-user',
          name: session?.user?.name || 'You',
          image: null
        }
      };
      
      setMessages(prev => [...prev, mediaMessage]);
      setShowUploadForm(false);
      scrollToBottom();
      
      // Simulate a response
      setTimeout(() => {
        const demoResponse = addDemoMessage(
          [...messages, mediaMessage],
          "Thanks for sharing!",
          false,
          otherUser.name || 'Demo User',
          session?.user?.name || 'You'
        );
        
        setMessages(prev => [...prev, demoResponse]);
        scrollToBottom();
      }, 1500);
    } else if (session?.user?.id) {
      // For real chats, use the API
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
      <div className="fixed bottom-0 right-4 w-72 bg-gray-800 border border-gray-700 rounded-t-lg shadow-lg z-[9999]" style={{ zIndex: 9999 }}>
        <div className="p-3 border-b border-gray-700 flex justify-between items-center cursor-pointer bg-gray-800" onClick={onMaximize}>
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
            <span className="ml-2 font-medium truncate text-white">{otherUser.name || "User"}</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
              className="p-1 text-gray-400 hover:text-white"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-4 w-80 h-96 bg-gray-900 border border-gray-700 rounded-t-lg shadow-lg flex flex-col z-[9999]" style={{ zIndex: 9999 }}>
      {/* Chat header */}
      <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800">
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
          <span className="ml-2 font-medium truncate text-white">{otherUser.name || "User"}</span>
        </div>
        <div className="flex items-center">
          <button
            onClick={onMinimize}
            className="p-1 text-gray-400 hover:text-white"
          >
            <Minimize className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-gray-950">
        {isLoading || messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
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
                  className={`max-w-[80%] rounded-lg p-3 shadow-md ${
                    isCurrentUser
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-white"
                  }`}
                  style={{ backdropFilter: "none" }}
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
                      isCurrentUser ? "text-white/70" : "text-gray-400"
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
            <div className="bg-gray-800 rounded-lg p-3 shadow-md" style={{ backdropFilter: "none" }}>
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce delay-75"></div>
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Upload form */}
      {showUploadForm && (
        <div className="p-3 border-t border-gray-700 bg-gray-800">
          <UploadForm
            onUploadComplete={handleUploadComplete}
            allowedTypes={["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]}
          />
          <button
            type="button"
            onClick={() => setShowUploadForm(false)}
            className="mt-2 w-full py-1 px-3 bg-gray-700 text-gray-400 rounded-md hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input area */}
      {!showUploadForm && (
        <div className="p-3 border-t border-gray-700 bg-gray-800">
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowUploadForm(true)}
              className="p-2 text-gray-400 hover:text-white"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-2 bg-gray-700 border-none focus:outline-none resize-none text-sm rounded-md text-white"
              rows={1}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!message.trim() && !showUploadForm}
              className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}