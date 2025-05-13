'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/trpc/api';
import { useChatManager } from '@/app/components/chat/chat-manager';
import { useSession } from 'next-auth/react';

export default function ChatDebugPage() {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recentUsers, setRecentUsers] = useState<{ id: string; name: string }[]>([]);
  const { data: session } = useSession();
  const { startChat } = useChatManager();

  // Get some seed users to test with
  const { data: userData, isLoading } = api.user.getUsers.useQuery(
    { limit: 5 },
    {
      enabled: !!session?.user?.id,
      onError: (err) => {
        console.error('Error fetching users:', err);
        setError('Failed to load test users');
      }
    }
  );

  useEffect(() => {
    if (userData?.users) {
      setRecentUsers(userData.users.map(user => ({
        id: user.id,
        name: user.name || `User ${user.id.substring(0, 5)}`
      })));
    }
  }, [userData]);

  const handleStartChat = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!id || typeof id !== 'string') {
        setError('Invalid user ID');
        return;
      }
      
      console.log('Starting chat with user ID:', id);
      startChat(id);
      setSuccess(`Chat creation initiated with user ID: ${id}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStartChat(userId);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Chat Debugging Tool</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{success}</p>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Start Chat with User ID</h2>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className="border border-gray-300 rounded px-4 py-2 flex-grow"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Start Chat
          </button>
        </form>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Test with Sample Users</h2>
        {isLoading ? (
          <p>Loading users...</p>
        ) : recentUsers.length > 0 ? (
          <ul className="space-y-2">
            {recentUsers.map((user) => (
              <li key={user.id} className="border border-gray-200 rounded p-4 flex justify-between items-center">
                <div>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>ID:</strong> {user.id}</p>
                </div>
                <button
                  onClick={() => handleStartChat(user.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Start Chat
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No users available for testing</p>
        )}
      </div>
    </div>
  );
}