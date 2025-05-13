"use client";

import { useSession } from "next-auth/react";
import { useChatManager } from "@/app/components/chat/chat-manager";
import { api } from "@/lib/trpc/api";

export default function TestChatPage() {
  const { data: session } = useSession();
  const { startChat } = useChatManager();
  
  // Fetch all users
  const { data: users, isLoading } = api.user.getUsers.useQuery(
    { limit: 10 },
    { enabled: !!session?.user?.id }
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Chat System Test</h1>
      
      {!session ? (
        <p>Please sign in to test the chat system</p>
      ) : (
        <div>
          <p className="mb-4">Logged in as: {session.user.name}</p>
          
          <h2 className="text-xl font-semibold mb-4">Available Users:</h2>
          
          {isLoading ? (
            <p>Loading users...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users?.users?.map((user) => (
                <div 
                  key={user.id} 
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                  
                  {user.id !== session.user.id && (
                    <button
                      onClick={() => startChat(user.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      Start Chat
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}