"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';

interface GroupPostListProps {
  groupId: string;
  onlyAnnouncements?: boolean;
  topicId?: string;
}

export default function GroupPostList({ 
  groupId, 
  onlyAnnouncements = false,
  topicId
}: GroupPostListProps) {
  const { data: session } = useSession();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Get posts for the group
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage,
    refetch
  } = trpc.group.getGroupPosts.useInfiniteQuery(
    {
      groupId,
      onlyAnnouncements,
      topicId,
      limit: 5,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  );

  // Flatten posts from all pages
  const posts = data?.pages.flatMap((page) => page.posts) || [];

  // Handle load more
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasNextPage) return;
    
    setIsLoadingMore(true);
    await fetchNextPage();
    setIsLoadingMore(false);
  };

  // Handle reactions
  const addReaction = trpc.group.addReaction.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const handleReaction = (postId: string, type: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY') => {
    if (!session) return;
    
    addReaction.mutate({
      postId,
      type,
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
        <p className="text-red-200">Error loading posts: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-800/50 rounded-lg text-white hover:bg-red-800/70 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-lg bg-gray-900/70 p-6 text-center border border-gray-800/40">
        <p className="text-gray-300">
          {onlyAnnouncements 
            ? "No announcements have been posted yet." 
            : topicId 
              ? "No posts in this topic yet." 
              : "No posts in this group yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div 
          key={post.id} 
          className={`rounded-lg bg-gray-900 border ${
            post.isPinned 
              ? 'border-indigo-700/40 shadow-md shadow-indigo-900/10' 
              : post.isAnnouncement 
                ? 'border-amber-700/40 shadow-md shadow-amber-900/10' 
                : 'border-gray-800/30'
          } overflow-hidden`}
        >
          {/* Post header - author info and metadata */}
          <div className="p-4">
            <div className="flex items-start">
              <div className="mr-3 flex-shrink-0">
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  {post.user.image ? (
                    <Image
                      src={post.user.image}
                      alt={post.user.name || ''}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                      <span className="text-xs font-bold text-white">
                        {(post.user.name || 'U').charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-100">
                      {post.user.name}
                      {post.user.username && (
                        <span className="ml-1 text-gray-400 text-sm">@{post.user.username}</span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {new Date(post.createdAt).toLocaleString()}
                      
                      {post.status === 'PENDING' && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-900/30 text-amber-300 rounded-sm">
                          Pending Approval
                        </span>
                      )}
                      
                      {post.isPinned && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-indigo-900/30 text-indigo-300 rounded-sm">
                          Pinned
                        </span>
                      )}
                      
                      {post.isAnnouncement && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-900/30 text-amber-300 rounded-sm">
                          Announcement
                        </span>
                      )}
                      
                      {post.isEdited && (
                        <span className="ml-2 text-gray-500 text-xs">(edited)</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex space-x-1">
                    {/* Post actions menu - dots menu */}
                    <button className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Post content */}
                <div className="mt-2">
                  <p className="whitespace-pre-line text-gray-200">{post.content}</p>
                </div>
              </div>
            </div>
            
            {/* Post media */}
            {post.media && post.media.length > 0 && (
              <div className="mt-3">
                {post.media.length === 1 ? (
                  <div className="relative overflow-hidden rounded-lg">
                    <Image
                      src={post.media[0].url}
                      alt="Post media"
                      width={600}
                      height={400}
                      className="w-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className={`grid grid-cols-2 gap-1 ${post.media.length > 2 ? 'grid-rows-2' : ''}`}>
                    {post.media.slice(0, 4).map((media, index) => (
                      <div key={media.id} className="relative aspect-square overflow-hidden rounded-lg">
                        <Image
                          src={media.url}
                          alt={`Media ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {index === 3 && post.media.length > 4 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <span className="text-xl font-bold text-white">+{post.media.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Post stats and interactions */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <div className="flex space-x-4">
                <span>{post._count?.reactions || 0} reactions</span>
                <span>{post._count?.comments || 0} comments</span>
                <span>{post.viewCount || 0} views</span>
              </div>
              
              {post.status === 'PUBLISHED' && (
                <Link
                  href={`/groups/${post.groupId}/posts/${post.id}`}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  View details
                </Link>
              )}
            </div>
          </div>
          
          {/* Post actions - Like, Comment, Share */}
          {post.status === 'PUBLISHED' && (
            <div className="flex border-t border-gray-800/30 px-2">
              <button
                onClick={() => handleReaction(post.id, 'LIKE')}
                className="flex flex-1 items-center justify-center py-2 text-gray-400 hover:bg-gray-800/50 hover:text-indigo-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                Like
              </button>
              
              <Link
                href={`/groups/${post.groupId}/posts/${post.id}#comments`}
                className="flex flex-1 items-center justify-center py-2 text-gray-400 hover:bg-gray-800/50 hover:text-indigo-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
                Comment
              </Link>
              
              <button className="flex flex-1 items-center justify-center py-2 text-gray-400 hover:bg-gray-800/50 hover:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Share
              </button>
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