"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';

interface GroupMembersListProps {
  groupId: string;
  role?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  isCurrentUserAdmin?: boolean;
}

export default function GroupMembersList({ 
  groupId, 
  role,
  isCurrentUserAdmin = false 
}: GroupMembersListProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newRole, setNewRole] = useState<'ADMIN' | 'MODERATOR' | 'MEMBER'>('MEMBER');
  
  // Get members for the group
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage,
    refetch
  } = trpc.group.getMembers.useInfiniteQuery(
    {
      groupId,
      role,
      query: searchQuery.length > 2 ? searchQuery : undefined,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  );

  // Update member role mutation
  const updateRole = trpc.group.updateMemberRole.useMutation({
    onSuccess: () => {
      setShowRoleModal(false);
      setSelectedMember(null);
      refetch();
    }
  });

  // Remove member mutation
  const removeMember = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // Flatten members from all pages
  const members = data?.pages.flatMap((page) => page.items) || [];

  // Handle load more
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasNextPage) return;
    
    setIsLoadingMore(true);
    await fetchNextPage();
    setIsLoadingMore(false);
  };

  // Handle update role
  const handleUpdateRole = () => {
    if (!selectedMember || !newRole) return;
    
    updateRole.mutate({
      groupId,
      userId: selectedMember.user.id,
      role: newRole
    });
  };

  // Handle remove member
  const handleRemoveMember = (userId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      removeMember.mutate({
        groupId,
        userId
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-center border border-red-800/30">
        <p className="text-red-200">Error loading members: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-800/50 rounded-lg text-white hover:bg-red-800/70 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filter */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg bg-gray-800/70 px-4 py-2 pl-10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-gray-700/30"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="rounded-lg bg-gray-900/70 p-6 text-center border border-gray-800/40">
          <p className="text-gray-300">
            {searchQuery.length > 2
              ? `No members found matching "${searchQuery}"`
              : role
                ? `No ${role.toLowerCase()} members found in this group.`
                : "No members found in this group."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div 
              key={member.id} 
              className="rounded-lg bg-gray-900/70 border border-gray-800/30 p-3 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="mr-3 flex-shrink-0">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    {member.user.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.user.name || ''}
                        fill
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
                
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-100">{member.user.name}</h3>
                    
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      member.role === 'OWNER'
                        ? 'bg-purple-900/30 text-purple-300 border border-purple-800/30'
                        : member.role === 'ADMIN'
                          ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-800/30'
                          : member.role === 'MODERATOR'
                            ? 'bg-blue-900/30 text-blue-300 border border-blue-800/30'
                            : 'bg-gray-800/50 text-gray-300 border border-gray-700/30'
                    }`}>
                      {member.role}
                    </span>
                    
                    {member.user.id === session?.user?.id && (
                      <span className="text-xs bg-gray-800/50 px-2 py-0.5 rounded-full text-gray-300 border border-gray-700/30">
                        You
                      </span>
                    )}
                  </div>
                  
                  {member.user.username && (
                    <p className="text-sm text-gray-400">@{member.user.username}</p>
                  )}
                </div>
              </div>
              
              {/* Admin actions */}
              {isCurrentUserAdmin && member.role !== 'OWNER' && member.user.id !== session?.user?.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setNewRole(member.role === 'ADMIN' ? 'ADMIN' : member.role === 'MODERATOR' ? 'MODERATOR' : 'MEMBER');
                      setShowRoleModal(true);
                    }}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Change Role
                  </button>
                  
                  <button
                    onClick={() => handleRemoveMember(member.user.id)}
                    className="rounded-lg bg-red-900/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Load more button */}
      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className={`px-4 py-2 bg-indigo-700/50 hover:bg-indigo-700/60 rounded-lg text-white text-sm transition-colors ${
              isLoadingMore ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoadingMore ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                Loading...
              </div>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
      
      {/* Role change modal */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 border border-gray-800/40">
            <h3 className="mb-4 text-lg font-semibold text-gray-100">Change Member Role</h3>
            
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex-shrink-0">
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  {selectedMember.user.image ? (
                    <Image
                      src={selectedMember.user.image}
                      alt={selectedMember.user.name || ''}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                      <span className="text-xs font-bold text-white">
                        {(selectedMember.user.name || 'U').charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-100">{selectedMember.user.name}</h4>
                {selectedMember.user.username && (
                  <p className="text-sm text-gray-400">@{selectedMember.user.username}</p>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-300">Select New Role</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={newRole === 'ADMIN'}
                    onChange={() => setNewRole('ADMIN')}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/50"
                  />
                  <span className="text-gray-200">Admin</span>
                  <span className="text-xs text-gray-400">(Can manage group settings and members)</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="MODERATOR"
                    checked={newRole === 'MODERATOR'}
                    onChange={() => setNewRole('MODERATOR')}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/50"
                  />
                  <span className="text-gray-200">Moderator</span>
                  <span className="text-xs text-gray-400">(Can moderate content and members)</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="MEMBER"
                    checked={newRole === 'MEMBER'}
                    onChange={() => setNewRole('MEMBER')}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/50"
                  />
                  <span className="text-gray-200">Member</span>
                  <span className="text-xs text-gray-400">(Regular member)</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedMember(null);
                }}
                className="rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              >
                Cancel
              </button>
              
              <button
                onClick={handleUpdateRole}
                disabled={updateRole.isLoading}
                className={`rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 ${
                  updateRole.isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {updateRole.isLoading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}