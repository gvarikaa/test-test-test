"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type GroupRightSidebarProps = {
  group: {
    id: string;
    name: string;
    handle: string;
    privacy: string;
    _count?: {
      members?: number;
    };
  };
  isMember?: boolean;
};

export default function GroupRightSidebar({
  group,
  isMember = false
}: GroupRightSidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Fetch admins (OWNER and ADMIN roles)
  const { data: adminsData } = trpc.group.getMembers.useQuery({
    groupId: group.id,
    limit: 5,
    role: 'OWNER'
  }, {
    enabled: !!group.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: adminData } = trpc.group.getMembers.useQuery({
    groupId: group.id,
    limit: 5,
    role: 'ADMIN'
  }, {
    enabled: !!group.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch moderators
  const { data: moderatorsData } = trpc.group.getMembers.useQuery({
    groupId: group.id,
    limit: 5,
    role: 'MODERATOR'
  }, {
    enabled: !!group.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch regular members
  const { data: membersData } = trpc.group.getMembers.useQuery({
    groupId: group.id,
    limit: 8,
    role: 'MEMBER'
  }, {
    enabled: !!group.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Join group mutation
  const joinGroup = trpc.group.join.useMutation({
    onSuccess: () => {
      router.refresh();
    }
  });

  const handleJoinGroup = () => {
    if (group.id) {
      joinGroup.mutate({ groupId: group.id });
    }
  };

  // Combine admins and moderators for leadership section
  const owners = adminsData?.items || [];
  const admins = adminData?.items || [];
  const moderators = moderatorsData?.items || [];
  const members = membersData?.items || [];

  const leadership = [...owners, ...admins];
  const regularMembers = [...moderators, ...members];

  const hasLeadership = leadership.length > 0;
  const hasMembers = regularMembers.length > 0;

  return (
    <aside className="sidebar sticky top-14 right-0 h-[calc(100vh-3.5rem)] w-[280px] overflow-y-auto py-3 px-2 no-scrollbar bg-gray-950 backdrop-blur-sm">
      {/* Background subtle glow effects */}
      <div className="fixed top-0 right-0 w-40 h-40 bg-purple-600/5 blur-3xl rounded-full"></div>
      <div className="fixed top-60 right-20 w-60 h-60 bg-indigo-600/5 blur-3xl rounded-full"></div>

      <div className="relative z-10">
        {isMember ? (
          <>
            {/* Group quick actions for members */}
            <div className="mb-5 px-2">
              <div className="rounded-xl bg-gray-900/70 p-4 border border-gray-800/40 shadow-md">
                <h3 className="mb-3 text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <div className="p-1 rounded-full bg-indigo-900/50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-indigo-300">
                      <path d="M10 3.75a2 2 0 10-4 0 2 2 0 004 0zM17.25 4.5a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM5 3.75a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 17a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM17.25 17a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM9 10a.75.75 0 01-.75.75h-5.5a.75.75 0 010-1.5h5.5A.75.75 0 019 10zM17.25 10.75a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM14 10a2 2 0 10-4 0 2 2 0 004 0zM10 16.25a2 2 0 10-4 0 2 2 0 004 0z" />
                    </svg>
                  </div>
                  Group Tools
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button className="flex flex-col items-center justify-center gap-1 rounded-lg bg-gray-800/60 p-2 hover:bg-gray-800 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-white">
                        <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 015 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914z" />
                        <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935.214.013.428.024.642.034.2.009.385.09.518.224l2.35 2.35a.75.75 0 001.28-.531v-2.07c1.453-.195 2.5-1.463 2.5-2.915V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0014 6z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-300">Chat</span>
                  </button>

                  <button className="flex flex-col items-center justify-center gap-1 rounded-lg bg-gray-800/60 p-2 hover:bg-gray-800 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-white">
                        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-300">Invite</span>
                  </button>

                  <button className="flex flex-col items-center justify-center gap-1 rounded-lg bg-gray-800/60 p-2 hover:bg-gray-800 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-white">
                        <path d="M10 2a.75.75 0 01.75.75v5.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0L6.2 7.26a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2z" />
                        <path d="M5.273 4.5a1.25 1.25 0 00-1.205.918l-1.523 5.52c-.006.02-.01.041-.015.062H6a1 1 0 01.894.553l.448.894a1 1 0 00.894.553h3.438a1 1 0 00.86-.49l.606-1.02A1 1 0 0114 11h3.47a1.318 1.318 0 00-.015-.062l-1.523-5.52a1.25 1.25 0 00-1.205-.918h-.977a.75.75 0 010-1.5h.977a2.75 2.75 0 012.651 2.019l1.523 5.52c.066.239.099.485.099.732V15a2 2 0 01-2 2H3a2 2 0 01-2-2v-3.73c0-.246.033-.492.099-.73l1.523-5.521A2.75 2.75 0 015.273 3h.977a.75.75 0 010 1.5h-.977z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-300">Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Upcoming events */}
            <div className="mb-5 px-2">
              <div className="rounded-xl bg-gray-900/70 p-4 border border-gray-800/40 shadow-md">
                <div className="mb-3 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <div className="p-1 rounded-full bg-indigo-900/50">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-indigo-300">
                        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                      </svg>
                    </div>
                    Upcoming Event
                  </h3>
                  <Link href={`/groups/${group.handle}/events`} className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
                </div>

                <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700/30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600/90 to-purple-700/90 rounded-lg shadow-md shadow-indigo-900/20">
                      <span className="text-xs font-medium text-indigo-200">JUL</span>
                      <span className="text-lg font-bold text-white">15</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-200">Monthly Meetup</h4>
                      <p className="text-xs text-gray-400 mt-1">6:00 PM • Online</p>
                      <div className="mt-2 flex items-center text-xs text-gray-400">
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 size-3.5 text-indigo-400">
                            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                          </svg>
                          12 attending
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Non-member view
          <div className="mb-5 px-2">
            <div className="rounded-xl bg-gray-900/70 p-4 border border-gray-800/40 shadow-md text-center">
              <h3 className="text-base font-semibold text-white mb-2">Join This Group</h3>
              <p className="text-sm text-gray-300 mb-3">Connect with {group._count?.members} members and participate in discussions.</p>
              <button
                onClick={handleJoinGroup}
                disabled={joinGroup.isLoading}
                className={`w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-700 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-md shadow-indigo-900/30 ${
                  joinGroup.isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {joinGroup.isLoading ? 'Joining...' : 'Join Group'}
              </button>
            </div>
          </div>
        )}

        {/* Group leadership */}
        {hasLeadership && (
          <div className="mb-4">
            <h3 className="flex justify-between items-center px-4 mb-2 text-xs font-medium uppercase text-gray-500">
              <span>Group Leadership</span>
              {leadership.length > 3 && (
                <button
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showAllMembers ? 'Show less' : 'See all'}
                </button>
              )}
            </h3>

            <ul className="space-y-0.5">
              {leadership.slice(0, showAllMembers ? leadership.length : 3).map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/profile/${member.user.id}`}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800/40 transition-colors group"
                  >
                    <div className="relative">
                      <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-700/30">
                        {member.user.image ? (
                          <Image
                            src={member.user.image}
                            alt={member.user.name || ''}
                            width={32}
                            height={32}
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                            <span className="text-xs font-bold text-white">
                              {(member.user.name || 'U').charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                        {member.user.name}
                      </p>
                      <p className="truncate text-xs text-indigo-400">
                        {member.role === 'OWNER' ? 'Owner' : 'Administrator'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Regular members */}
        {hasMembers && (
          <div className="mb-4">
            <h3 className="flex justify-between items-center px-4 mb-2 text-xs font-medium uppercase text-gray-500">
              <span>Members</span>
              {regularMembers.length > 4 && (
                <button
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showAllMembers ? 'Show less' : 'See all'}
                </button>
              )}
            </h3>

            <ul className="space-y-0.5">
              {regularMembers.slice(0, showAllMembers ? regularMembers.length : 4).map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/profile/${member.user.id}`}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800/40 transition-colors group"
                  >
                    <div className="relative">
                      <div className="h-8 w-8 overflow-hidden rounded-full">
                        {member.user.image ? (
                          <Image
                            src={member.user.image}
                            alt={member.user.name || ''}
                            width={32}
                            height={32}
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                            <span className="text-xs font-bold text-white">
                              {(member.user.name || 'U').charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                        {member.user.name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {member.role === 'MODERATOR' ? 'Moderator' : 'Member'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* View all members button */}
        <div className="px-4 mt-4">
          <Link
            href={`/groups/${group.handle}/members`}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gray-800/60 border border-gray-700/40 py-2 px-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 011.33-3.686c.032-.027.064-.053.098-.078a5.99 5.99 0 012.31-1.03.75.75 0 01.372 1.455c-.64.164-1.189.45-1.6.766a1.5 1.5 0 00-.666 1.11 1.5 1.5 0 01-1.486 1.905zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
            </svg>
            View all {group._count?.members || 0} members
          </Link>
        </div>

        {/* Admin access - Join requests */}
        {isMember && (leadership.length > 0 && (
          leadership[0].user.id === session?.user?.id ||
          leadership.some(member => member.role === 'ADMIN' && member.user.id === session?.user?.id)
        )) && (
          <div className="px-4 mt-2">
            <Link
              href={`/groups/${group.handle}/requests`}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-indigo-800/30 border border-indigo-700/30 py-2 px-3 text-sm text-indigo-300 hover:bg-indigo-800/40 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Review Join Requests
            </Link>
          </div>
        )}
        
        {/* Group privacy info */}
        <div className="mt-6 px-4">
          <div className="rounded-lg bg-gray-900/40 p-3 border border-gray-800/30">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800">
                {group.privacy === 'PUBLIC' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-green-400">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-amber-400">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300 capitalize">{group.privacy.toLowerCase()} Group</h4>
                <p className="mt-1 text-xs text-gray-400">
                  {group.privacy === 'PUBLIC' 
                    ? 'Anyone can see who\'s in the group and what they post.' 
                    : 'Only members can see who\'s in the group and what they post.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 px-4 text-xs text-gray-500">
          <p className="mb-1">
            <Link href="#" className="hover:text-gray-400 transition-colors duration-200">Report Group</Link>
          </p>
        </div>
      </div>
    </aside>
  );
}