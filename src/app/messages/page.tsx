"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from "next-auth/react";
import Image from 'next/image';
import { api } from "@/lib/trpc/api";
import { Search, Settings, PenSquare, Send, Phone, Video, Info, FileImage, Users, Paperclip, Smile, Mic, MoreVertical, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { clientPusher, getChatChannel, PusherEvents } from "@/lib/pusher";
import { MediaDisplay } from "@/app/components/common/media-display";

type ChatUser = {
  id: string;
  name: string | null;
  image: string | null;
};

type Message = {
  id: string;
  content: string | null;
  createdAt: Date;
  senderId: string;
  sender: ChatUser;
  media: Array<{
    id: string;
    url: string;
    type: string;
    thumbnailUrl?: string;
  }>;
  isRead: boolean;
  receiverId: string | null;
};

type Chat = {
  id: string;
  name?: string;
  isGroup: boolean;
  participants: Array<{
    user: ChatUser;
  }>;
  messages: Message[];
  unreadCount: number;
  _count?: {
    messages: number;
  };
};

export default function MessagesPage() {
  const { data: session } = useSession();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showUserInfo, setShowUserInfo] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all users with their chats
  const { data: usersData, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = api.chat.getAllUsersWithChats.useQuery({
    limit: 50,
    searchQuery: debouncedSearchQuery
  }, {
    enabled: !!session?.user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch messages for selected chat
  const { data: messagesData, refetch: refetchMessages } = api.chat.getMessages.useQuery({
    chatId: selectedChatId!,
    limit: 100
  }, {
    enabled: !!selectedChatId && !!session?.user?.id
  });

  // Send message mutation
  const { mutate: sendMessage } = api.chat.sendMessage.useMutation({
    onSuccess: (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      scrollToBottom();
      refetchUsers();
    }
  });

  // Mark messages as read
  const { mutate: markAsRead } = api.chat.markAsRead.useMutation();

  // Create or get chat mutation
  const { mutate: createOrGetChat } = api.chat.createOrGetChat.useMutation({
    onSuccess: (chat) => {
      const otherUser = chat.participants.find(p => p.user.id !== session?.user?.id)?.user;
      setSelectedChatId(chat.id);
      setSelectedUser(otherUser || null);
      setIsCreatingChat(false);
      refetchUsers();
    },
    onError: (error) => {
      console.error('Error creating chat:', error);
      setIsCreatingChat(false);
    }
  });

  // Update messages when data changes
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages);
      scrollToBottom();
      
      // Mark messages as read
      if (selectedChatId && messagesData.unreadCount > 0) {
        markAsRead({ chatId: selectedChatId });
      }
    }
  }, [messagesData, selectedChatId, markAsRead]);

  // Set up Pusher subscriptions
  useEffect(() => {
    if (!selectedChatId || !session?.user?.id) return;

    const channel = clientPusher.subscribe(getChatChannel(selectedChatId));
    
    const handleNewMessage = (newMessage: Message) => {
      if (newMessage.senderId !== session.user.id) {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
        markAsRead({ chatId: selectedChatId });
      }
    };

    channel.bind(PusherEvents.NEW_MESSAGE, handleNewMessage);

    return () => {
      channel.unbind(PusherEvents.NEW_MESSAGE, handleNewMessage);
      clientPusher.unsubscribe(getChatChannel(selectedChatId));
    };
  }, [selectedChatId, session?.user?.id, markAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle chat selection
  const handleChatSelect = (chat: Chat) => {
    const otherUser = chat.participants.find(p => p.user.id !== session?.user?.id)?.user;
    setSelectedChatId(chat.id);
    setSelectedUser(otherUser || null);
  };

  // Handle creating a new chat with a user
  const handleCreateChat = (user: ChatUser) => {
    if (isCreatingChat) return;
    
    setIsCreatingChat(true);
    createOrGetChat({ userId: user.id });
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!message.trim() || !selectedChatId || !selectedUser) return;

    sendMessage({
      chatId: selectedChatId,
      content: message.trim(),
      receiverId: selectedUser.id
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Test database connection
  const { data: dbTest, error: dbTestError } = api.chat.testDbConnection.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Log error to console
  useEffect(() => {
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }
    if (dbTestError) {
      console.error('Database test error:', dbTestError);
    }
    if (dbTest) {
      console.log('Database test result:', dbTest);
    }
  }, [usersError, dbTestError, dbTest]);

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Left Sidebar - Chat List */}
      <div className="w-[360px] bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Chats</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors">
                <Settings className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors">
                <PenSquare className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Messenger"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-800 text-white rounded-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* User/Chat List */}
        <div className="flex-1 overflow-y-auto">
          {usersError ? (
            <div className="p-4">
              <div className="text-red-500 bg-red-500/10 p-3 rounded-lg">
                <p className="font-semibold">Error loading users</p>
                <p className="text-sm mt-1">{usersError.message}</p>
              </div>
            </div>
          ) : usersLoading ? (
            <div className="p-4">
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-gray-800"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-800 rounded mb-2"></div>
                      <div className="h-3 w-48 bg-gray-800 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : usersData?.usersWithChats?.length === 0 ? (
            <div className="px-3 py-4 text-gray-500">
              <p>No users found.</p>
            </div>
          ) : (
            <div className="py-2">
              {usersData?.usersWithChats?.map(({ user, chat }) => {
                const isSelected = selectedChatId === chat?.id;
                const lastMessage = chat?.messages[0];
                const hasUnread = chat?.unreadCount > 0;

                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      if (chat) {
                        handleChatSelect(chat);
                      } else {
                        // If no chat exists, create one
                        handleCreateChat(user);
                      }
                    }}
                    className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-900/20' : 'hover:bg-gray-800/50'
                    } ${isCreatingChat ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="relative">
                      <Image
                        src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0D8ABC&color=fff`}
                        alt={user.name || 'User'}
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-white truncate">{user.name}</h3>
                        {lastMessage && (
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(lastMessage.createdAt), { 
                              addSuffix: true, 
                              locale: ka 
                            })}
                          </span>
                        )}
                      </div>
                      
                      {lastMessage ? (
                        <p className={`text-sm truncate ${hasUnread ? 'text-white font-medium' : 'text-gray-400'}`}>
                          {lastMessage.senderId === session?.user?.id ? 'თქვენ: ' : ''}
                          {lastMessage.content || 'გაგზავნილია ფოტო'}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">დაიწყეთ საუბარი</p>
                      )}
                    </div>

                    {hasUnread && (
                      <div className="flex items-center justify-center h-5 w-5 bg-blue-500 rounded-full">
                        <span className="text-xs text-white font-medium">{chat.unreadCount}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChatId && selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800 bg-gray-900">
              <div className="flex items-center gap-3">
                <Image
                  src={selectedUser.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'User')}&background=0D8ABC&color=fff`}
                  alt={selectedUser.name || 'User'}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-semibold text-white">{selectedUser.name}</h2>
                  <p className="text-sm text-gray-400">Active recently</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors">
                  <Video className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className={`p-2 rounded-full transition-colors ${
                    showUserInfo ? 'text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-gray-950 p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isCurrentUser = msg.senderId === session?.user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end gap-2 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                        {!isCurrentUser && (
                          <Image
                            src={msg.sender.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name || 'User')}&background=0D8ABC&color=fff`}
                            alt={msg.sender.name || 'User'}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isCurrentUser
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-800 text-white'
                          }`}
                        >
                          {msg.content && <p>{msg.content}</p>}
                          
                          {msg.media.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {msg.media.map((item) => (
                                <MediaDisplay
                                  key={item.id}
                                  media={item}
                                  className="rounded-lg max-w-xs"
                                />
                              ))}
                            </div>
                          )}
                          
                          <p className="text-xs mt-1 opacity-70">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
                
                {message.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="p-2 text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                ) : (
                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Mic className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="mb-4">
                <div className="h-24 w-24 mx-auto bg-gray-800 rounded-full flex items-center justify-center">
                  <Send className="h-12 w-12 text-gray-600" />
                </div>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Your Messages</h3>
              <p>Send private photos and messages to a friend or group</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - User Info */}
      {showUserInfo && selectedUser && (
        <div className="w-[320px] bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
          {/* User Profile */}
          <div className="text-center mb-6">
            <Image
              src={selectedUser.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'User')}&background=0D8ABC&color=fff`}
              alt={selectedUser.name || 'User'}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover mx-auto mb-3"
            />
            <h3 className="text-lg font-semibold text-white">{selectedUser.name}</h3>
            <p className="text-sm text-gray-400">
              Active recently
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button className="flex flex-col items-center gap-1 p-3 hover:bg-gray-800 rounded-lg transition-colors">
              <div className="h-9 w-9 bg-gray-800 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-400">Audio</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-3 hover:bg-gray-800 rounded-lg transition-colors">
              <div className="h-9 w-9 bg-gray-800 rounded-full flex items-center justify-center">
                <Video className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-400">Video</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-3 hover:bg-gray-800 rounded-lg transition-colors">
              <div className="h-9 w-9 bg-gray-800 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-400">Create</span>
            </button>
          </div>

          {/* Shared Media */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-white mb-3">Shared Photos</h4>
            <div className="grid grid-cols-3 gap-2">
              {messages
                .filter(msg => msg.media.length > 0)
                .slice(0, 6)
                .map((msg) => (
                  msg.media.map((item) => (
                    <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                      {item.type === 'IMAGE' ? (
                        <Image
                          src={item.url}
                          alt="Shared photo"
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileImage className="h-6 w-6 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))
                ))
              }
            </div>
            
            {messages.filter(msg => msg.media.length > 0).length === 0 && (
              <p className="text-sm text-gray-400">No photos yet</p>
            )}
          </div>

          {/* More Options */}
          <div className="space-y-2">
            <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg transition-colors">
              <span className="text-sm text-white">Search in Conversation</span>
            </button>
            <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg transition-colors">
              <span className="text-sm text-white">Change Theme</span>
            </button>
            <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg transition-colors">
              <span className="text-sm text-white">Change Emoji</span>
            </button>
            <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg transition-colors">
              <span className="text-sm text-white">Notifications</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}