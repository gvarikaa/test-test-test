"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';

import FacebookHeader from '../../../components/layouts/FacebookHeader';
import GroupLeftSidebar from '../../../components/groups/GroupLeftSidebar';
import GroupMembersList from '../../../components/groups/GroupMembersList';
import MobileNavigation from '../../../components/layouts/MobileNavigation';

export default function GroupMembersPage() {
  const router = useRouter();
  const params = useParams<{ handle: string }>();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'>('ALL');
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
      {group && (
        <div className="flex justify-center px-0 lg:px-4">
          {/* Left sidebar - group navigation */}
          <GroupLeftSidebar
            group={group}
            isMember={isMember}
          />

          {/* Main column - member content */}
          <main className="w-full max-w-[680px] px-0 pb-4 sm:px-4">
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-900 border border-gray-800/40 shadow-md animate-fade-in">
              <div className="px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-100 mb-2">Group Members</h1>
                <p className="text-gray-400 mb-4">
                  {group._count?.members || 0} members in {group.name}
                </p>

                {/* Role filter tabs */}
                <div className="border-b border-gray-800/40 mb-4">
                  <div className="flex overflow-x-auto -mb-px">
                    <button
                      onClick={() => setRoleFilter('ALL')}
                      className={`flex-shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                        roleFilter === 'ALL'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      All Members
                    </button>
                    <button
                      onClick={() => setRoleFilter('OWNER')}
                      className={`flex-shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                        roleFilter === 'OWNER'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Owners
                    </button>
                    <button
                      onClick={() => setRoleFilter('ADMIN')}
                      className={`flex-shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                        roleFilter === 'ADMIN'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Admins
                    </button>
                    <button
                      onClick={() => setRoleFilter('MODERATOR')}
                      className={`flex-shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                        roleFilter === 'MODERATOR'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Moderators
                    </button>
                    <button
                      onClick={() => setRoleFilter('MEMBER')}
                      className={`flex-shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                        roleFilter === 'MEMBER'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Members
                    </button>
                  </div>
                </div>

                {/* Members list */}
                <GroupMembersList
                  groupId={group.id}
                  role={roleFilter === 'ALL' ? undefined : roleFilter}
                  isCurrentUserAdmin={
                    memberData?.membership?.role === 'OWNER' ||
                    memberData?.membership?.role === 'ADMIN'
                  }
                />
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