'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { X, Send, MessageSquare, Hash, Plus, PenSquare, Paperclip } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/trpc/api';
import { clientPusher, getChatChannel, PusherEvents } from '@/lib/pusher';
import { MediaDisplay } from '@/app/components/common/media-display';
import MessageTranslation from './message-translation';
import VoiceMessage from './voice-message';
import { MediaType, MessageType } from '@prisma/client';

type User = {
  id: string;
  name: string | null;
  image: string | null;
};

type Message = {
  id: string;
  content: string | null;
  translatedText: string | null;
  sourceLanguage: string | null;
  targetLanguage: string | null;
  messageType: MessageType;
  createdAt: Date;
  senderId: string;
  receiverId: string | null;
  media: {
    id: string;
    type: MediaType;
    url: string;
    thumbnailUrl: string | null;
  }[];
  replyToId: string | null;
  replyTo: Message | null;
  isForwarded: boolean;
  originalChatId: string | null;
  originalSenderId: string | null;
  voiceTranscript: string | null;
  waveform: string | null;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type Thread = {
  id: string;
  title: string | null;
  chatId: string;
  parentMessageId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  lastActivityAt: Date | null;
  participantCount: number;
  messageCount: number;
  color: string | null;
  emoji: string | null;
};

interface MessageThreadProps {
  chatId: string;
  thread: Thread;
  parentMessage?: Message;
  onClose: () => void;
}

export default function MessageThread({
  chatId,
  thread,
  parentMessage,
  onClose,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  
  // TRPC queries and mutations
  const { data: messagesData, isLoading: messagesLoading } = api.chat.getMessages.useQuery(
    { chatId, threadId: thread.id, limit: 50 },
    { enabled: !!session?.user?.id && !!chatId && !!thread.id }
  );
  
  const { mutate: sendMessageMutation } = api.chat.sendMessage.useMutation({
    onSuccess: (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
      setNewMessage('');
    },
  });
  
  // Update messages when data changes
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages);
      setIsLoading(false);
      scrollToBottom();
    }
  }, [messagesData]);
  
  // Set up Pusher subscription
  useEffect(() => {
    if (!session?.user?.id || !chatId || !thread.id) return;

    const channel = clientPusher.subscribe(getChatChannel(chatId));
    
    channel.bind(PusherEvents.NEW_MESSAGE, (newMessage: Message) => {
      // Only add messages for this thread
      if (newMessage.threadId === thread.id) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }
    });

    // Clean up subscription
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getChatChannel(chatId));
    };
  }, [session?.user?.id, chatId, thread.id]);

  // Scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send a message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !session?.user?.id) return;
    
    sendMessageMutation({
      chatId,
      content: newMessage.trim(),
      threadId: thread.id,
      receiverId: null,
    });
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Toggle translation for a message
  const toggleTranslation = (messageId: string) => {
    setShowTranslation(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };
  
  // Handle voice message completion
  const handleVoiceMessageComplete = () => {
    setShowVoiceRecorder(false);
  };
  
  // Render thread header
  const renderThreadHeader = () => (
    <div className="p-3 border-b border-border-color flex justify-between items-center bg-header-bg">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-text-secondary" />
        <div className="flex flex-col">
          <h3 className="font-medium text-sm text-text-primary">
            {thread.title || 'Thread'}
          </h3>
          {parentMessage && (
            <p className="text-xs text-text-secondary truncate max-w-[200px]">
              {parentMessage.content}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-text-secondary hover:text-text-primary rounded-full"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
  
  // Render a single message
  const renderMessage = (msg: Message) => {
    const isCurrentUser = msg.senderId === session?.user?.id;
    
    return (
      <div
        key={msg.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div className="flex items-start max-w-[85%]">
          {/* Sender avatar (only for other users) */}
          {!isCurrentUser && (
            <div className="mr-2 flex-shrink-0">
              <Image
                src={msg.sender.image || '/placeholder-avatar.png'}
                alt={msg.sender.name || 'User'}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            </div>
          )}
          
          {/* Message content */}
          <div
            className={`rounded-lg p-3 shadow-sm ${
              isCurrentUser
                ? 'bg-accent-blue text-text-primary'
                : 'bg-card-bg text-text-primary'
            }`}
          >
            {/* Sender name (only for other users) */}
            {!isCurrentUser && (
              <div className="font-medium text-sm mb-1">{msg.sender.name || 'User'}</div>
            )}
            
            {/* Reply reference if this is a reply */}
            {msg.replyTo && (
              <div className="border-l-2 border-border-color pl-2 mb-2 text-xs text-text-secondary">
                <div className="font-medium">{msg.replyTo.sender.name || 'User'}</div>
                <div className="truncate">{msg.replyTo.content}</div>
              </div>
            )}
            
            {/* Message content based on type */}
            {msg.messageType === 'TEXT' && msg.content && (
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            )}
            
            {/* Voice message display with waveform */}
            {msg.messageType === 'VOICE_MESSAGE' && (
              <div className="mb-1">
                {msg.voiceTranscript && (
                  <p className="text-xs text-text-secondary/90 mb-1 italic">
                    {msg.voiceTranscript}
                  </p>
                )}
                
                {msg.waveform && (
                  <div className="h-6 flex items-center gap-px my-1">
                    {msg.waveform.split(',').map((height, i) => (
                      <div
                        key={i}
                        className={`w-1 ${isCurrentUser ? 'bg-blue-300' : 'bg-blue-500'}`}
                        style={{ height: `${parseFloat(height) * 24}px` }}
                      />
                    ))}
                  </div>
                )}
                
                {msg.media.length > 0 && msg.media[0].type === 'AUDIO' && (
                  <audio
                    controls
                    src={msg.media[0].url}
                    className="max-w-full"
                  />
                )}
              </div>
            )}
            
            {/* Media attachments */}
            {msg.media.length > 0 && msg.messageType !== 'VOICE_MESSAGE' && (
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
            
            {/* Message timestamp */}
            <p
              className={`text-xs mt-1 ${
                isCurrentUser ? 'text-text-primary/70' : 'text-text-secondary'
              }`}
            >
              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
            </p>
            
            {/* Translation option */}
            <MessageTranslation
              messageId={msg.id}
              content={msg.content}
              translatedText={msg.translatedText}
              sourceLanguage={msg.sourceLanguage}
              targetLanguage={msg.targetLanguage}
              showTranslation={showTranslation[msg.id]}
              onToggleTranslation={() => toggleTranslation(msg.id)}
            />
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col rounded-lg border border-border-color bg-dark-bg overflow-hidden">
      {/* Thread header */}
      {renderThreadHeader()}
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoading || messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-text-secondary">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <MessageSquare className="h-12 w-12 mb-3 text-text-secondary/50" />
            <p className="mb-1">No messages in this thread yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          <>
            {/* Parent message if available */}
            {parentMessage && !messages.some(m => m.id === parentMessage.id) && (
              <div className="mb-4 p-3 bg-card-bg/30 rounded-lg border border-border-color/50">
                <div className="flex items-start">
                  <Image
                    src={parentMessage.sender.image || '/placeholder-avatar.png'}
                    alt={parentMessage.sender.name || 'User'}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover mr-2"
                  />
                  <div>
                    <div className="font-medium text-sm">{parentMessage.sender.name || 'User'}</div>
                    <p className="text-sm text-text-primary">{parentMessage.content}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {formatDistanceToNow(new Date(parentMessage.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Thread messages */}
            {messages.map(renderMessage)}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Voice message recorder */}
      {showVoiceRecorder && !showMediaUpload && (
        <div className="p-3 border-t border-border-color bg-card-bg">
          <VoiceMessage
            chatId={chatId}
            receiverId=""
            onFinish={handleVoiceMessageComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}
      
      {/* Input area */}
      {!showVoiceRecorder && !showMediaUpload && (
        <div className="p-3 border-t border-border-color bg-card-bg">
          <div className="flex items-end">
            <div className="flex gap-2 mr-2">
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="p-2 text-text-secondary hover:text-text-primary rounded-full"
                title="Record voice message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowMediaUpload(true)}
                className="p-2 text-text-secondary hover:text-text-primary rounded-full"
                title="Attach media"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>
            <textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-2 bg-input-bg border-none focus:outline-none resize-none text-sm rounded-md text-text-primary"
              rows={1}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-2 text-text-secondary hover:text-accent-blue disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}