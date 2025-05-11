'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/api';
import { 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Users, 
  Settings, 
  ChevronRight,
  Bell,
  Check
} from 'lucide-react';
import PersonalizedFeed from './PersonalizedFeed';

export default function PersonalizedFeedLanding() {
  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasSeenPersonalizedFeedIntro') === 'true';
    }
    return false;
  });

  const [contentType, setContentType] = useState('post');
  const [showReasonExplanation, setShowReasonExplanation] = useState(false);

  // Get user interest profile
  const { data: userInterests } = trpc.personalization.getUserInterests.useQuery();

  // Handle intro completion
  const completeIntro = () => {
    setHasSeenIntro(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasSeenPersonalizedFeedIntro', 'true');
    }
  };

  if (!hasSeenIntro) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="absolute inset-0 opacity-30 bg-pattern-dots"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-20 h-20 text-white opacity-80" />
          </div>
        </div>
        
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
            <Zap className="w-6 h-6 text-yellow-500 mr-2" />
            Introducing Personalized Feed
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Experience a feed tailored just for you, powered by advanced AI that understands your interests and preferences.
          </p>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Content Matched to Your Interests</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our AI learns what you like and finds content that matches your interests and preferences.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Social Recommendations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Discover content popular among people with similar interests and those you follow.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Trending Content</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Never miss out on what's popular right now, balanced with your personal preferences.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Full Transparency and Control</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  See why content is recommended and customize your preferences at any time.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" className="mr-2" defaultChecked />
              Personalized content is enabled
            </label>
            
            <button
              onClick={completeIntro}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center"
            >
              Get Started <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
            Personalized For You
          </h2>
          
          <div className="flex items-center gap-2">
            <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <Bell className="w-5 h-5" />
            </button>
            <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={() => setContentType('post')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              contentType === 'post' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            Posts
          </button>
          <button 
            onClick={() => setContentType('reel')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              contentType === 'reel' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            Reels
          </button>
          <div className="flex-1"></div>
          <button 
            onClick={() => setShowReasonExplanation(!showReasonExplanation)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            How recommendations work
          </button>
        </div>
        
        {showReasonExplanation && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 text-sm text-blue-800 dark:text-blue-200">
            <h3 className="font-medium mb-2">How AI Personalization Works</h3>
            <p className="mb-3">
              Your personalized feed is created using multiple AI techniques that analyze your interests and behavior:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Content-based: We analyze topics and content you engage with</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Collaborative: We find people with similar interests to yours</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Trending: We blend in popular content that's relevant to you</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5" />
                <span>AI-powered: Advanced AI models analyze content to match your preferences</span>
              </li>
            </ul>
            <p className="mt-3">
              Each recommendation shows why it was selected for you, and you can always adjust your preferences.
            </p>
          </div>
        )}
        
        {userInterests && userInterests.topics.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Based on Your Interests</h3>
            <div className="flex flex-wrap gap-1">
              {userInterests.topics
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 5)
                .map(topic => (
                  <span
                    key={topic.id}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                  >
                    {topic.name}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
      
      <PersonalizedFeed 
        contentType={contentType}
        showReasons={true}
        initialLimit={10}
      />
    </div>
  );
}