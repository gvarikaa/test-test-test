"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import { ArrowLeft, MessageCircle, Search, Users, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { useChatManager } from "@/app/components/chat/chat-context";
// import ChatList from "@/app/components/messages/ChatList";

export default function MessagesPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const { startChat } = useChatManager();

  const { data: recentChats, isLoading } = api.chat.getRecentChats.useQuery({
    limit: 20,
  });

  const { data: unreadCounts } = api.chat.getUnreadCount.useQuery();

  const filteredChats = recentChats?.chats.filter((chat) => {
    const searchLower = searchQuery.toLowerCase();
    const chatName = chat.isGroup
      ? chat.name?.toLowerCase()
      : chat.participants.find(p => p.userId !== session?.user?.id)?.user.name?.toLowerCase();
    
    return chatName?.includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Link
                href="/"
                className="mr-4 p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </Link>
              <h1 className="text-2xl font-bold text-white">მესიჯები</h1>
            </div>
            <button className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors">
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="ძებნა მესიჯებში..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : filteredChats?.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">მესიჯები არ მოიძებნა</p>
            </div>
          ) : (
            filteredChats?.map((chat) => {
              const otherUser = chat.participants.find(
                (p) => p.userId !== session?.user?.id
              )?.user;
              const lastMessage = chat.lastMessage;
              
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    if (otherUser) {
                      startChat(otherUser.id, {
                        id: otherUser.id,
                        name: otherUser.name,
                        image: otherUser.image,
                      });
                    }
                  }}
                  className="flex items-center p-4 bg-gray-800/30 hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all duration-200 border border-gray-700/30 hover:border-gray-600"
                >
                  <div className="relative mr-4">
                    <Image
                      src={
                        chat.isGroup
                          ? "/placeholder-group.png"
                          : otherUser?.image || "/placeholder-avatar.png"
                      }
                      alt={chat.isGroup ? "Group" : otherUser?.name || "User"}
                      width={50}
                      height={50}
                      className="rounded-full"
                    />
                    {chat.unreadCount && chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {chat.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-white">
                        {chat.isGroup ? chat.name : otherUser?.name || "Unknown"}
                      </h3>
                      {lastMessage && (
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(lastMessage.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {lastMessage
                        ? lastMessage.content || "📷 მედია"
                        : "დაიწყეთ საუბარი"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}