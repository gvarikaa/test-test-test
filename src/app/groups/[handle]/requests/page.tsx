"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';

import FacebookHeader from '../../../components/layouts/FacebookHeader';
import GroupLeftSidebar from '../../../components/groups/GroupLeftSidebar';
import GroupJoinRequests from '../../../components/groups/GroupJoinRequests';
import MobileNavigation from '../../../components/layouts/MobileNavigation';

export default function GroupJoinRequestsPage() {
  const router = useRouter();
  const params = useParams<{ handle: string }>();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  const [isMember, setIsMember] = useState(false);
  const [memberData, setMemberData] = useState<any>(null);

  // Get group data
  const groupQuery = trpc.group.getByHandle.useQuery({
    handle: params.handle as string
  }, {
    enabled: !!params.handle,
    onError: (error) => {
      console.error("Error loading group:", error);
    }
  });

  // Check membership status when authenticated
  const membershipQuery = trpc.group.getUserGroups.useQuery({
    limit: 100
  }, {
    enabled: isAuthenticated && !!groupQuery.data?.id,
    onSuccess: (data) => {
      if (data?.items) {
        const membership = data.items.find(item => item.group.id === groupQuery.data?.id);
        setIsMember(!!membership);
        setMemberData(membership);
      }
    }
  });

  const isAdmin = memberData?.membership?.role === 'OWNER' || 
                  memberData?.membership?.role === 'ADMIN' ||
                  memberData?.membership?.role === 'MODERATOR';

  // Redirect if not admin
  useEffect(() => {
    if (membershipQuery.isSuccess && !isAdmin) {
      router.push(`/groups/${params.handle}`);
    }
  }, [membershipQuery.isSuccess, isAdmin, router, params.handle]);

  if (groupQuery.error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800/40 max-w-md w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h1 className="text-xl font-bold text-white mb-2">Group Not Found</h1>
          <p className="text-gray-400 mb-4">
            {groupQuery.error.message === 'NOT_FOUND'
              ? "The group you're looking for doesn't exist or has been removed."
              : groupQuery.error.message === 'FORBIDDEN'
                ? "You don't have permission to access this group."
                : "There was an error loading this group. Please try again later."}
          </p>
          <button
            onClick={() => router.push('/groups')}
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const group = groupQuery.data;
  const isLoading = groupQuery.isLoading || (!group && !groupQuery.error);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <FacebookHeader />

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-[calc(100vh-4rem)] w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
            <p className="text-indigo-300 font-medium">Loading group...</p>
          </div>
        </div>
      )}

      {/* Main content */}
      {group && isAdmin && (
        <div className="flex justify-center px-0 lg:px-4">
          {/* Left sidebar - group navigation */}
          <GroupLeftSidebar
            group={group}
            isMember={isMember}
          />

          {/* Main column - join requests content */}
          <main className="w-full max-w-[680px] px-0 pb-4 sm:px-4">
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-900 border border-gray-800/40 shadow-md animate-fade-in">
              <div className="px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-100 mb-2">Pending Join Requests</h1>
                <p className="text-gray-400 mb-4">
                  Manage requests to join {group.name}
                </p>

                {/* Requests list */}
                <GroupJoinRequests groupId={group.id} />
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
}