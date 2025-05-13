"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import FacebookHeader from '../../components/layouts/FacebookHeader';
import GroupLeftSidebar from '../../components/groups/GroupLeftSidebar';
import GroupRightSidebar from '../../components/groups/GroupRightSidebar';
import MobileNavigation from '../../components/layouts/MobileNavigation';
import GroupPostForm from '../../components/groups/GroupPostForm';
import GroupPostList from '../../components/groups/GroupPostList';
import GroupMembersList from '../../components/groups/GroupMembersList';
import GroupJoinRequests from '../../components/groups/GroupJoinRequests';

export default function GroupDetailsPage() {
  const router = useRouter();
  const params = useParams<{ handle: string }>();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [activeTab, setActiveTab] = useState('feed');
  const [isMember, setIsMember] = useState(false);
  const [memberData, setMemberData] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // tRPC queries for group data
  const groupQuery = trpc.group.getByHandle.useQuery({
    handle: params.handle as string
  }, {
    enabled: !!params.handle,
    onSuccess: (data) => {
      // Reset UI state when data is loaded
      setIsJoining(false);
      setIsLeaving(false);
    },
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

  // Group data is now fetched directly from the API

  // tRPC mutations for joining and leaving groups
  const joinGroup = trpc.group.join.useMutation({
    onSuccess: () => {
      setIsMember(true);
      setIsJoining(false);
      membershipQuery.refetch();
    },
    onError: (error) => {
      console.error("Error joining group:", error);
      setIsJoining(false);
    }
  });

  const leaveGroup = trpc.group.leave.useMutation({
    onSuccess: () => {
      setIsMember(false);
      setIsLeaving(false);
      membershipQuery.refetch();
    },
    onError: (error) => {
      console.error("Error leaving group:", error);
      setIsLeaving(false);
    }
  });

  // Handle join/leave group
  const handleJoinGroup = () => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    if (groupQuery.data?.id) {
      setIsJoining(true);
      joinGroup.mutate({ groupId: groupQuery.data.id });
    }
  };

  const handleLeaveGroup = () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      if (groupQuery.data?.id) {
        setIsLeaving(true);
        leaveGroup.mutate({ groupId: groupQuery.data.id });
      }
    }
  };


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
          <Link
            href="/groups"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Back to Groups
          </Link>
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

      {/* Group-specific styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .group-shine {
          position: relative;
          overflow: hidden;
        }

        .group-shine::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.05),
            transparent
          );
          animation: shimmer 3s infinite;
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>

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

          {/* Main column - group content */}
          <main className="w-full max-w-[680px] px-0 pb-4 sm:px-4">
            {/* Group header/cover */}
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-900 border border-gray-800/40 shadow-md animate-fade-in">
              {/* Cover image */}
              <div className="relative h-48 w-full bg-gray-700 sm:h-64">
                {group.coverImage ? (
                  <Image
                    src={group.coverImage}
                    alt={`${group.name} cover`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-800/60 to-purple-800/60">
                    <h1 className="text-2xl font-bold text-gray-100">{group.name}</h1>
                  </div>
                )}
              </div>

              {/* Group info */}
              <div className="relative px-4 pb-4 pt-16 sm:px-6">
                {/* Group logo */}
                <div className="absolute -top-12 left-4 h-24 w-24 overflow-hidden rounded-xl border-4 border-gray-900 bg-gray-800 sm:left-6 shadow-md">
                  {group.logoImage ? (
                    <Image
                      src={group.logoImage}
                      alt={`${group.name} logo`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-700 to-purple-700">
                      <span className="text-3xl font-bold text-white">{group.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
                  <div className="mb-3 sm:mb-0">
                    <h1 className="text-2xl font-bold text-gray-100">{group.name}</h1>
                    <div className="mt-1 flex items-center text-sm text-gray-400">
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 size-4">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 011.33-3.686c.032-.027.064-.053.098-.078a5.99 5.99 0 012.31-1.03.75.75 0 01.372 1.455c-.64.164-1.189.45-1.6.766a1.5 1.5 0 00-.666 1.11 1.5 1.5 0 01-1.486 1.905zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                        </svg>
                        {group._count?.members || 0} members
                      </span>
                      <span className="mx-2">•</span>
                      <span className={`capitalize ${
                        group.privacy === 'PUBLIC'
                          ? 'text-green-400'
                          : group.privacy === 'PRIVATE'
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}>
                        {group.privacy.toLowerCase()} group
                      </span>
                      {group.isVerified && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 size-4 text-indigo-400">
                              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div>
                    {isMember ? (
                      <button
                        onClick={handleLeaveGroup}
                        disabled={isLeaving}
                        className={`rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors ${isLeaving ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        {isLeaving ? 'Leaving...' : 'Leave Group'}
                      </button>
                    ) : (
                      <button
                        onClick={handleJoinGroup}
                        disabled={isJoining}
                        className={`rounded-lg bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-900/30 ${isJoining ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        {isJoining ? 'Joining...' : 'Join Group'}
                      </button>
                    )}

                    {isMember && memberData?.membership?.role === 'OWNER' && (
                      <Link
                        href={`/groups/${group.handle}/manage`}
                        className="ml-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors"
                      >
                        Manage Group
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Group tabs */}
              <div className="border-t border-gray-800/40 px-4 sm:px-6">
                <div className="flex overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('feed')}
                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                      activeTab === 'feed'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Feed
                  </button>
                  <button
                    onClick={() => setActiveTab('about')}
                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                      activeTab === 'about'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    About
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                      activeTab === 'members'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Members
                  </button>
                  {isMember && (memberData?.membership?.role === 'OWNER' || memberData?.membership?.role === 'ADMIN') && (
                    <button
                      onClick={() => setActiveTab('requests')}
                      className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                        activeTab === 'requests'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Requests
                    </button>
                  )}
                  {group.settings?.enableEvents && (
                    <button
                      onClick={() => setActiveTab('events')}
                      className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                        activeTab === 'events'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Events
                    </button>
                  )}
                  {group.settings?.enableDiscussions && (
                    <button
                      onClick={() => setActiveTab('discussions')}
                      className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                        activeTab === 'discussions'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Discussions
                    </button>
                  )}
                  {group.settings?.enableFiles && (
                    <button
                      onClick={() => setActiveTab('files')}
                      className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                        activeTab === 'files'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Files
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div className="space-y-4">
              {/* Feed tab */}
              {activeTab === 'feed' && (
                <>
                  {/* Create post box - only shown if user is a member */}
                  {isMember && (
                    <GroupPostForm
                      groupId={group.id}
                      onPostCreated={() => {
                        // Force refetch when a new post is created
                      }}
                    />
                  )}

                  {/* Join group message for non-members */}
                  {!isMember && (
                    <div className="mb-4 rounded-lg bg-gray-900 p-6 text-center shadow-md border border-gray-800/40">
                      <h2 className="text-lg font-semibold text-gray-100">Join this group to participate</h2>
                      <p className="mt-2 text-gray-400">
                        Join to see posts, comment, and interact with other members.
                      </p>
                      <button
                        onClick={handleJoinGroup}
                        disabled={isJoining}
                        className={`mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-2 font-medium text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-900/30 ${isJoining ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        {isJoining ? 'Joining...' : 'Join Group'}
                      </button>
                    </div>
                  )}

                  {/* Group posts list - uses tRPC to fetch posts */}
                  <GroupPostList groupId={group.id} />
                </>
              )}

              {/* Members tab */}
              {activeTab === 'members' && (
                <div className="bg-gray-900 rounded-lg border border-gray-800/40 p-4">
                  <h2 className="text-xl font-semibold text-gray-100 mb-4">Group Members</h2>
                  <GroupMembersList
                    groupId={group.id}
                    isCurrentUserAdmin={
                      memberData?.membership?.role === 'OWNER' ||
                      memberData?.membership?.role === 'ADMIN'
                    }
                  />
                </div>
              )}

              {/* Requests tab */}
              {activeTab === 'requests' && (
                <div className="bg-gray-900 rounded-lg border border-gray-800/40 p-4">
                  <h2 className="text-xl font-semibold text-gray-100 mb-4">Join Requests</h2>
                  <GroupJoinRequests groupId={group.id} />
                </div>
              )}

              {/* About tab */}
              {activeTab === 'about' && (
                <div className="overflow-hidden rounded-lg bg-gray-900 shadow-sm border border-gray-800/40">
                  <div className="p-4 sm:p-6">
                    <h2 className="mb-4 text-xl font-semibold text-gray-100">About</h2>

                    {group.description && (
                      <div className="mb-6">
                        <h3 className="mb-2 text-sm font-medium uppercase text-gray-500">Description</h3>
                        <p className="whitespace-pre-line text-gray-200">{group.description}</p>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="mb-2 text-sm font-medium uppercase text-gray-500">Group Type</h3>
                      <p className="flex items-center text-gray-200">
                        {group.privacy === 'PUBLIC' && (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5 text-green-400">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                            </svg>
                            Public · Anyone can see the group and its content
                          </>
                        )}
                        {group.privacy === 'PRIVATE' && (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5 text-amber-400">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V8.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L6.2 9.74a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clipRule="evenodd" />
                            </svg>
                            Private · Anyone can find the group, only members can see the content
                          </>
                        )}
                        {group.privacy === 'SECRET' && (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5 text-red-400">
                              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                            </svg>
                            Secret · Only members can find the group and see content
                          </>
                        )}
                      </p>
                    </div>

                    <div className="mb-6">
                      <h3 className="mb-2 text-sm font-medium uppercase text-gray-500">History</h3>
                      <div className="flex items-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5">
                          <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                        </svg>
                        Created on {new Date(group.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {group.rules && (
                      <div className="mb-6">
                        <h3 className="mb-2 text-sm font-medium uppercase text-gray-500">Group Rules</h3>
                        <div className="rounded-lg bg-gray-800/80 p-4 border border-gray-700/30">
                          <p className="whitespace-pre-line text-gray-200">{group.rules}</p>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="mb-2 text-sm font-medium uppercase text-gray-500">Activity</h3>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-lg bg-gray-800/60 p-3 text-center border border-gray-700/30">
                          <div className="text-lg font-semibold text-gray-100">{group._count?.members || 0}</div>
                          <div className="text-xs text-gray-400">Members</div>
                        </div>
                        <div className="rounded-lg bg-gray-800/60 p-3 text-center border border-gray-700/30">
                          <div className="text-lg font-semibold text-gray-100">{group._count?.posts || 0}</div>
                          <div className="text-xs text-gray-400">Posts</div>
                        </div>
                        <div className="rounded-lg bg-gray-800/60 p-3 text-center border border-gray-700/30">
                          <div className="text-lg font-semibold text-gray-100">{group._count?.discussions || 0}</div>
                          <div className="text-xs text-gray-400">Discussions</div>
                        </div>
                        <div className="rounded-lg bg-gray-800/60 p-3 text-center border border-gray-700/30">
                          <div className="text-lg font-semibold text-gray-100">{group._count?.events || 0}</div>
                          <div className="text-xs text-gray-400">Events</div>
                        </div>
                      </div>
                    </div>

                    {group.creator && (
                      <div className="border-t border-gray-800/40 pt-4">
                        <h3 className="mb-3 text-sm font-medium uppercase text-gray-500">Admin</h3>
                        <div className="flex items-center">
                          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-700/50">
                            {group.creator.image ? (
                              <Image
                                src={group.creator.image}
                                alt={group.creator.name || ''}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-indigo-700 text-sm font-bold text-white">
                                {(group.creator.name || 'A').charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <h4 className="font-medium text-gray-200">{group.creator.name}</h4>
                            <p className="text-sm text-gray-400">Group Creator</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other tabs - Coming soon placeholders */}
              {(activeTab === 'events' || activeTab === 'discussions' || activeTab === 'files') && (
                <div className="rounded-lg bg-gray-900 p-6 text-center shadow-sm border border-gray-800/40">
                  <h2 className="text-lg font-semibold text-gray-100">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h2>
                  <p className="mt-2 text-gray-400">
                    This feature is coming soon. We're working on it!
                  </p>
                </div>
              )}
            </div>
          </main>

          {/* Right sidebar - group members and activity */}
          <GroupRightSidebar
            group={group}
            isMember={isMember}
          />
        </div>
      )}

      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
}