"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';

export default function InviteToEventPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const eventId = params.id;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: event } = trpc.event.getById.useQuery(
    { id: eventId },
    {
      enabled: !!eventId,
      refetchOnWindowFocus: false,
    }
  );
  
  const { data: users, isLoading: isLoadingUsers } = trpc.user.getAll.useQuery(undefined, {
    enabled: !!session?.user,
  });
  
  const inviteUsersMutation = trpc.event.inviteUsers.useMutation({
    onSuccess: (data) => {
      setSuccess(`Successfully invited ${data.invitedCount} user(s) to the event.`);
      setSelectedUsers(new Set());
      setIsSubmitting(false);
    },
    onError: (err) => {
      setError(err.message || 'Failed to invite users');
      setIsSubmitting(false);
    },
  });
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  // Check if user is the creator of the event
  useEffect(() => {
    if (event && session?.user && event.creatorId !== session.user.id) {
      router.push(`/events/${eventId}`);
    }
  }, [event, session, router, eventId]);
  
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };
  
  const handleInvite = () => {
    if (selectedUsers.size === 0) {
      setError('Please select at least one user to invite');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    inviteUsersMutation.mutate({
      eventId,
      userIds: Array.from(selectedUsers),
    });
  };
  
  // Filter users based on search query and exclude already invited users
  const filteredUsers = users
    ? users.filter(
        (user) => 
          // Exclude current user
          user.id !== session?.user?.id &&
          // Exclude already invited users
          !event?.participants.some((p) => p.userId === user.id) &&
          // Match search query
          (searchQuery.trim() === '' ||
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];
  
  if (status === 'loading' || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invite People</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
          <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        </div>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invite People</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Please sign in to invite people
          </h2>
          <Link
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-md"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invite People</h1>
        <Link
          href={`/events/${eventId}`}
          className="text-accent-blue hover:underline"
        >
          Back to Event
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">
          Invite people to: <span className="font-bold">{event.title}</span>
        </h2>
        
        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Search input */}
        <div className="mb-6">
          <label htmlFor="search" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Search Users
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        {/* User selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Select Users
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedUsers.size} selected
            </div>
          </div>
          
          {isLoadingUsers ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 mr-3"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No users found matching your search' : 'No users available to invite'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center p-3 border rounded-md cursor-pointer ${
                    selectedUsers.has(user.id)
                      ? 'border-accent-blue bg-accent-blue/5 dark:bg-accent-blue/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => toggleUserSelection(user.id)}
                >
                  <div className="flex items-center flex-1">
                    <Image
                      src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}`}
                      width={40}
                      height={40}
                      alt={user.name || 'User'}
                      className="rounded-full mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.name || user.username || 'User'}
                      </div>
                      {user.username && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedUsers.has(user.id)
                          ? 'border-accent-blue bg-accent-blue text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selectedUsers.has(user.id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-3">
          <Link
            href={`/events/${eventId}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium dark:border-gray-600 dark:text-gray-300"
          >
            Cancel
          </Link>
          <button
            onClick={handleInvite}
            disabled={selectedUsers.size === 0 || isSubmitting}
            className="px-4 py-2 bg-accent-blue text-white rounded-md font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Sending Invites...' : 'Invite Selected Users'}
          </button>
        </div>
      </div>
    </div>
  );
}