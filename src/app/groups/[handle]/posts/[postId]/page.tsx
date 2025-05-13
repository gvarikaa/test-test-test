"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import FacebookHeader from '../../../../components/layouts/FacebookHeader';
import MobileNavigation from '../../../../components/layouts/MobileNavigation';

export default function GroupPostPage() {
  const router = useRouter();
  const params = useParams<{ handle: string; postId: string }>();
  const { data: session } = useSession();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeReplyTo, setActiveReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Fetch post details
  const { data: post, isLoading: postLoading, error: postError, refetch: refetchPost } = 
    trpc.group.getGroupPost.useQuery(
      { postId: params.postId as string },
      { enabled: !!params.postId }
    );

  // Fetch comments for the post
  const { 
    data: commentsData, 
    isLoading: commentsLoading, 
    error: commentsError,
    refetch: refetchComments,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments
  } = trpc.group.getPostComments.useInfiniteQuery(
    { 
      postId: params.postId as string,
      limit: 10
    },
    {
      enabled: !!params.postId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Add comment mutation
  const addComment = trpc.group.addComment.useMutation({
    onSuccess: () => {
      setComment('');
      setIsSubmitting(false);
      refetchComments();
      refetchPost();
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      setIsSubmitting(false);
    }
  });

  // Add reply mutation (also uses addComment)
  const addReply = trpc.group.addComment.useMutation({
    onSuccess: () => {
      setReplyText('');
      setActiveReplyTo(null);
      setIsSubmitting(false);
      refetchComments();
      refetchPost();
    },
    onError: (error) => {
      console.error('Error adding reply:', error);
      setIsSubmitting(false);
    }
  });

  // Reaction mutation
  const addReaction = trpc.group.addReaction.useMutation({
    onSuccess: () => {
      refetchPost();
    }
  });

  // Handler for adding a comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !comment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    addComment.mutate({
      postId: params.postId as string,
      content: comment.trim()
    });
  };

  // Handler for adding a reply
  const handleAddReply = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!session || !replyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    addReply.mutate({
      postId: params.postId as string,
      content: replyText.trim(),
      parentId
    });
  };

  // Handler for adding a reaction
  const handleReaction = (type: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY') => {
    if (!session) return;
    
    addReaction.mutate({
      postId: params.postId,
      type
    });
  };

  // If post is loading
  if (postLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <FacebookHeader />
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  // If post not found or error
  if (postError || !post) {
    return (
      <div className="min-h-screen bg-gray-950">
        <FacebookHeader />
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-lg bg-gray-900 p-6 text-center border border-gray-800/40">
            <h1 className="text-xl font-semibold text-gray-100 mb-2">Post Not Found</h1>
            <p className="text-gray-400 mb-4">
              {postError?.message || "This post doesn't exist or has been removed."}
            </p>
            <Link
              href={`/groups/${params.handle}`}
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-md"
            >
              Back to Group
            </Link>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  // Flatten comments from all pages
  const comments = commentsData?.pages.flatMap((page) => page.comments) || [];

  return (
    <div className="min-h-screen bg-gray-950">
      <FacebookHeader />
      
      <div className="container mx-auto max-w-2xl px-4 py-6">
        {/* Breadcrumb navigation */}
        <div className="mb-4 flex items-center text-sm text-gray-400">
          <Link 
            href="/groups" 
            className="hover:text-gray-200 transition-colors"
          >
            Groups
          </Link>
          <span className="mx-2">/</span>
          <Link 
            href={`/groups/${params.handle}`} 
            className="hover:text-gray-200 transition-colors"
          >
            {post.group.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">Post</span>
        </div>
        
        {/* Post card */}
        <div className="rounded-lg bg-gray-900 border border-gray-800/30 overflow-hidden mb-6">
          {/* Post header */}
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
                </div>
                
                {/* Post content */}
                <div className="mt-3">
                  <p className="whitespace-pre-line text-gray-200">{post.content}</p>
                </div>
              </div>
            </div>
            
            {/* Post media */}
            {post.media && post.media.length > 0 && (
              <div className="mt-4">
                {post.media.length === 1 ? (
                  <div className="relative overflow-hidden rounded-lg">
                    <Image
                      src={post.media[0].url}
                      alt="Post media"
                      width={800}
                      height={600}
                      className="w-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className={`grid grid-cols-2 gap-2 ${post.media.length > 2 ? 'grid-rows-2' : ''}`}>
                    {post.media.map((media, index) => (
                      <div key={media.id} className="relative aspect-square overflow-hidden rounded-lg">
                        <Image
                          src={media.url}
                          alt={`Media ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Post stats */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-800/30 pt-3">
              <div className="flex space-x-4">
                <span>{post._count?.reactions || 0} reactions</span>
                <span>{post._count?.comments || 0} comments</span>
                <span>{post.viewCount || 0} views</span>
              </div>
              
              <Link
                href={`/groups/${params.handle}`}
                className="text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                Back to Group
              </Link>
            </div>
          </div>
          
          {/* Post actions */}
          <div className="flex border-t border-gray-800/30 px-2">
            <button
              onClick={() => handleReaction('LIKE')}
              className="flex flex-1 items-center justify-center py-2 text-gray-400 hover:bg-gray-800/50 hover:text-indigo-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              Like
            </button>
            
            <button
              onClick={() => document.getElementById('comment-input')?.focus()}
              className="flex flex-1 items-center justify-center py-2 text-gray-400 hover:bg-gray-800/50 hover:text-indigo-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
              Comment
            </button>
            
            <button className="flex flex-1 items-center justify-center py-2 text-gray-400 hover:bg-gray-800/50 hover:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              Share
            </button>
          </div>
        </div>
        
        {/* Comments section */}
        <div className="rounded-lg bg-gray-900 border border-gray-800/30 overflow-hidden">
          <div className="p-4 border-b border-gray-800/30">
            <h2 className="text-lg font-semibold text-gray-100">
              Comments ({post._count?.comments || 0})
            </h2>
          </div>
          
          {/* Add comment form */}
          {session ? (
            <div className="p-4 border-b border-gray-800/30">
              <form onSubmit={handleAddComment} className="flex">
                <div className="mr-3 flex-shrink-0">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full">
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'Your profile'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                        <span className="text-xs font-bold text-white">
                          {(session.user?.name?.[0] || 'U').toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-grow">
                  <textarea
                    id="comment-input"
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[60px] w-full rounded-lg bg-gray-800/70 px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-gray-700/30"
                    rows={2}
                  />
                  
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!comment.trim() || isSubmitting}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 border-b border-gray-800/30 text-center">
              <p className="text-gray-400">
                <Link 
                  href="/auth/signin" 
                  className="text-indigo-400 hover:underline"
                >
                  Sign in
                </Link> to post a comment.
              </p>
            </div>
          )}
          
          {/* Comments list */}
          <div className="divide-y divide-gray-800/30">
            {commentsLoading ? (
              <div className="p-4 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-400">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <>
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4">
                    <div className="flex">
                      <div className="mr-3 flex-shrink-0">
                        <div className="relative h-8 w-8 overflow-hidden rounded-full">
                          {comment.user.image ? (
                            <Image
                              src={comment.user.image}
                              alt={comment.user.name || ''}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                              <span className="text-xs font-bold text-white">
                                {(comment.user.name || 'U').charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="rounded-lg bg-gray-800/60 px-3 py-2 border border-gray-700/30">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-200">{comment.user.name}</h4>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.createdAt).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-300">{comment.content}</p>
                        </div>
                        
                        <div className="mt-1 flex items-center gap-3 pl-3">
                          <button 
                            onClick={() => handleReaction('LIKE')}
                            className="text-xs text-gray-400 hover:text-indigo-400"
                          >
                            Like
                          </button>
                          <button 
                            onClick={() => {
                              if (activeReplyTo === comment.id) {
                                setActiveReplyTo(null);
                              } else {
                                setActiveReplyTo(comment.id);
                                setReplyText('');
                              }
                            }}
                            className="text-xs text-gray-400 hover:text-indigo-400"
                          >
                            Reply
                          </button>
                          <span className="text-xs text-gray-500">
                            {comment._count?.reactions || 0} likes
                          </span>
                        </div>
                        
                        {/* Reply form */}
                        {activeReplyTo === comment.id && (
                          <div className="mt-2 pl-3">
                            <form onSubmit={(e) => handleAddReply(e, comment.id)} className="flex">
                              <div className="mr-2 flex-shrink-0 hidden sm:block">
                                <div className="relative h-6 w-6 overflow-hidden rounded-full">
                                  {session?.user?.image ? (
                                    <Image
                                      src={session.user.image}
                                      alt={session.user.name || ''}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                                      <span className="text-xs font-bold text-white">
                                        {(session?.user?.name || 'U').charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-grow">
                                <textarea
                                  placeholder={`Reply to ${comment.user.name}...`}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[40px] w-full rounded-lg bg-gray-800/70 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-gray-700/30"
                                  rows={1}
                                />
                                
                                <div className="mt-1 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveReplyTo(null)}
                                    className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={!replyText.trim() || isSubmitting}
                                    className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </form>
                          </div>
                        )}
                        
                        {/* Replies count button */}
                        {comment._count?.replies && comment._count.replies > 0 && (
                          <button 
                            className="mt-2 pl-3 text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                            // In a full implementation, this would fetch and show replies
                          >
                            View {comment._count.replies} {comment._count.replies === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load more comments */}
                {hasMoreComments && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => fetchMoreComments()}
                      className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                    >
                      Load More Comments
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      <MobileNavigation />
    </div>
  );
}