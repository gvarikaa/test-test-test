"use client";

import { useState } from 'react';
import { chatEventBus } from '@/lib/chat-events';

export default function TestChatEventPage() {
  const [userId, setUserId] = useState('');

  const handleStartChat = () => {
    if (!userId) {
      alert('Please enter a user ID');
      return;
    }
    
    console.log('TestPage: Emitting START_CHAT event for user:', userId);
    chatEventBus.startChat(userId);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test Chat Event Bus</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            User ID to chat with:
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className="px-3 py-2 border rounded-md w-full max-w-md"
          />
        </div>
        
        <button
          onClick={handleStartChat}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Start Chat (Emit Event)
        </button>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-md">
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <p>Open browser console to see event logs</p>
        <p>Check if ChatManager receives the event</p>
      </div>
    </div>
  );
}