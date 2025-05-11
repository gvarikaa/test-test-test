"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { api } from '@/lib/trpc/api';
import { PostAnalysisDisplay } from './post-analysis-display';
import { MessageCircle, ThumbsUp, Share2, Clock, MoreHorizontal } from 'lucide-react';

interface PostViewProps {
  postId: string;
}

export default function PostView({ postId }: PostViewProps) {
  const [commentText, setCommentText] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Fetch post data using tRPC
  const { data: post, isLoading, error } = api.post.getById.useQuery({ id: postId });

  // Comment mutation
  const { mutate: addComment } = api.post.addComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      // Could refetch post data here if needed
    }
  });

  // Handle comment submission
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment({
      postId,
      content: commentText,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-500">
        Error loading post: {error?.message || 'Post not found'}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Post header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.user.id}`}>
            <Image
              src={post.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.name)}`}
              alt={post.user.name || 'User profile'}
              width={48}
              height={48}
              className="rounded-full"
            />
          </Link>
          
          <div>
            <Link 
              href={`/profile/${post.user.id}`}
              className="font-medium hover:underline"
            >
              {post.user.name}
            </Link>
            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <span>{format(new Date(post.createdAt), 'MMM d, yyyy • h:mm a')}</span>
              {post.visibility && (
                <span className="flex items-center gap-1">
                  • {post.visibility === 'PUBLIC' ? 'Public' : post.visibility === 'FRIENDS' ? 'Friends' : 'Private'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button className="p-2 rounded-full hover:bg-muted">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post content */}
      <div className="p-4">
        <div className="whitespace-pre-line mb-4">{post.content}</div>
        
        {post.media && post.media.length > 0 && (
          <div className={`grid ${post.media.length === 1 ? 'grid-cols-1' : post.media.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mb-4`}>
            {post.media.map((media) => (
              <div key={media.id} className="rounded-lg overflow-hidden">
                {media.type === 'IMAGE' && (
                  <Image
                    src={media.url}
                    alt="Post media"
                    width={500}
                    height={300}
                    className="w-full h-auto object-cover"
                  />
                )}
                {media.type === 'VIDEO' && (
                  <video 
                    src={media.url} 
                    controls 
                    poster={media.thumbnailUrl || undefined}
                    className="w-full h-auto"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-between text-sm text-muted-foreground pt-2 pb-1">
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4 text-primary" />
            <span>{post._count?.reactions || 0}</span>
          </div>
          <div className="flex gap-4">
            <span>{post._count?.comments || 0} comments</span>
            {post.aiAnalysis && (
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="text-primary hover:underline flex items-center gap-1"
              >
                {showAnalysis ? 'Hide AI Analysis' : 'Show AI Analysis'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* AI Analysis */}
      {showAnalysis && post.aiAnalysis && (
        <PostAnalysisDisplay analysis={post.aiAnalysis} />
      )}

      {/* Action buttons */}
      <div className="border-t border-b px-2 py-1">
        <div className="flex justify-between">
          <button className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-muted flex-1 justify-center">
            <ThumbsUp className="w-5 h-5" />
            <span>Like</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-muted flex-1 justify-center">
            <MessageCircle className="w-5 h-5" />
            <span>Comment</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-muted flex-1 justify-center">
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Comments section */}
      <div className="p-4">
        {/* Comment form */}
        <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
          <Image
            src="https://ui-avatars.com/api/?name=You"
            alt="Your profile"
            width={40}
            height={40}
            className="rounded-full w-10 h-10"
          />
          <div className="flex-1 flex items-center bg-muted rounded-full px-4">
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 bg-transparent py-2 outline-none"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="text-primary disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </form>

        {/* Comment list */}
        {post.comments && post.comments.length > 0 ? (
          <div className="space-y-4">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Image
                  src={comment.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}`}
                  alt={comment.user.name || 'User profile'}
                  width={40}
                  height={40}
                  className="rounded-full w-10 h-10"
                />
                <div className="flex-1">
                  <div className="bg-muted rounded-xl p-3">
                    <Link 
                      href={`/profile/${comment.user.id}`}
                      className="font-medium hover:underline"
                    >
                      {comment.user.name}
                    </Link>
                    <p className="mt-1">{comment.content}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1 px-2">
                    <button className="hover:text-primary">Like</button>
                    <button className="hover:text-primary">Reply</button>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            Be the first to comment on this post!
          </div>
        )}
      </div>
    </div>
  );
}