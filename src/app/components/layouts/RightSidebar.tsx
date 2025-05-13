"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useChatManager } from "@/app/components/chat/chat-manager";

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

export default function RightSidebar() {
  // Get the chat manager functions from context
  const { startChat } = useChatManager();
  
  // Define theme colors for consistent styling
  const THEME = {
    // Primary gradients
    primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
    secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
    accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",

    // Background levels
    sidebarBg: "bg-gray-950/40",
    cardBg: "bg-gray-900/70",
    chatBg: "bg-gray-900",
    inputBg: "bg-gray-800/60",

    // Text and border colors
    textPrimary: "text-gray-100",
    textSecondary: "text-gray-400",
    accentBlue: "text-indigo-400",
    borderColor: "border-gray-800/40",

    // Online status colors
    onlineStatus: "bg-emerald-500",

    // Effects
    glow: "shadow-lg shadow-indigo-950/20",
    buttonHover: "hover:bg-gray-800/60"
  };
  
  // სათესტო მომხარებლების მონაცემები
  const contacts = [
    {
      id: '1',
      name: 'John Doe',
      image: 'https://ui-avatars.com/api/?name=John+Doe&background=FF5722&color=fff',
      online: true
    },
    {
      id: '2',
      name: 'Sarah Williams',
      image: 'https://ui-avatars.com/api/?name=Sarah+Williams&background=E91E63&color=fff',
      online: true
    },
    {
      id: '3',
      name: 'David Johnson',
      image: 'https://ui-avatars.com/api/?name=David+Johnson&background=4CAF50&color=fff',
      online: false
    },
    {
      id: '4',
      name: 'Emily Brown',
      image: 'https://ui-avatars.com/api/?name=Emily+Brown&background=9C27B0&color=fff',
      online: true
    },
    {
      id: '5',
      name: 'Michael Wilson',
      image: 'https://ui-avatars.com/api/?name=Michael+Wilson&background=3F51B5&color=fff',
      online: false
    },
    {
      id: '6',
      name: 'Jessica Taylor',
      image: 'https://ui-avatars.com/api/?name=Jessica+Taylor&background=FF9800&color=fff',
      online: true
    },
    {
      id: '7',
      name: 'Robert Martinez',
      image: 'https://ui-avatars.com/api/?name=Robert+Martinez&background=009688&color=fff',
      online: false
    },
    {
      id: '8',
      name: 'Amanda Thompson',
      image: 'https://ui-avatars.com/api/?name=Amanda+Thompson&background=795548&color=fff',
      online: true
    }
  ];

  // Define message structure for chat messages
  type Message = {
    id: string;
    chatId: string;
    text: string;
    sender: 'user' | 'other';
    timestamp: Date;
  };

  // აქტიური ჩატის ფანჯრები - თავიდან ცარიელი (მხოლოდ მომხარებლის ქმედებაზე გაიხსნება)
  const [activeChats, setActiveChats] = useState<{
    id: string;
    name: string;
    image: string;
    online: boolean;
    minimized: boolean;
  }[]>([]);

  // Chat messages state
  const [messages, setMessages] = useState<Message[]>([]);

  // Helper function to send a message
  const sendMessage = (chatId: string, messageText: string) => {
    if (!messageText.trim()) return;

    // Add message to state
    const newMessage = {
      id: Date.now().toString(),
      chatId: chatId,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);

    // Auto-scroll to bottom of chat
    setTimeout(() => {
      const chatContainer = document.getElementById(`chat-messages-${chatId}`);
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 50);

    // Simulate response after 1 second
    setTimeout(() => {
      const responseMessage = {
        id: (Date.now() + 1).toString(),
        chatId: chatId,
        text: `Thanks for your message: "${messageText}"`,
        sender: 'other',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, responseMessage]);

      // Auto-scroll again for the response
      setTimeout(() => {
        const chatContainer = document.getElementById(`chat-messages-${chatId}`);
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);
    }, 1000);
  };

  // Initialize force update state
  const [forceUpdate, setForceUpdate] = useState(0);

  // Listen for custom chat update events
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

  return (
    <aside className={`${THEME.sidebarBg} sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[360px] overflow-y-auto border-l ${THEME.borderColor} px-2 py-3 lg:block backdrop-blur-md backdrop-saturate-150 ${THEME.glow}`}>

      {/* Contacts section */}
      <div className="contacts-section mt-2">
        <div className={`mb-4 flex items-center justify-between px-2 py-2 rounded-lg ${THEME.cardBg} ${THEME.glow} border ${THEME.borderColor}`}>
          <h2 className={`text-lg font-bold ${THEME.textPrimary} flex items-center`}>
            <span className={`mr-2 inline-flex p-1 rounded-full ${THEME.primaryGradient}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 text-white">
                <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
              </svg>
            </span>
            Contacts
          </h2>
          <div className="flex space-x-1">
            <button className={`rounded-full p-1.5 ${THEME.textSecondary} transition-all duration-200 hover:bg-gray-800/80 hover:${THEME.textPrimary} hover:scale-110`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M4.5 4.5a3 3 0 013-3h9a3 3 0 013 3v4.5a3 3 0 01-3 3h-9a3 3 0 01-3-3V4.5zM4.5 15a3 3 0 013-3h9a3 3 0 013 3v4.5a3 3 0 01-3 3h-9a3 3 0 01-3-3V15zM13.5 6.75a.75.75 0 00-1.5 0V10.5a.75.75 0 001.5 0V6.75zM8.25 12.75a.75.75 0 00-1.5 0V16.5a.75.75 0 001.5 0V12.75z" clipRule="evenodd" />
              </svg>
            </button>
            <button className={`rounded-full p-1.5 ${THEME.textSecondary} transition-all duration-200 hover:bg-gray-800/80 hover:${THEME.textPrimary} hover:scale-110`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
              </svg>
            </button>
            <button className={`rounded-full p-1.5 ${THEME.textSecondary} transition-all duration-200 hover:bg-gray-800/80 hover:${THEME.textPrimary} hover:scale-110`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 8.625a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM15.375 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contact list */}
        <div className="mt-3 space-y-1.5 px-1">
          {contacts.map((contact) => (
            <div key={contact.id} className="group">
              <div
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-gray-800/40 hover:translate-x-1 cursor-pointer`}
                onClick={() => {
                  console.log(`Contact clicked: ${contact.name} (id: ${contact.id})`);

                  // Use the chat manager's startChat function
                  startChat(contact.id);

                  // For compatibility with the old chat system, also update the window.activeChats
                  // This is needed during the transition to the new chat system
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
                    console.log('Updated chats:', updatedChats);

                    // Update local state
                    setActiveChats(updatedChats);

                    // Update global window object
                    window.activeChats = updatedChats;

                    // Force a re-render
                    setForceUpdate(prev => prev + 1);

                    // Finally, dispatch event with setTimeout to ensure state is updated
                    console.log('Dispatching chat-updated event');
                    setTimeout(() => {
                      document.dispatchEvent(new CustomEvent('chat-updated'));
                    }, 0);
                  } else {
                    console.log(`Chat already exists for ${contact.name}`);
                  }
                }}
              >
                <div className="relative h-10 w-10 transform transition-transform duration-200 group-hover:scale-105">
                  <Image
                    src={contact.image}
                    alt={contact.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover ring-2 ring-gray-800/60 group-hover:ring-indigo-500/40"
                  />
                  {contact.online && (
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gray-950 ${THEME.onlineStatus} animate-pulse`}></span>
                  )}
                </div>
                <div className="flex-1">
                  <span className={`font-medium ${THEME.textPrimary} transition-colors group-hover:text-indigo-300`}>{contact.name}</span>
                </div>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex space-x-1">
                    <div
                      className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-indigo-400 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle phone call action
                        console.log('Phone call action', contact.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div
                      className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-indigo-400 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle video call action
                        console.log('Video call action', contact.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat windows at bottom - absolute position with fixed z-index */}
      <div className="fixed bottom-0 left-0 z-[9999] flex flex-row-reverse gap-3 pr-3 pl-3" style={{ width: 'calc(100% - 380px)' }}>
        {activeChats.map((chat) => (
          <div
            key={chat.id}
            className={`flex w-[328px] flex-col rounded-t-lg border ${THEME.borderColor} ${THEME.chatBg} ${THEME.glow} ${chat.minimized ? 'h-12' : 'h-96'} overflow-hidden transition-all duration-300 animate-fadeIn`}
          >
            {/* Chat header - clickable for minimize/maximize */}
            <div
              className={`flex h-12 items-center justify-between border-b ${THEME.borderColor} bg-gradient-to-r from-gray-900/90 to-gray-800/90 px-3 py-2 cursor-pointer`}
              onClick={() => {
                // Toggle minimized state for this chat when clicking on header
                const updatedChats = activeChats.map(c =>
                  c.id === chat.id ? {...c, minimized: !c.minimized} : c
                );
                setActiveChats(updatedChats);
                window.activeChats = updatedChats;
              }}
            >
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-8 transition transform hover:scale-105 duration-200">
                  <Image
                    src={chat.image}
                    alt={chat.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                  {chat.online && (
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gray-900 ${THEME.onlineStatus} animate-pulse`}></span>
                  )}
                </div>
                <span className={`font-medium ${THEME.textPrimary}`}>{chat.name}</span>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {!chat.minimized && (
                  <>
                    <button className={`rounded-full p-1 ${THEME.textSecondary} transition-all duration-200 ${THEME.buttonHover} hover:${THEME.textPrimary} hover:scale-110`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button className={`rounded-full p-1 ${THEME.textSecondary} transition-all duration-200 ${THEME.buttonHover} hover:${THEME.textPrimary} hover:scale-110`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  className={`rounded-full p-1 ${THEME.textSecondary} transition-all duration-200 ${THEME.buttonHover} hover:${THEME.textPrimary} hover:scale-110`}
                  onClick={() => {
                    // Toggle minimized state for this chat
                    const updatedChats = activeChats.map(c =>
                      c.id === chat.id ? {...c, minimized: !c.minimized} : c
                    );
                    setActiveChats(updatedChats);
                    window.activeChats = updatedChats;
                  }}
                >
                  {chat.minimized ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-.53 14.03a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V8.25a.75.75 0 00-1.5 0v5.69l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  className={`rounded-full p-1 ${THEME.textSecondary} transition-all duration-200 ${THEME.buttonHover} hover:text-rose-500 hover:scale-110`}
                  onClick={() => {
                    // Remove this chat from activeChats
                    const updatedChats = activeChats.filter(c => c.id !== chat.id);
                    setActiveChats(updatedChats);
                    window.activeChats = updatedChats;
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat main content */}
            {!chat.minimized && (
              <>
                <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-gray-900 to-gray-950" id={`chat-messages-${chat.id}`}>
                  <div className="flex flex-col space-y-3">
                    {/* Default messages */}
                    <div className="max-w-[75%] self-start rounded-2xl bg-gray-800/60 p-2 px-3 text-gray-100 backdrop-blur-sm animate-fadeIn">
                      Hey there! How's it going?
                    </div>
                    <div className={`max-w-[75%] self-end rounded-2xl ${THEME.primaryGradient} p-2 px-3 text-white shadow-lg shadow-indigo-900/20 animate-fadeIn`}>
                      Pretty good, thanks for asking! Just working on the DapDip project.
                    </div>
                    <div className="max-w-[75%] self-start rounded-2xl bg-gray-800/60 p-2 px-3 text-gray-100 backdrop-blur-sm animate-fadeIn">
                      That's awesome! How's the progress so far?
                    </div>
                    <div className={`max-w-[75%] self-end rounded-2xl ${THEME.primaryGradient} p-2 px-3 text-white shadow-lg shadow-indigo-900/20 animate-fadeIn`}>
                      Making good progress! Just redesigning the UI to make it more modern.
                    </div>

                    {/* Dynamic messages */}
                    {messages
                      .filter(msg => msg.chatId === chat.id)
                      .map(message => (
                        <div
                          key={message.id}
                          className={`max-w-[75%] ${
                            message.sender === 'user'
                              ? `self-end rounded-2xl ${THEME.primaryGradient} p-2 px-3 text-white shadow-lg shadow-indigo-900/20`
                              : 'self-start rounded-2xl bg-gray-800/60 p-2 px-3 text-gray-100 backdrop-blur-sm'
                          } animate-fadeIn`}
                        >
                          {message.text}
                        </div>
                    ))}
                  </div>
                </div>

                {/* Chat footer */}
                <div className="flex items-center border-t border-gray-800/40 bg-gray-900/80 p-2 backdrop-blur-sm">
                  <button className="rounded-full p-1.5 text-gray-400 transition-all duration-200 hover:bg-gray-800/60 hover:text-indigo-400 hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm2.023 6.828a.75.75 0 10-1.06-1.06 3.75 3.75 0 01-5.304 0 .75.75 0 00-1.06 1.06 5.25 5.25 0 007.424 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="rounded-full p-1.5 text-gray-400 transition-all duration-200 hover:bg-gray-800/60 hover:text-indigo-400 hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                      <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="rounded-full p-1.5 text-gray-400 transition-all duration-200 hover:bg-gray-800/60 hover:text-indigo-400 hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm9 4.5a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5zm1.5 0a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H16.5v2.25H18a.75.75 0 010 1.5h-1.5v3a.75.75 0 01-1.5 0v-7.5zM6.636 9.78c.404-.575.867-.78 1.25-.78s.846.205 1.25.78a.75.75 0 001.228-.863C9.738 8.027 8.853 7.5 7.886 7.5c-.966 0-1.852.527-2.478 1.417-.62.882-.908 2-.908 3.083 0 1.083.288 2.201.909 3.083.625.89 1.51 1.417 2.477 1.417.967 0 1.852-.527 2.478-1.417a.75.75 0 00.136-.431V12a.75.75 0 00-.75-.75h-1.5a.75.75 0 000 1.5H9v1.648c-.37.44-.774.602-1.114.602-.383 0-.846-.205-1.25-.78C6.226 13.638 6 12.837 6 12c0-.837.226-1.638.636-2.22z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    placeholder="Aa"
                    className={`mx-2 flex-1 rounded-full ${THEME.inputBg} px-3 py-1.5 ${THEME.textPrimary} outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200 chat-${chat.id}-input`}
                    onKeyDown={(e) => {
                      // Send message on Enter key
                      if (e.key === 'Enter') {
                        const messageText = e.currentTarget.value.trim();
                        if (messageText) {
                          sendMessage(chat.id, messageText);
                          // Clear the input
                          e.currentTarget.value = '';
                        }
                        e.preventDefault(); // Prevent default to avoid form submission
                      }
                    }}
                  />
                  <button
                    className="rounded-full p-1.5 text-indigo-500 transition-all duration-200 hover:bg-indigo-500/20 hover:text-indigo-400 hover:scale-110"
                    onClick={() => {
                      // Get the input element
                      const input = document.querySelector(`.chat-${chat.id}-input`) as HTMLInputElement;
                      const messageText = input?.value.trim();
                      if (input && messageText) {
                        sendMessage(chat.id, messageText);
                        // Clear the input
                        input.value = '';
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </aside>
  );
}