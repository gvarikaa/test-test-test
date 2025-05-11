'use client';

import React, { useState } from 'react';
import PersonalizedFeed from '../components/feed/PersonalizedFeed';
import { trpc } from '@/lib/trpc/client';
import { 
  Layout, 
  Globe, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Settings,
  Info
} from 'lucide-react';

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState('for-you');
  const [contentType, setContentType] = useState('post');
  const [showInfo, setShowInfo] = useState(false);
  
  // Get user interest profile
  const { data: userInterests } = trpc.personalization.getUserInterests.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'for-you':
        return (
          <PersonalizedFeed
            contentType={contentType}
            showReasons={true}
            showSourceFilters={true}
            initialLimit={10}
            header={
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    For You
                  </h2>
                  
                  <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Info size={18} />
                  </button>
                </div>
                
                {showInfo && (
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
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
                              <span 
                                key={topic.id}
                                className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                              >
                                {topic.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-semibold">Content type:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setContentType('post')}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            contentType === 'post'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}
                        >
                          Posts
                        </button>
                        <button
                          onClick={() => setContentType('reel')}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            contentType === 'reel'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}
                        >
                          Reels
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            }
          />
        );
      
      case 'following':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
            <Users size={48} className="text-blue-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Following Feed
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">
              See posts from people you follow. This is a traditional chronological feed without AI personalization.
            </p>
            <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              Coming Soon
            </button>
          </div>
        );
      
      case 'trending':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
            <TrendingUp size={48} className="text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Trending Content
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">
              Discover what's trending right now across the platform. See the most popular and engaging content.
            </p>
            <button className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
              Coming Soon
            </button>
          </div>
        );
      
      case 'discover':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
            <Sparkles size={48} className="text-purple-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Discover New Content
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">
              Explore content outside your usual interests to discover new topics, creators, and perspectives.
            </p>
            <button className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors">
              Coming Soon
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Feed tabs */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('for-you')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'for-you'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            <Sparkles size={16} />
            For You
          </button>
          
          <button
            onClick={() => setActiveTab('following')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'following'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            <Users size={16} />
            Following
          </button>
          
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'trending'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            <TrendingUp size={16} />
            Trending
          </button>
          
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'discover'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            <Globe size={16} />
            Discover
          </button>
          
          <div className="flex-1"></div>
          
          <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Your Interest Profile
            </h3>
            
            {!userInterests ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Topics */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Top Topics
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    {userInterests.topics.length > 0 ? (
                      userInterests.topics
                        .sort((a, b) => b.weight - a.weight)
                        .slice(0, 8)
                        .map(topic => (
                          <span 
                            key={topic.id}
                            className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                          >
                            {topic.name}
                          </span>
                        ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No topics yet. Follow topics or interact with content to build your profile.
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Content preferences */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Preferences
                  </h4>
                  
                  <div className="space-y-2">
                    {Object.entries(userInterests.contentTypes)
                      .sort(([, a], [, b]) => b - a)
                      .filter(([, weight]) => weight > 0)
                      .map(([type, weight]) => (
                        <div key={type} className="flex items-center">
                          <span className="text-xs text-gray-700 dark:text-gray-300 w-20">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-2">
                            <div 
                              className="h-full bg-blue-500 dark:bg-blue-600 rounded-full"
                              style={{ width: `${Math.round(weight * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 w-10 text-right">
                            {Math.round(weight * 100)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                {/* Engagement patterns */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Engagement Patterns
                  </h4>
                  
                  <div className="space-y-2">
                    {Object.entries(userInterests.engagementPatterns)
                      .sort(([, a], [, b]) => b - a)
                      .filter(([, weight]) => weight > 0)
                      .slice(0, 5)
                      .map(([type, weight]) => (
                        <div key={type} className="flex items-center">
                          <span className="text-xs text-gray-700 dark:text-gray-300 w-20">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-2">
                            <div 
                              className="h-full bg-green-500 dark:bg-green-600 rounded-full"
                              style={{ width: `${Math.round(weight * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 w-10 text-right">
                            {Math.round(weight * 100)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm">
                  Update Preferences
                </button>
              </div>
            )}
          </div>
          
          {/* Similar users card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              People You Might Like
            </h3>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4">
              <p>
                Discover people with similar interests and activities. Connect with them to expand your network.
              </p>
              
              <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                Find Similar Users
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}