"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useSession } from "next-auth/react";
import { useChatManager } from "@/app/components/chat/chat-manager";
import { api } from "@/lib/trpc/api";
import { clientPusher, PusherEvents, getUserChannel } from "@/lib/pusher";

// Define the global window object with activeChats property
declare global {
  interface Window {
    activeChats: Array<{
      id: string;
      name: string;
      image: string;
      online: boolean;
      minimized: boolean;
    }>;
  }
}

function RightSidebar() {
  const { startChat } = useChatManager();
  const { data: session, status } = useSession();
  
  // Fetch user contacts using TRPC
  const { data: contactsData, isLoading: isLoadingContacts, error: contactsError } = api.user.getUsers.useQuery(
    { limit: 10 },
    { enabled: !!session?.user?.id }
  );
  
  // Track online status of users
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  
  // Format contacts data with online status using useMemo to prevent unnecessary re-renders
  const contacts = useMemo(() => {
    return contactsData?.users?.map(user => ({
      id: user.id, 
      name: user.name || 'Unknown User',
      image: user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0D8ABC&color=fff`,
      online: onlineUsers[user.id] || false
    })) || [];
  }, [contactsData?.users, onlineUsers]);
  
  // Initialize active chats state
  const [activeChats, setActiveChats] = useState([]);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Define some theme constants
  const THEME = {
    primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
    textPrimary: "text-gray-100",
    borderColor: "border-gray-800/40",
    onlineStatus: "bg-emerald-500",
  };
  
  // Create memoized handler for chat click to prevent unnecessary re-renders
  const handleContactClick = useCallback((contact) => {
    console.log(`Contact clicked: ${contact.name} (id: ${contact.id})`);
    
    // Use the chat manager's startChat function
    startChat(contact.id);

    // For compatibility with the old chat system
    if (!activeChats.some(chat => chat.id === contact.id)) {
      console.log(`Creating new chat for ${contact.name}`);

      const newChat = {
        id: contact.id,
        name: contact.name,
        image: contact.image,
        online: contact.online,
        minimized: false
      };

      // Update activeChats
      const updatedChats = [...activeChats, newChat];
      
      // Update local state
      setActiveChats(updatedChats);

      // Update global window object
      window.activeChats = updatedChats;

      // Force a re-render
      setForceUpdate(prev => prev + 1);

      // Dispatch event 
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('chat-updated'));
      }, 0);
    }
  }, [activeChats, startChat]);
  
  // Set up chat event listener
  useEffect(() => {
    console.log('Setting up chat update listener');

    const handleChatUpdate = () => {
      console.log('Chat update event received');
      if (window.activeChats) {
        console.log('Setting active chats:', window.activeChats);
        setActiveChats([...window.activeChats]);
        setForceUpdate(prev => prev + 1);
      }
    };

    // Initialize window.activeChats if it doesn't exist
    if (!window.activeChats) {
      console.log('Initializing window.activeChats');
      window.activeChats = [];
    }

    document.addEventListener('chat-updated', handleChatUpdate);
    return () => {
      document.removeEventListener('chat-updated', handleChatUpdate);
    };
  }, []);
  
  // Set up Pusher subscription for online status
  useEffect(() => {
    if (!session?.user?.id) return;
    
    console.log('Setting up Pusher for online status');
    
    // Global online status channel
    const channel = clientPusher.subscribe('presence-online');
    
    const handleUserOnline = (data: { userId: string }) => {
      console.log('User online:', data.userId);
      setOnlineUsers(prev => ({ ...prev, [data.userId]: true }));
    };
    
    const handleUserOffline = (data: { userId: string }) => {
      console.log('User offline:', data.userId);
      setOnlineUsers(prev => ({ ...prev, [data.userId]: false }));
    };
    
    // Subscribe to online/offline events
    channel.bind(PusherEvents.USER_ONLINE, handleUserOnline);
    channel.bind(PusherEvents.USER_OFFLINE, handleUserOffline);
    
    // Broadcast that current user is online
    if (session.user.id) {
      try {
        const userChannel = getUserChannel(session.user.id);
        clientPusher.subscribe(userChannel);
      } catch (error) {
        console.error('Error subscribing to user channel:', error);
      }
    }
    
    // Clean up subscriptions
    return () => {
      channel.unbind(PusherEvents.USER_ONLINE, handleUserOnline);
      channel.unbind(PusherEvents.USER_OFFLINE, handleUserOffline);
      clientPusher.unsubscribe('presence-online');
      
      if (session.user.id) {
        try {
          const userChannel = getUserChannel(session.user.id);
          clientPusher.unsubscribe(userChannel);
        } catch (error) {
          console.error('Error unsubscribing from user channel:', error);
        }
      }
    };
  }, [session?.user?.id]);
  
  return (
    <div className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[360px] overflow-y-auto border-l border-gray-800/40 px-2 py-3 lg:block bg-gray-950/40 backdrop-blur-md">
      <div className="mt-2">
        <div className="mb-4 flex items-center justify-between px-2 py-2 rounded-lg bg-gray-900/70 border border-gray-800/40">
          <h2 className="text-lg font-bold text-gray-100 flex items-center">
            <span className={`mr-2 inline-flex p-1 rounded-full ${THEME.primaryGradient}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 text-white">
                <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
              </svg>
            </span>
            Contacts
          </h2>
        </div>
        
        <div className="mt-3 space-y-1.5 px-1">
          {isLoadingContacts ? (
            <div className="flex flex-col space-y-2 px-3 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-800 animate-pulse"></div>
                <div className="h-4 w-32 bg-gray-800 animate-pulse rounded"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-800 animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-800 animate-pulse rounded"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-800 animate-pulse"></div>
                <div className="h-4 w-28 bg-gray-800 animate-pulse rounded"></div>
              </div>
            </div>
          ) : contactsError ? (
            <div className="px-3 py-4 text-red-500">
              <p>Error loading contacts. Please try again later.</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="px-3 py-4 text-gray-500">
              <p>No contacts found.</p>
            </div>
          ) : (
            contacts.map((contact) => (
            <div key={contact.id} className="group">
              <div 
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-800/40 cursor-pointer"
                onClick={() => handleContactClick(contact)}
              >
                <div className="relative h-10 w-10">
                  <Image
                    src={contact.image}
                    alt={contact.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  {contact.online && (
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gray-950 ${THEME.onlineStatus}`}></span>
                  )}
                </div>
                <div className="flex-1">
                  <span className={`font-medium ${THEME.textPrimary}`}>{contact.name}</span>
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(RightSidebar);