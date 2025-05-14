"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Send, Paperclip, X, Minimize, Maximize, Phone, Video, 
  MoreVertical, Image as ImageIcon, Mic, Smile, BarChart,
  Film, Pen, MessageSquare, Users, Search
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { api } from "@/lib/trpc/api";
import { clientPusher, getChatChannel, PusherEvents } from "@/lib/pusher";
import { formatDistanceToNow } from "date-fns";
import { MediaDisplay } from "../common/media-display";
import { UploadForm } from "../forms/upload-form";
import { MediaType, MessageType, CallType } from "@prisma/client";
import { getDemoMessages, addDemoMessage } from "./demo-messages";
import { VoiceCall } from "./voice-call";
import ChatPoll from "./chat-poll";
import WatchTogether from "./watch-together";
import HandwritingMessage from "./handwriting-message";
import MessageThread from "./message-thread";
import MessageTranslation from "./message-translation";
import VoiceMessage from "./voice-message";

type Message = {
  id: string;
  content: string | null;
  createdAt: Date;
  senderId: string;
  receiverId: string | null;
  messageType: MessageType;
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
  poll?: any;
  callRecord?: any;
  voiceTranscript?: string;
  translatedText?: string;
  replyTo?: Message;
  isForwarded?: boolean;
  reactions?: any[];
  thread?: any;
  handwritingData?: any;
};

type User = {
  id: string;
  name: string | null;
  image: string | null;
  online?: boolean;
};

interface EnhancedChatWindowProps {
  chatId: string;
  otherUser: User & { isDemo?: boolean };
  isMinimized?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function EnhancedChatWindow({
  chatId,
  otherUser,
  isMinimized = false,
  onClose,
  onMinimize,
  onMaximize,
}: EnhancedChatWindowProps) {
  // Log props for debugging
  console.log('EnhancedChatWindow props:', { chatId, otherUser, isMinimized });
  
  // Check if this is a temporary chat ID
  const isTemporaryChat = chatId && chatId.startsWith('temp-');
  const isDemoChat = chatId && chatId.startsWith('demo-');
  
  // Check if this is a valid persisted chat ID (not temporary)
  const isValidChatId = chatId && 
                       chatId.length > 0 && 
                       !isTemporaryChat && 
                       !isDemoChat;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Enhanced features states
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [showWatchTogether, setShowWatchTogether] = useState(false);
  const [activeWatchSessionId, setActiveWatchSessionId] = useState<string | null>(null);
  const [showHandwriting, setShowHandwriting] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  
  // Detect if this is a demo chat
  const isDemo = otherUser.isDemo || (chatId && chatId.startsWith('clb'));
  
  // Debug log for chat ID
  console.log('EnhancedChatWindow - chatId:', chatId, 'isValidChatId:', isValidChatId, 'isDemo:', isDemo);
  
  // Default settings to use
  const defaultChatSettings = {
    enableVoiceCalls: true,
    enableVideoCalls: true,
    enableGroupCalls: true,
    enableScreenSharing: true,
    enableMessageThreads: true,
    enableReactions: true,
    enablePolls: true,
    enableWatchTogether: true,
    enableHandwriting: true,
    enableAIAssistant: true,
  };
  
  // Fetch chat settings only when we have a valid chat ID
  const { data: chatSettingsData, isLoading: settingsLoading, error: settingsError } = api.chat.getChatSettings.useQuery(
    { chatId },
    { 
      enabled: isValidChatId && !!session?.user?.id && !isDemo && chatId.length > 0,
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false, // Don't retry on error
      onError: (error) => {
        console.error('Error fetching chat settings:', error);
        // Use default settings on error
        setSettingsLoaded(true);
      },
      onSuccess: () => {
        setSettingsLoaded(true);
      }
    }
  );
  
  // Use fetched settings if available, otherwise use defaults
  const effectiveChatSettings = chatSettingsData?.settings || defaultChatSettings;
  
  // Mark settings as loaded if we're using defaults (demo, invalid, etc)
  useEffect(() => {
    if (!isValidChatId || isDemo || !chatId || chatId.length === 0) {
      setSettingsLoaded(true);
    }
  }, [isValidChatId, isDemo, chatId]);
  
  const { data, isLoading: messagesLoading } = api.chat.getMessages.useQuery(
    { chatId, limit: 50 },
    { enabled: !isDemo && !isTemporaryChat && !!session?.user?.id && !!chatId && isValidChatId }
  );
  
  const { mutate: sendMessageMutation } = api.chat.sendMessage.useMutation({
    onSuccess: (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
      setReplyToMessage(null);
    },
    onError: (error) => {
      console.error('Error sending message:', error);
    }
  });
  
  const { mutate: markAsRead } = api.chat.markAsRead.useMutation();
  const { mutate: initiateCall } = api.chat.initiateCall.useMutation({
    onSuccess: (call) => {
      setActiveCallId(call.id);
      setShowVoiceCall(true);
    },
  });
  
  const { mutate: addReaction } = api.chat.addReaction.useMutation({
    onSuccess: () => {
      setShowReactions(null);
    },
  });
  
  const { mutate: createThread } = api.chat.createThread.useMutation({
    onSuccess: (thread) => {
      setSelectedThread(thread);
      setShowThread(true);
    },
  });
  
  // Initialize messages
  useEffect(() => {
    if (isDemo || isTemporaryChat) {
      // For demo or temporary chats, show an empty chat or loading state
      setMessages([]);
      setIsLoading(false);
      scrollToBottom();
    } else if (data?.messages) {
      setMessages(data.messages);
      setIsLoading(false);
      scrollToBottom();
      
      if (data.unreadCount > 0) {
        markAsRead({ chatId });
      }
    }
  }, [data, chatId, markAsRead, isDemo, isTemporaryChat, otherUser.name, session?.user?.name]);
  
  // Set up Pusher subscriptions
  useEffect(() => {
    if (isDemo || isTemporaryChat || !session?.user?.id || !chatId) return;

    const channel = clientPusher.subscribe(getChatChannel(chatId));
    
    // Message events
    channel.bind(PusherEvents.NEW_MESSAGE, (newMessage: Message) => {
      if (newMessage.senderId !== session.user.id) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
        markAsRead({ chatId });
      }
    });
    
    // Typing events
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
    
    // Call events
    channel.bind(PusherEvents.INCOMING_CALL, (data: { callId: string, type: CallType }) => {
      setActiveCallId(data.callId);
      setCallType(data.type);
      setShowVoiceCall(true);
    });
    
    // Watch together events
    channel.bind(PusherEvents.WATCH_TOGETHER_STARTED, (data: { sessionId: string }) => {
      setActiveWatchSessionId(data.sessionId);
      setShowWatchTogether(true);
    });
    
    // Poll events
    channel.bind(PusherEvents.NEW_POLL, (data: { pollId: string, messageId: string }) => {
      // Poll will be in the new message
    });
    
    // Reaction events
    channel.bind(PusherEvents.REACTION_ADDED, (data: { messageId: string, emoji: string, userId: string }) => {
      setMessages((prev) => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            reactions: [...(msg.reactions || []), { emoji: data.emoji, userId: data.userId }]
          };
        }
        return msg;
      }));
    });

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
      const newDemoMessage = addDemoMessage(
        messages,
        message.trim(),
        true,
        otherUser.name || 'Demo User',
        session?.user?.name || 'You',
        chatId
      );
      
      setMessages(prev => [...prev, newDemoMessage]);
      setMessage("");
      scrollToBottom();
      
      // Simulate a response
      setTimeout(() => {
        const responses = [
          "That's great!",
          "I see what you mean.",
          "Interesting perspective!",
          "Thanks for sharing.",
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const demoResponse = addDemoMessage(
          [...messages, newDemoMessage],
          randomResponse,
          false,
          otherUser.name || 'Demo User',
          session?.user?.name || 'You',
          chatId
        );
        
        setMessages(prev => [...prev, demoResponse]);
        scrollToBottom();
      }, 1500);
    } else if (session?.user?.id) {
      if (isTemporaryChat) {
        // For temporary chats, show a message that we're waiting for the real chat to be created
        console.log('Cannot send message yet - temporary chat being created');
        return;
      }
      
      sendMessageMutation({
        chatId,
        content: message.trim(),
        receiverId: otherUser.id,
        replyToId: replyToMessage?.id,
      });
      
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleVoiceCall = (type: 'AUDIO' | 'VIDEO') => {
    if (isDemo) {
      alert('Voice/Video calls are not available in demo mode');
      return;
    }
    
    setCallType(type as CallType);
    initiateCall({ chatId, type: type as CallType });
  };
  
  const handleAddReaction = (messageId: string, emoji: string) => {
    if (isDemo) return;
    
    addReaction({ messageId, emoji });
  };
  
  const handleCreateThread = (messageId: string) => {
    if (isDemo) return;
    
    createThread({ chatId, parentMessageId: messageId });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-72 bg-gray-800 border border-gray-700 rounded-t-lg shadow-lg z-[9999]">
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
    <>
      {/* Main Chat Window */}
      <div className="fixed bottom-0 right-4 w-96 h-[600px] bg-gray-900 border border-gray-700 rounded-t-lg shadow-lg flex flex-col z-[9999]">
        {/* Chat header */}
        <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800">
          <div className="flex items-center flex-1">
            <div className="relative">
              <Image
                src={otherUser.image || "/placeholder-avatar.png"}
                alt={otherUser.name || "User"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              {otherUser.online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-gray-800"></span>
              )}
            </div>
            <div className="ml-3 flex-1">
              <span className="font-medium text-white">{otherUser.name || "User"}</span>
              {isTyping && (
                <p className="text-xs text-gray-400">typing...</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Voice Call */}
            <button
              onClick={() => handleVoiceCall('AUDIO')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              disabled={!effectiveChatSettings.enableVoiceCalls}
            >
              <Phone className="h-5 w-5" />
            </button>
            
            {/* Video Call */}
            <button
              onClick={() => handleVoiceCall('VIDEO')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              disabled={!effectiveChatSettings.enableVideoCalls}
            >
              <Video className="h-5 w-5" />
            </button>
            
            {/* Search */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
            
            {/* More Options */}
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {/* Minimize */}
            <button
              onClick={onMinimize}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Minimize className="h-5 w-5" />
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar (if visible) */}
        {showSearch && (
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* More Options Menu (if visible) */}
        {showMoreOptions && (
          <div className="absolute top-12 right-4 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
            <button
              onClick={() => {
                setShowWatchTogether(true);
                setShowMoreOptions(false);
              }}
              className="flex items-center w-full p-3 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Film className="h-5 w-5 mr-3" />
              Watch Together
            </button>
            <button
              onClick={() => {
                setShowHandwriting(true);
                setShowMoreOptions(false);
              }}
              className="flex items-center w-full p-3 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Pen className="h-5 w-5 mr-3" />
              Handwriting
            </button>
            <button
              onClick={() => {
                setShowPoll(true);
                setShowMoreOptions(false);
              }}
              className="flex items-center w-full p-3 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <BarChart className="h-5 w-5 mr-3" />
              Create Poll
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950">
          {isLoading || (messagesLoading && !isTemporaryChat) ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-gray-400">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              {isTemporaryChat ? 'Start a conversation...' : 'No messages yet'}
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isCurrentUser = msg.senderId === session?.user?.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-[85%] group">
                      {!isCurrentUser && (
                        <Image
                          src={msg.sender.image || "/placeholder-avatar.png"}
                          alt={msg.sender.name || "User"}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover mr-2 mt-1"
                        />
                      )}
                      
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2 shadow-sm ${
                            isCurrentUser
                              ? "bg-blue-600 text-white"
                              : "bg-gray-800 text-white"
                          }`}
                        >
                          {/* Reply To */}
                          {msg.replyTo && (
                            <div className="border-l-2 border-gray-500 pl-2 mb-2 opacity-70">
                              <p className="text-xs">{msg.replyTo.sender.name}</p>
                              <p className="text-sm">{msg.replyTo.content?.substring(0, 50)}...</p>
                            </div>
                          )}
                          
                          {/* Message Content */}
                          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                          
                          {/* Polls */}
                          {msg.messageType === 'POLL' && msg.poll && (
                            <ChatPoll
                              chatId={chatId}
                              pollId={msg.poll.id}
                              mode="view"
                              messageId={msg.id}
                            />
                          )}
                          
                          {/* Handwriting */}
                          {msg.messageType === 'HANDWRITING' && msg.handwritingData && (
                            <div className="mt-2">
                              <canvas
                                width={300}
                                height={200}
                                className="border border-gray-600 rounded"
                                // Render handwriting strokes
                              />
                            </div>
                          )}
                          
                          {/* Voice Messages */}
                          {msg.messageType === 'VOICE_MESSAGE' && (
                            <VoiceMessage
                              audioUrl={msg.media[0]?.url}
                              duration={msg.media[0]?.duration}
                              waveform={msg.waveform}
                              transcript={msg.voiceTranscript}
                            />
                          )}
                          
                          {/* Media */}
                          {msg.media.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {msg.media.map((media) => (
                                <MediaDisplay
                                  key={media.id}
                                  url={media.url}
                                  type={media.type}
                                  thumbnailUrl={media.thumbnailUrl || undefined}
                                  className="rounded-lg overflow-hidden max-w-full"
                                />
                              ))}
                            </div>
                          )}
                          
                          {/* Call Records */}
                          {msg.messageType === 'VOICE_CALL' && msg.callRecord && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>Call ended • {msg.callRecord.duration}s</span>
                            </div>
                          )}
                          
                          {/* Translation */}
                          {msg.translatedText && showTranslation[msg.id] && (
                            <MessageTranslation
                              originalText={msg.content || ''}
                              translatedText={msg.translatedText}
                              sourceLang={msg.sourceLanguage || 'auto'}
                              targetLang={msg.targetLanguage || 'en'}
                            />
                          )}
                          
                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {msg.reactions.map((reaction, idx) => (
                                <span key={idx} className="text-sm">
                                  {reaction.emoji}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            isCurrentUser ? "text-blue-100" : "text-gray-400"
                          }`}>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        
                        {/* Message Actions */}
                        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setReplyToMessage(msg)}
                            className="p-1 text-gray-500 hover:text-gray-300"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowReactions(msg.id)}
                            className="p-1 text-gray-500 hover:text-gray-300"
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowTranslation({ ...showTranslation, [msg.id]: !showTranslation[msg.id] })}
                            className="p-1 text-gray-500 hover:text-gray-300"
                          >
                            <span className="text-xs">A文</span>
                          </button>
                          <button
                            onClick={() => handleCreateThread(msg.id)}
                            className="p-1 text-gray-500 hover:text-gray-300"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Reaction Picker */}
                        {showReactions === msg.id && (
                          <div className="absolute bottom-8 bg-gray-800 rounded-lg shadow-lg p-2 flex gap-1">
                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleAddReaction(msg.id, emoji)}
                                className="p-1 hover:bg-gray-700 rounded"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-3 shadow-md">
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

        {/* Reply Preview */}
        {replyToMessage && (
          <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Replying to {replyToMessage.sender.name}</p>
              <p className="text-sm text-gray-300">{replyToMessage.content?.substring(0, 50)}...</p>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="p-1 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Upload form */}
        {showUploadForm && (
          <div className="p-3 border-t border-gray-700 bg-gray-800">
            <UploadForm
              onUploadComplete={(url, type, thumbnailUrl) => {
                if (session?.user?.id) {
                  sendMessageMutation({
                    chatId,
                    content: "",
                    receiverId: otherUser.id,
                    mediaUrl: url,
                    mediaType: type,
                    thumbnailUrl,
                  });
                }
                setShowUploadForm(false);
              }}
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

        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <div className="p-3 border-t border-gray-700 bg-gray-800">
            <VoiceMessage
              onComplete={(audioUrl, duration, waveform) => {
                if (session?.user?.id) {
                  sendMessageMutation({
                    chatId,
                    content: "",
                    receiverId: otherUser.id,
                    messageType: 'VOICE_MESSAGE',
                    mediaUrl: audioUrl,
                    mediaType: 'AUDIO',
                    voiceWaveform: waveform,
                    voiceDuration: duration,
                  });
                }
                setShowVoiceRecorder(false);
              }}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        )}

        {/* Input area */}
        {!showUploadForm && !showVoiceRecorder && (
          <div className="p-3 border-t border-gray-700 bg-gray-800">
            <div className="flex items-end gap-2">
              {/* Attachment */}
              <button
                type="button"
                onClick={() => setShowUploadForm(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              {/* Voice Message */}
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Mic className="h-5 w-5" />
              </button>
              
              {/* Message Input */}
              <textarea
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 p-2 bg-gray-700 border-none focus:outline-none resize-none text-sm rounded-lg text-white placeholder-gray-400"
                rows={1}
              />
              
              {/* Send Button */}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!message.trim() && !showUploadForm}
                className="p-2 text-gray-400 hover:text-blue-500 disabled:opacity-50 transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Windows */}
      {showVoiceCall && callType && (
        <VoiceCall
          chatId={chatId}
          callId={activeCallId}
          callType={callType}
          participants={[otherUser]}
          onClose={() => {
            setShowVoiceCall(false);
            setActiveCallId(null);
            setCallType(null);
          }}
          isIncoming={false}
          initiatedBy={session?.user}
        />
      )}
      
      {showPoll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-900 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <ChatPoll
              chatId={chatId}
              mode="create"
              onCancel={() => setShowPoll(false)}
              onComplete={() => setShowPoll(false)}
            />
          </div>
        </div>
      )}
      
      {showWatchTogether && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-900 rounded-lg p-6 w-[800px] h-[600px]">
            <WatchTogether
              chatId={chatId}
              sessionId={activeWatchSessionId}
              onClose={() => {
                setShowWatchTogether(false);
                setActiveWatchSessionId(null);
              }}
              mode={activeWatchSessionId ? 'join' : 'create'}
            />
          </div>
        </div>
      )}
      
      {showHandwriting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-900 rounded-lg p-6 w-[600px] h-[500px]">
            <HandwritingMessage
              chatId={chatId}
              receiverId={otherUser.id}
              onFinish={() => setShowHandwriting(false)}
              onCancel={() => setShowHandwriting(false)}
            />
          </div>
        </div>
      )}
      
      {showThread && selectedThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-900 rounded-lg p-6 w-[600px] h-[700px]">
            <MessageThread
              chatId={chatId}
              thread={selectedThread}
              parentMessage={selectedMessage}
              onClose={() => {
                setShowThread(false);
                setSelectedThread(null);
                setSelectedMessage(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}