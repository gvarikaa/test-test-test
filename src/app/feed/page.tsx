'use client';

import React, { useState } from 'react';
import PersonalizedFeed from '../components/feed/PersonalizedFeed';
import EnhancedPostCreator from '../components/posts/enhanced-post-creator';
import { trpc } from '@/lib/trpc/client';
import { 
  Layout, 
  Globe, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Settings,
  Info,
  Calendar,
  Hash
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function FeedPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('for-you');
  const [contentType, setContentType] = useState<string | undefined>(undefined);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState<string | undefined>(undefined);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('day');
  
  // Get user interest profile
  const { data: userInterests } = trpc.personalization.getUserInterests.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'for-you':
        return (
          <>
            {session && <EnhancedPostCreator />}
            <PersonalizedFeed
              contentType={contentType}
              hashtag={selectedHashtag}
              showReasons={true}
              showSourceFilters={true}
              initialLimit={10}
              header={
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                      For You
                    </h2>
                    
                    <button 
                      onClick={() => setShowInfo(!showInfo)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      <Info size={18} />
                    </button>
                  </div>
                  
                  {showInfo && (
                    <div className="mt-3 text-sm text-gray-300">
                      <p>
                        Your personalized feed is curated based on your activity, interests, and connections.
                        The content is recommended using AI-powered personalization.
                      </p>
                      
                      {userInterests && userInterests.topics.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Top interests:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {userInterests.topics
                              .sort((a, b) => b.weight - a.weight)
                              .slice(0, 5)
                              .map(topic => (
                                <button 
                                  key={topic.id}
                                  onClick={() => setSelectedHashtag(topic.name)}
                                  className={`inline-block px-2 py-0.5 rounded-full text-xs
                                    ${selectedHashtag === topic.name 
                                      ? 'bg-blue-600 text-white' 
                                      : 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/50'
                                    }`}
                                >
                                  #{topic.name}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <div className="font-semibold mb-1">Content type:</div>
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => setContentType(undefined)}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              contentType === undefined
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setContentType('TEXT')}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              contentType === 'TEXT'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Text
                          </button>
                          <button
                            onClick={() => setContentType('PHOTO')}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              contentType === 'PHOTO'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Photos
                          </button>
                          <button
                            onClick={() => setContentType('VIDEO')}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              contentType === 'VIDEO'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Videos
                          </button>
                          {/* Poll type removed as it's not in the schema */}
                          {/* <button
                            onClick={() => setContentType('POLL')}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              contentType === 'POLL'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Polls
                          </button> */}
                          <button
                            onClick={() => setContentType('AUDIO')}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              contentType === 'AUDIO'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Audio
                          </button>
                        </div>
                      </div>

                      {selectedHashtag && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-semibold">Selected hashtag:</span>
                          <div className="flex items-center bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">
                            #{selectedHashtag}
                            <button 
                              onClick={() => setSelectedHashtag(undefined)}
                              className="ml-1 hover:text-gray-200"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              }
            />
          </>
        );
      
      case 'following':
        return (
          <>
            {session && <EnhancedPostCreator />}
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 flex flex-col items-center justify-center">
              <Users size={48} className="text-blue-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                Following Feed
              </h2>
              <p className="text-gray-300 text-center max-w-md">
                See posts from people you follow. This is a traditional chronological feed without AI personalization.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Coming Soon
              </button>
            </div>
          </>
        );
      
      case 'trending':
        return (
          <>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  Trending Content
                </h2>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedTimeframe('day')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedTimeframe === 'day' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setSelectedTimeframe('week')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedTimeframe === 'week' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    This Week
                  </button>
                  <button 
                    onClick={() => setSelectedTimeframe('month')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedTimeframe === 'month' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setContentType(undefined)}
                  className={`px-2 py-0.5 text-sm rounded-md ${
                    contentType === undefined
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setContentType('PHOTO')}
                  className={`px-2 py-0.5 text-sm rounded-md ${
                    contentType === 'PHOTO'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Photos
                </button>
                <button
                  onClick={() => setContentType('VIDEO')}
                  className={`px-2 py-0.5 text-sm rounded-md ${
                    contentType === 'VIDEO'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Videos
                </button>
                {/* Poll type removed as it's not in the schema */}
                {/* <button
                  onClick={() => setContentType('POLL')}
                  className={`px-2 py-0.5 text-sm rounded-md ${
                    contentType === 'POLL'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Polls
                </button> */}
                <button
                  onClick={() => setContentType('AUDIO')}
                  className={`px-2 py-0.5 text-sm rounded-md ${
                    contentType === 'AUDIO'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Audio
                </button>
              </div>
            </div>
            
            {/* Trending Posts Feed */}
            <TrendingFeed 
              contentType={contentType}
              timeframe={selectedTimeframe}
            />
          </>
        );
      
      case 'discover':
        return (
          <>
            {session && <EnhancedPostCreator />}
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 flex flex-col items-center justify-center">
              <Sparkles size={48} className="text-purple-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                Discover New Content
              </h2>
              <p className="text-gray-300 text-center max-w-md">
                Explore content outside your usual interests to discover new topics, creators, and perspectives.
              </p>
              <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                Coming Soon
              </button>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Feed tabs */}
      <div className="mb-6 bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-700">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setActiveTab('for-you');
              setContentType(undefined);
              setSelectedHashtag(undefined);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              activeTab === 'for-you'
                ? 'bg-blue-900/30 text-blue-200'
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Sparkles size={16} />
            For You
          </button>
          
          <button
            onClick={() => {
              setActiveTab('following');
              setContentType(undefined);
              setSelectedHashtag(undefined);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              activeTab === 'following'
                ? 'bg-blue-900/30 text-blue-200'
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Users size={16} />
            Following
          </button>
          
          <button
            onClick={() => {
              setActiveTab('trending');
              setSelectedTimeframe('day');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              activeTab === 'trending'
                ? 'bg-red-900/30 text-red-200'
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <TrendingUp size={16} />
            Trending
          </button>
          
          <button
            onClick={() => {
              setActiveTab('discover');
              setContentType(undefined);
              setSelectedHashtag(undefined);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              activeTab === 'discover'
                ? 'bg-purple-900/30 text-purple-200'
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Globe size={16} />
            Discover
          </button>
          
          <div className="flex-1"></div>
          
          <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700/50 whitespace-nowrap">
            <Settings size={16} />
            <span className="hidden sm:inline">Feed Settings</span>
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          {renderTabContent()}
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          {/* User interest profile card */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 sticky top-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Your Interest Profile
            </h3>
            
            {!userInterests ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Topics */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Top Topics
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    {userInterests.topics.length > 0 ? (
                      userInterests.topics
                        .sort((a, b) => b.weight - a.weight)
                        .slice(0, 8)
                        .map(topic => (
                          <button 
                            key={topic.id}
                            onClick={() => {
                              setSelectedHashtag(topic.name);
                              setActiveTab('for-you');
                            }}
                            className="inline-block px-2 py-1 bg-blue-900/40 text-blue-300 hover:bg-blue-800/60 rounded-full text-xs flex items-center gap-1"
                          >
                            <Hash size={10} />
                            {topic.name}
                          </button>
                        ))
                    ) : (
                      <p className="text-sm text-gray-400">
                        No topics yet. Follow topics or interact with content to build your profile.
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Content preferences */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Content Preferences
                  </h4>
                  
                  <div className="space-y-2">
                    {Object.entries(userInterests.contentTypes)
                      .sort(([, a], [, b]) => b - a)
                      .filter(([, weight]) => weight > 0)
                      .map(([type, weight]) => (
                        <div key={type} className="flex items-center">
                          <span className="text-xs text-gray-300 w-20">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden ml-2">
                            <div 
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${Math.round(weight * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400 ml-2 w-10 text-right">
                            {Math.round(weight * 100)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                {/* Engagement patterns */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Engagement Patterns
                  </h4>
                  
                  <div className="space-y-2">
                    {Object.entries(userInterests.engagementPatterns)
                      .sort(([, a], [, b]) => b - a)
                      .filter(([, weight]) => weight > 0)
                      .slice(0, 5)
                      .map(([type, weight]) => (
                        <div key={type} className="flex items-center">
                          <span className="text-xs text-gray-300 w-20">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden ml-2">
                            <div 
                              className="h-full bg-green-600 rounded-full"
                              style={{ width: `${Math.round(weight * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400 ml-2 w-10 text-right">
                            {Math.round(weight * 100)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                  Update Preferences
                </button>
              </div>
            )}
          </div>
          
          {/* Upcoming events card */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="text-purple-400" size={20} />
              <h3 className="text-lg font-semibold text-white">
                Upcoming Events
              </h3>
            </div>
            
            <div className="text-sm text-gray-300 space-y-4">
              <p>
                Stay connected with events happening in your community and among your friends.
              </p>
              
              <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm">
                View Events Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Trending Feed Component
function TrendingFeed({ 
  contentType, 
  timeframe = 'day' 
}: { 
  contentType?: string; 
  timeframe: 'day' | 'week' | 'month'; 
}) {
  // Fetch trending posts
  const { data, isLoading, error } = trpc.post.getTrending.useQuery({
    timeframe,
    type: contentType as any,
    limit: 20,
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-700 rounded"></div>
                <div className="h-3 w-24 bg-gray-700 rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-700 rounded"></div>
              <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
            </div>
            <div className="h-40 mt-3 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-200">
        <div className="font-medium mb-1">Error loading trending posts</div>
        <div className="text-sm">{error.message}</div>
      </div>
    );
  }
  
  if (!data || data.posts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <TrendingUp size={40} className="mx-auto text-gray-600 mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">No trending posts found</h3>
        <p className="text-gray-400 text-sm">
          Try changing your filters or check back later for trending content.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* We'll use PersonalizedFeed to render the posts since it already has all the logic */}
      <PersonalizedFeed
        initialPosts={data.posts}
        initialLimit={data.posts.length}
        showTrendingBadge={true}
        disablePagination={true}
      />
    </div>
  );
}