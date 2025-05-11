"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ReelPlayer from './ReelPlayer';
import ReelCommentDrawer from './ReelCommentDrawer';
import ReelRecommendationTag from './ReelRecommendationTag';
import { trpc } from '@/lib/trpc/client';

interface RecommendedReelFeedProps {
  initialReels?: any[];
}

const RecommendedReelFeed: React.FC<RecommendedReelFeedProps> = ({ initialReels = [] }) => {
  const { data: session } = useSession();
  const [reels, setReels] = useState(initialReels);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'foryou' | 'following' | 'trending'>('foryou');
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewLogs, setViewLogs] = useState<Record<string, { 
    startTime: number, 
    logged: boolean,
    watchDuration?: number,
    completionRate?: number
  }>>({});
  
  // Get recommended reels
  const { 
    data: recommendedReelsData, 
    isLoading: isLoadingRecommended,
    error: recommendedError,
    fetchNextPage: fetchNextRecommended,
    isFetchingNextPage: isFetchingNextRecommended,
    hasNextPage: hasNextRecommended
  } = trpc.reel.getRecommendedReels.useInfiniteQuery(
    {
      limit: 10,
      includeFollowing: feedMode === 'foryou' || feedMode === 'following',
      includeTopics: feedMode === 'foryou',
      includeTrending: feedMode === 'foryou' || feedMode === 'trending',
      includeSimilarContent: feedMode === 'foryou',
      includeExplore: feedMode === 'foryou',
      diversityFactor: 0.3
    },
    {
      enabled: feedMode === 'foryou' || feedMode === 'following' || feedMode === 'trending',
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );
  
  // Get regular reels feed (fallback)
  const { 
    data: regularReelsData, 
    isLoading: isLoadingRegular,
    error: regularError,
    fetchNextPage: fetchNextRegular,
    isFetchingNextPage: isFetchingNextRegular,
    hasNextPage: hasNextRegular
  } = trpc.reel.getReels.useInfiniteQuery(
    {
      limit: 10,
      userId: feedMode === 'following' ? undefined : undefined
    },
    {
      enabled: feedMode === 'following' || reels.length === 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );
  
  // TRPC mutations for interactions
  const likeMutation = trpc.reel.likeReel.useMutation();
  const shareMutation = trpc.reel.shareReel.useMutation();
  const followMutation = trpc.user.followUser.useMutation();
  const logViewMutation = trpc.reel.logReelViewed.useMutation();
  
  // Load initial reels
  useEffect(() => {
    if (recommendedReelsData?.pages && feedMode === 'foryou' && reels.length === 0) {
      // Flatten pages and set reels
      const allReels = recommendedReelsData.pages.flatMap(page => page.reels);
      if (allReels.length > 0) {
        setReels(allReels);
      }
    } else if (regularReelsData?.pages && (feedMode === 'following' || feedMode === 'trending') && reels.length === 0) {
      // Flatten pages and set reels
      const allReels = regularReelsData.pages.flatMap(page => page.reels);
      if (allReels.length > 0) {
        setReels(allReels);
      }
    }
  }, [recommendedReelsData, regularReelsData, feedMode, reels.length]);
  
  // Handle scroll to load more reels
  const handleScrollToLoadMore = async () => {
    if (isLoadingMore) return;
    
    if (currentIndex >= reels.length - 2) {
      setIsLoadingMore(true);
      
      try {
        if (feedMode === 'foryou' && hasNextRecommended) {
          await fetchNextRecommended();
        } else if ((feedMode === 'following' || feedMode === 'trending') && hasNextRegular) {
          await fetchNextRegular();
        }
      } catch (error) {
        console.error('Error loading more reels:', error);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };
  
  // Update reels when more are loaded
  useEffect(() => {
    if (feedMode === 'foryou' && recommendedReelsData?.pages) {
      const allReels = recommendedReelsData.pages.flatMap(page => page.reels);
      setReels(allReels);
    } else if ((feedMode === 'following' || feedMode === 'trending') && regularReelsData?.pages) {
      const allReels = regularReelsData.pages.flatMap(page => page.reels);
      setReels(allReels);
    }
  }, [recommendedReelsData, regularReelsData, feedMode]);
  
  // Handle scroll event
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / itemHeight);
    
    if (newIndex !== currentIndex) {
      // Start timing view for the new reel
      const newReelId = reels[newIndex]?.id;
      if (newReelId && !viewLogs[newReelId]) {
        setViewLogs(prev => ({
          ...prev,
          [newReelId]: {
            startTime: Date.now(),
            logged: false
          }
        }));
      }
      
      // Log completed view for the previous reel
      const prevReelId = reels[currentIndex]?.id;
      if (prevReelId && viewLogs[prevReelId] && !viewLogs[prevReelId].logged) {
        const viewDuration = (Date.now() - viewLogs[prevReelId].startTime) / 1000; // in seconds
        const videoElement = document.querySelector(`#reel-video-${prevReelId}`) as HTMLVideoElement;
        const totalDuration = videoElement?.duration || 10; // fallback to 10 seconds
        const completionRate = Math.min(1, viewDuration / totalDuration);
        
        // Only log if viewed for at least 1 second
        if (viewDuration >= 1) {
          logViewMutation.mutate({
            reelId: prevReelId,
            watchDuration: viewDuration,
            completionRate
          });
          
          // Update view logs
          setViewLogs(prev => ({
            ...prev,
            [prevReelId]: {
              ...prev[prevReelId],
              logged: true,
              watchDuration: viewDuration,
              completionRate
            }
          }));
        }
      }
      
      setCurrentIndex(newIndex);
      handleScrollToLoadMore(); // Check if we need to load more
    }
  };
  
  // Handle interaction functions
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
  
  const handleChangeFeedMode = (mode: 'foryou' | 'following' | 'trending') => {
    setFeedMode(mode);
    setReels([]); // Clear current reels
    setCurrentIndex(0); // Reset index
    setViewLogs({}); // Reset view logs
  };
  
  // Loading state
  const isLoading = (isLoadingRecommended && feedMode === 'foryou') || 
                    (isLoadingRegular && (feedMode === 'following' || feedMode === 'trending'));
  
  if (isLoading && reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }
  
  // Error state
  const error = (recommendedError && feedMode === 'foryou') || 
                (regularError && (feedMode === 'following' || feedMode === 'trending'));
  
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
      {/* Feed mode selector */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-center p-4 bg-gradient-to-b from-black to-transparent">
        <div className="flex space-x-4 text-white bg-black bg-opacity-50 rounded-full px-2 py-1">
          <button 
            className={`px-3 py-1 rounded-full ${feedMode === 'foryou' ? 'bg-white text-black' : 'text-white'}`}
            onClick={() => handleChangeFeedMode('foryou')}
          >
            For You
          </button>
          <button 
            className={`px-3 py-1 rounded-full ${feedMode === 'following' ? 'bg-white text-black' : 'text-white'}`}
            onClick={() => handleChangeFeedMode('following')}
          >
            Following
          </button>
          <button 
            className={`px-3 py-1 rounded-full ${feedMode === 'trending' ? 'bg-white text-black' : 'text-white'}`}
            onClick={() => handleChangeFeedMode('trending')}
          >
            Trending
          </button>
        </div>
      </div>
      
      {/* Reels container */}
      <div 
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        onScroll={handleScroll}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="w-full h-screen snap-start relative">
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
            
            {/* Recommendation tag (only shown in For You feed) */}
            {feedMode === 'foryou' && reel.recommendation && (
              <div className="absolute top-20 left-4 z-10">
                <ReelRecommendationTag 
                  reason={reel.recommendation.reason} 
                  source={reel.recommendation.source} 
                />
              </div>
            )}
          </div>
        ))}
        
        {/* Loading indicator for infinite scroll */}
        {isFetchingNextRecommended || isFetchingNextRegular ? (
          <div className="flex justify-center items-center py-8 h-24 snap-start">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : null}
      </div>
      
      {/* Comment drawer */}
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

export default RecommendedReelFeed;