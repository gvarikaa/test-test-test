"use client";

import { useSession } from "next-auth/react";
import RightSidebar from "@/app/components/layouts/RightSidebar";

export default function TestChatSidebarPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-950 text-white relative">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">RightSidebar Chat Test</h1>
        
        {!session ? (
          <p>Please sign in to test the chat system</p>
        ) : (
          <div>
            <p className="mb-4">Logged in as: {session.user.name}</p>
            <p className="text-gray-400">The contact list should appear on the right side of the screen.</p>
          </div>
        )}
      </div>
      
      {/* Force show the RightSidebar */}
      <div className="fixed right-0 top-0 h-screen">
        <RightSidebar />
      </div>
    </div>
  );
}