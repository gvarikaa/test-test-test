"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { trpc } from '@/lib/trpc/client';

interface ReelCommentDrawerProps {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddComment: () => void;
}

const ReelCommentDrawer: React.FC<ReelCommentDrawerProps> = ({
  reelId,
  isOpen,
  onClose,
  onAddComment,
}) => {
  const { data: session } = useSession();
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);
  
  const {
    data: comments,
    isLoading,
    refetch
  } = trpc.reel.getReelComments.useQuery(
    { reelId },
    { enabled: isOpen }
  );
  
  const addCommentMutation = trpc.reel.addReelComment.useMutation({
    onSuccess: () => {
      refetch();
      onAddComment();
    },
  });
  
  useEffect(() => {
    if (isOpen && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [isOpen]);
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || !session?.user) return;
    
    try {
      await addCommentMutation.mutateAsync({
        reelId,
        content: commentText.trim(),
      });
      
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };
  
  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 transform transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Comments</h3>
          <button
            className="p-1 rounded-full"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Comments list */}
        <div className="overflow-y-auto mb-4" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="loading-spinner"></div>
            </div>
          ) : comments && comments.length > 0 ? (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    {comment.user.image ? (
                      <Image
                        src={comment.user.image}
                        alt={comment.user.name || 'User'}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                        {(comment.user.name || comment.user.username || 'U').charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-baseline">
                      <span className="font-semibold mr-2">
                        {comment.user.username || comment.user.name || 'User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                      <button>Like</button>
                      <button>Reply</button>
                    </div>
                    
                    {/* Display child comments (replies) if they exist */}
                    {comment.replies && comment.replies.length > 0 && (
                      <ul className="mt-2 space-y-3 pl-6">
                        {comment.replies.map((reply) => (
                          <li key={reply.id} className="flex space-x-2">
                            <div className="flex-shrink-0">
                              {reply.user.image ? (
                                <Image
                                  src={reply.user.image}
                                  alt={reply.user.name || 'User'}
                                  width={24}
                                  height={24}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                                  {(reply.user.name || reply.user.username || 'U').charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-baseline">
                                <span className="font-semibold text-sm mr-1">
                                  {reply.user.username || reply.user.name || 'User'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm">{reply.content}</p>
                              <div className="flex space-x-3 mt-0.5 text-xs text-gray-500">
                                <button>Like</button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>
        
        {/* Comment input */}
        {session?.user ? (
          <form onSubmit={handleSubmitComment} className="flex items-center mt-2">
            <div className="flex-shrink-0 mr-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  {session.user.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <input
              ref={commentInputRef}
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-grow border rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className={`ml-2 px-4 py-2 rounded-full font-medium ${
                commentText.trim()
                  ? 'text-blue-500 hover:text-blue-600'
                  : 'text-blue-300 cursor-not-allowed'
              }`}
            >
              Post
            </button>
          </form>
        ) : (
          <div className="text-center py-2 text-gray-500 text-sm">
            Sign in to add a comment
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelCommentDrawer;