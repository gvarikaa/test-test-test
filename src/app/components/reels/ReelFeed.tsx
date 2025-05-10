"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ReelPlayer from './ReelPlayer';
import ReelCommentDrawer from './ReelCommentDrawer';
import { trpc } from '@/lib/trpc/client';

interface ReelFeedProps {
  initialReels?: any[];
}

const ReelFeed: React.FC<ReelFeedProps> = ({ initialReels = [] }) => {
  const { data: session } = useSession();
  const [reels, setReels] = useState(initialReels);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  
  const { data: fetchedReelsData, isLoading, error } = trpc.reel.getReels.useQuery(
    { limit: 10 },
    {
      enabled: reels.length === 0,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false, // Don't retry on error to prevent spamming failed requests
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
    }
  );
  
  const likeMutation = trpc.reel.likeReel.useMutation();
  const shareMutation = trpc.reel.shareReel.useMutation();
  const followMutation = trpc.user.followUser.useMutation();
  
  useEffect(() => {
    if (fetchedReelsData?.reels && fetchedReelsData.reels.length > 0 && reels.length === 0) {
      setReels(fetchedReelsData.reels);
    }
  }, [fetchedReelsData, reels.length]);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollTop;
    const itemHeight = container.clientHeight;
    const index = Math.round(scrollPosition / itemHeight);
    setCurrentIndex(index);
  };
  
  const handleLike = async (reelId: string) => {
    if (!session?.user) return;
    
    try {
      await likeMutation.mutateAsync({ reelId });
      
      // Update local state
      setReels(prevReels => 
        prevReels.map(reel => {
          if (reel.id === reelId) {
            const isLiked = !reel.isLikedByUser;
            return {
              ...reel,
              isLikedByUser: isLiked,
              likeCount: isLiked ? reel.likeCount + 1 : reel.likeCount - 1
            };
          }
          return reel;
        })
      );
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };
  
  const handleComment = (reelId: string) => {
    setSelectedReelId(reelId);
    setCommentDrawerOpen(true);
  };
  
  const handleShare = async (reelId: string) => {
    if (!session?.user) return;
    
    try {
      await shareMutation.mutateAsync({ 
        reelId, 
        platform: 'INTERNAL' 
      });
      
      // Update local state
      setReels(prevReels => 
        prevReels.map(reel => {
          if (reel.id === reelId) {
            return {
              ...reel,
              shareCount: reel.shareCount + 1
            };
          }
          return reel;
        })
      );
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  };
  
  const handleFollow = async (userId: string) => {
    if (!session?.user) return;
    
    try {
      await followMutation.mutateAsync({ userId });
      // Could update UI to show followed status
    } catch (error) {
      console.error('Error following user:', error);
    }
  };
  
  const handleUserClick = (userId: string) => {
    // Navigate to user profile
    window.location.href = `/profile/${userId}`;
  };
  
  const handleAddComment = (reelId: string) => {
    // Update comment count locally
    setReels(prevReels => 
      prevReels.map(reel => {
        if (reel.id === reelId) {
          return {
            ...reel,
            commentCount: reel.commentCount + 1
          };
        }
        return reel;
      })
    );
  };
  
  if (isLoading && reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (reels.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <p className="text-xl mb-4">No reels available</p>
        <p className="text-sm text-gray-400">Check back later for new content</p>
        {error && (
          <p className="text-sm text-red-400 mt-2">Error: {error.message}</p>
        )}
      </div>
    );
  }
  
  return (
    <div className="relative h-screen bg-black">
      <div 
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        onScroll={handleScroll}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="w-full h-screen snap-start">
            <ReelPlayer
              reel={reel}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onFollow={handleFollow}
              onUserClick={handleUserClick}
              isActive={index === currentIndex}
              currentUser={session?.user}
            />
          </div>
        ))}
      </div>
      
      {commentDrawerOpen && selectedReelId && (
        <ReelCommentDrawer
          reelId={selectedReelId}
          isOpen={commentDrawerOpen}
          onClose={() => setCommentDrawerOpen(false)}
          onAddComment={() => handleAddComment(selectedReelId)}
        />
      )}
    </div>
  );
};

export default ReelFeed;