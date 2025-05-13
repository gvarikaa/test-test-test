"use client";

import { useState } from 'react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';

interface GroupJoinRequestsProps {
  groupId: string;
}

export default function GroupJoinRequests({ groupId }: GroupJoinRequestsProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Get join requests for the group
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage,
    refetch
  } = trpc.group.getJoinRequests.useInfiniteQuery(
    {
      groupId,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  );
  
  // Process join request mutation
  const processRequest = trpc.group.processJoinRequest.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // Flatten requests from all pages
  const requests = data?.pages.flatMap((page) => page.items) || [];

  // Handle load more
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasNextPage) return;
    
    setIsLoadingMore(true);
    await fetchNextPage();
    setIsLoadingMore(false);
  };

  // Handle approve/reject request
  const handleProcessRequest = (requestId: string, action: 'APPROVE' | 'REJECT') => {
    processRequest.mutate({
      requestId,
      action
    });
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
        <p className="text-red-200">Error loading join requests: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-800/50 rounded-lg text-white hover:bg-red-800/70 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg bg-gray-900/70 p-6 text-center border border-gray-800/40">
        <p className="text-gray-300">No pending join requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-100">Pending Join Requests</h3>
      
      {requests.map((request) => (
        <div 
          key={request.id} 
          className="rounded-lg bg-gray-900/70 border border-gray-800/30 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 flex-shrink-0">
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  {request.user.image ? (
                    <Image
                      src={request.user.image}
                      alt={request.user.name || ''}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                      <span className="text-xs font-bold text-white">
                        {(request.user.name || 'U').charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-100">{request.user.name}</h4>
                {request.user.username && (
                  <p className="text-sm text-gray-400">@{request.user.username}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Requested {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleProcessRequest(request.id, 'APPROVE')}
                disabled={processRequest.isLoading}
                className={`rounded-lg bg-green-800/30 px-3 py-1.5 text-xs font-medium text-green-300 hover:bg-green-800/50 border border-green-800/30 ${
                  processRequest.isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                Approve
              </button>
              
              <button
                onClick={() => handleProcessRequest(request.id, 'REJECT')}
                disabled={processRequest.isLoading}
                className={`rounded-lg bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50 border border-red-800/30 ${
                  processRequest.isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                Reject
              </button>
            </div>
          </div>
          
          {request.message && (
            <div className="mt-2 pl-12">
              <div className="rounded-lg bg-gray-800/40 p-2 text-sm text-gray-300 border border-gray-700/30">
                {request.message}
              </div>
            </div>
          )}
        </div>
      ))}
      
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
    </div>
  );
}