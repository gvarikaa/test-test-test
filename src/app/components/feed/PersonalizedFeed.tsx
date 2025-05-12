'use client';

import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { trpc } from '@/lib/trpc/client';
import { ContentType, RecommendationReason } from '@/lib/personalization';
import Post from './Post';
import { 
  TrendingUp, 
  Users, 
  ThumbsUp, 
  Zap, 
  Sparkles, 
  MapPin, 
  RefreshCw, 
  AlertCircle,
  Filter
} from 'lucide-react';

interface PersonalizedFeedProps {
  contentType?: string;
  initialLimit?: number;
  header?: React.ReactNode;
  showReasons?: boolean;
  showSourceFilters?: boolean;
  className?: string;
  // New props for automatic personalization
  autoPersonalize?: boolean;
}

const reasonIcons: Record<string, React.ReactNode> = {
  similar_content: <ThumbsUp size={16} className="text-blue-500" />,
  friends_engaged: <Users size={16} className="text-green-500" />,
  trending_now: <TrendingUp size={16} className="text-red-500" />,
  based_on_interests: <Sparkles size={16} className="text-purple-500" />,
  based_on_history: <Zap size={16} className="text-amber-500" />,
  based_on_location: <MapPin size={16} className="text-sky-500" />,
  similar_users: <Users size={16} className="text-indigo-500" />,
  complementary_content: <Sparkles size={16} className="text-teal-500" />,
  new_but_relevant: <Zap size={16} className="text-orange-500" />,
};

const reasonLabels: Record<string, string> = {
  similar_content: 'Because you liked similar content',
  friends_engaged: 'Popular with people you follow',
  trending_now: 'Trending right now',
  based_on_interests: 'Matches your interests',
  based_on_history: 'Based on your activity',
  based_on_location: 'Popular near you',
  similar_users: 'People with similar interests',
  complementary_content: 'You might also like',
  new_but_relevant: 'New for you',
};

export default function PersonalizedFeed({
  contentType = 'post',
  initialLimit = 10,
  header,
  showReasons = true,
  showSourceFilters = false, // Default to false to hide filters for automatic personalization
  className = '',
}: PersonalizedFeedProps) {
  const { ref, inView } = useInView();
  const [limit, setLimit] = useState(initialLimit);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get personalized feed
  const { data: recommendations, isLoading, error, refetch } =
    trpc.personalization.getPersonalizedFeed.useQuery(
      {
        contentType: contentType as any,
        limit
      },
      { staleTime: 5 * 60 * 1000 } // 5 minutes
    );
  
  // Get posts for recommendations
  const { data: posts, isLoading: isLoadingPosts } = trpc.post.getPosts.useQuery(
    { 
      postIds: recommendations && contentType === 'post' 
        ? recommendations.map(rec => rec.id) 
        : [],
      includeComments: false
    },
    { 
      enabled: Boolean(recommendations?.length && contentType === 'post'),
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );
  
  // Get reels for recommendations
  const { data: reels, isLoading: isLoadingReels } = trpc.reel.getReels.useQuery(
    { 
      reelIds: recommendations && contentType === 'reel' 
        ? recommendations.map(rec => rec.id) 
        : [] 
    },
    { 
      enabled: Boolean(recommendations?.length && contentType === 'reel'),
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );
  
  // Log behavior mutation
  const logBehavior = trpc.personalization.logBehavior.useMutation();
  
  // Reset limit when contentType changes
  useEffect(() => {
    setLimit(initialLimit);
  }, [contentType, initialLimit]);
  
  // Load more content when user scrolls to the bottom
  useEffect(() => {
    if (inView && !isLoading && recommendations?.length === limit) {
      setLimit(prev => prev + initialLimit);
    }
  }, [inView, isLoading, recommendations?.length, initialLimit, limit]);
  
  // Log content view
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      // Log only the first view of the feed
      logBehavior.mutate({
        behaviorType: 'view',
        contentId: 'feed',
        contentType: contentType as any,
        metadata: {
          recommendationCount: recommendations.length,
          sources: [...new Set(recommendations.map(rec => rec.source))],
        },
      });
    }
  }, [recommendations, contentType]);
  
  // Handle post interaction
  const handlePostInteraction = (
    postId: string, 
    behaviorType: 'view' | 'like' | 'comment' | 'share' | 'save' | 'click',
    metadata?: any
  ) => {
    logBehavior.mutate({
      behaviorType,
      contentId: postId,
      contentType: contentType as any,
      metadata: {
        ...metadata,
        fromPersonalizedFeed: true,
        recommendation: recommendations?.find(rec => rec.id === postId),
      },
    });
  };
  
  // Filter recommendations
  const filteredRecommendations = activeFilters.length > 0
    ? recommendations?.filter(rec => activeFilters.includes(rec.reason))
    : recommendations;
  
  // Toggle filter
  const toggleFilter = (reason: string) => {
    setActiveFilters(prev => 
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };
  
  // Refresh feed
  const handleRefresh = () => {
    refetch();
  };
  
  // Combine recommendations with content data
  const combinedContent = filteredRecommendations?.map(rec => {
    if (contentType === 'post') {
      const post = posts?.find(p => p.id === rec.id);
      return { recommendation: rec, content: post };
    } else if (contentType === 'reel') {
      const reel = reels?.find(r => r.id === rec.id);
      return { recommendation: rec, content: reel };
    }
    return { recommendation: rec, content: null };
  }).filter(item => item.content !== undefined);
  
  // Get unique reasons for filtering
  const availableReasons = recommendations
    ? [...new Set(recommendations.map(rec => rec.reason))]
    : [];
  
  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center">
          <AlertCircle size={16} className="text-red-500 mr-2" />
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            Error loading personalized feed
          </h3>
        </div>
        <p className="mt-1 text-xs text-red-700 dark:text-red-400">
          {error.message || 'Something went wrong. Please try again.'}
        </p>
        <button 
          onClick={handleRefresh}
          className="mt-2 flex items-center text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
        >
          <RefreshCw size={12} className="mr-1" /> Try again
        </button>
      </div>
    );
  }
  
  return (
    <div className={`relative space-y-4 ${className}`}>
      {/* Header */}
      {header && (
        <div className="mb-4">
          {header}
        </div>
      )}
      
      {/* Filters */}
      {showSourceFilters && availableReasons.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Personalized Feed
            </h3>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <Filter size={14} className="mr-1" />
              {activeFilters.length > 0 ? `Filters (${activeFilters.length})` : 'Filter'}
            </button>
          </div>
          
          {isFilterOpen && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {availableReasons.map(reason => (
                  <button
                    key={reason}
                    onClick={() => toggleFilter(reason)}
                    className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${activeFilters.includes(reason) 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}
                    `}
                  >
                    {reasonIcons[reason]}
                    <span className="ml-1">{reasonLabels[reason]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Loading state */}
      {(isLoading || isLoadingPosts || isLoadingReels) && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
              <div className="mt-4 h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      )}
      
      {/* Content */}
      {!isLoading && !isLoadingPosts && !isLoadingReels && combinedContent && (
        <div className="space-y-4">
          {combinedContent.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Personalizing your feed...
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                We're analyzing your preferences to build a personalized feed just for you. Check back soon or try refreshing.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <RefreshCw size={16} className="inline mr-2" />
                Refresh Feed
              </button>
            </div>
          ) : (
            <>
              {combinedContent.map(({ recommendation, content }) => {
                if (!content) return null;
                
                // Render based on content type
                if (contentType === 'post') {
                  return (
                    <div key={recommendation.id} className="relative">
                      {/* Recommendation reason badge - Subtler design */}
                      {showReasons && (
                        <div className="absolute -top-2 right-2 z-10 inline-flex items-center px-2 py-1 rounded-full text-xs bg-white/90 dark:bg-gray-800/90 shadow-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                          {reasonIcons[recommendation.reason]}
                          <span className="ml-1 text-gray-700 dark:text-gray-300 text-opacity-90 dark:text-opacity-90">
                            {reasonLabels[recommendation.reason]}
                          </span>
                        </div>
                      )}
                      
                      {/* @ts-ignore - Type is verified at runtime */}
                      <Post 
                        post={content} 
                        onView={() => handlePostInteraction(recommendation.id, 'view')}
                        onLike={() => handlePostInteraction(recommendation.id, 'like')}
                        onComment={() => handlePostInteraction(recommendation.id, 'comment')}
                        onShare={() => handlePostInteraction(recommendation.id, 'share')}
                        onSave={() => handlePostInteraction(recommendation.id, 'save')}
                      />
                    </div>
                  );
                }
                
                // Placeholder for reels - in a real app you'd have a Reel component
                if (contentType === 'reel') {
                  return (
                    <div key={recommendation.id} className="relative bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                      {/* Recommendation reason badge - Subtler design */}
                      {showReasons && (
                        <div className="absolute top-2 right-2 z-10 inline-flex items-center px-2 py-1 rounded-full text-xs bg-white/90 dark:bg-gray-800/90 shadow-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                          {reasonIcons[recommendation.reason]}
                          <span className="ml-1 text-gray-700 dark:text-gray-300 text-opacity-90 dark:text-opacity-90">
                            {reasonLabels[recommendation.reason]}
                          </span>
                        </div>
                      )}
                      
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {/* @ts-ignore - Type is verified at runtime */}
                        {content.caption || 'Reel'}
                      </h3>
                      
                      <div className="mt-2 aspect-[9/16] bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                        {/* Placeholder for reel content */}
                        <span className="text-gray-500 dark:text-gray-400">Reel Content</span>
                      </div>
                    </div>
                  );
                }
                
                return null;
              })}
              
              {/* Load more trigger */}
              <div ref={ref} className="h-10 flex items-center justify-center">
                {isLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        className="fixed bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        <RefreshCw size={18} />
      </button>
    </div>
  );
}