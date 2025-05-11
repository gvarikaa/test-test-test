"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import FacebookHeader from "./components/layouts/FacebookHeader";
import LeftSidebar from "./components/layouts/LeftSidebar";
import RightSidebar from "./components/layouts/RightSidebar";
import MobileNavigation from "./components/layouts/MobileNavigation";
import StoryStrip from "./components/feed/StoryStrip";
import CreatePostBox from "./components/feed/CreatePostBox";
import Post from "./components/feed/Post";
import RecommendationBadge from "./components/feed/RecommendationBadge";
import { api } from "@/lib/trpc/api";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Settings,
  Filter
} from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const [usePersonalized, setUsePersonalized] = useState(true);
  const [showRecommendationInfo, setShowRecommendationInfo] = useState(false);

  useEffect(() => {
    setMounted(true);

    // ავტომატურად დავაყენოთ მუქი თემა
    document.documentElement.classList.add('dark');

    // Check local storage for personalization preference
    if (typeof window !== 'undefined') {
      const pref = localStorage.getItem('usePersonalizedFeed');
      if (pref !== null) {
        setUsePersonalized(pref === 'true');
      }
    }
  }, []);

  // Get personalized feed if user is authenticated and personalization is enabled
  const {
    data: personalizedData,
    isLoading: isLoadingPersonalized,
    error: personalizedError,
    refetch: refetchPersonalized
  } = api.post.getPersonalizedFeed.useQuery(
    { limit: 10, includeReasons: true },
    {
      enabled: !!session && usePersonalized && mounted,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Fallback to standard posts
  const {
    data: standardData,
    isLoading: isLoadingStandard,
    error: standardError,
    refetch: refetchStandard
  } = api.post.getAll.useQuery(
    { limit: 10, personalized: false },
    {
      enabled: !usePersonalized || !session || !mounted,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const togglePersonalization = () => {
    setUsePersonalized(!usePersonalized);
    if (typeof window !== 'undefined') {
      localStorage.setItem('usePersonalizedFeed', (!usePersonalized).toString());
    }
  };

  const handleRefresh = () => {
    if (usePersonalized && !!session) {
      refetchPersonalized();
    } else {
      refetchStandard();
    }
  };

  // Display logic for posts feed
  const displayPosts = (() => {
    if (isLoadingPersonalized || isLoadingStandard) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card mb-4 overflow-hidden animate-pulse">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-800"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-800 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-800 rounded"></div>
                  <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                </div>
                <div className="h-40 bg-gray-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (personalizedError || standardError) {
      const error = personalizedError || standardError;
      return (
        <div className="p-4 mb-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-medium">Error loading posts</h3>
          </div>
          <p className="mt-1 text-sm">{error?.message || 'Something went wrong. Please try again.'}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 px-3 py-1 bg-red-700 text-white text-sm rounded hover:bg-red-600 inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Try Again
          </button>
        </div>
      );
    }

    // Get the appropriate posts based on personalization setting
    const apiPosts = usePersonalized && personalizedData
      ? personalizedData.posts
      : standardData?.posts || [];

    if (apiPosts.length === 0) {
      return (
        <div className="p-6 text-center bg-dark-card rounded-lg border border-dark-border">
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            No posts found
          </h3>
          <p className="text-gray-400 mb-4">
            {usePersonalized && session
              ? 'Your personalized feed is empty. Follow more topics or users to see content.'
              : 'No posts are available right now. Check back later!'}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={16} className="inline mr-2" />
            Refresh Feed
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {apiPosts.map((post) => (
          <div key={post.id} className="relative">
            {/* Show recommendation badge if available */}
            {usePersonalized && post.recommendationMetadata && (
              <div className="absolute -top-2 right-2 z-10">
                <RecommendationBadge reason={post.recommendationMetadata.reason} />
              </div>
            )}

            <Post
              post={{
                id: post.id,
                user: post.user,
                content: post.content,
                images: post.media?.map(m => m.url) || [],
                createdAt: post.createdAt,
                likes: post._count?.reactions || 0,
                comments: post._count?.comments || 0,
                shares: 0,
              }}
            />
          </div>
        ))}
      </div>
    );
  })();

  if (!mounted) {
    return null; // კლიენტის მხარეს გარენდერების დროს თავიდან აირიდოს ჰიდრაციის შეცდომები
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ჰედერი */}
      <FacebookHeader />

      {/* მთავარი კონტენტი */}
      <div className="flex justify-center px-0 lg:px-4">
        {/* მარცხენა სვეტი - ნავიგაცია */}
        <LeftSidebar />

        {/* შუა სვეტი - პოსტების ფიდი */}
        <main className="w-full max-w-[680px] px-0 py-4 sm:px-4">
          {/* სთორების სტრიპი */}
          <StoryStrip />

          {/* პოსტის შექმნის ბოქსი */}
          <CreatePostBox />

          {/* AI Personalization Header - Only for logged in users */}
          {session && (
            <div className="mb-4 flex items-center justify-between bg-dark-card p-3 rounded-lg">
              <div className="flex items-center gap-2">
                {usePersonalized && (
                  <Sparkles className="w-5 h-5 text-blue-500" />
                )}
                <h2 className="text-sm font-medium text-gray-200">
                  {usePersonalized ? 'Personalized Feed' : 'Standard Feed'}
                </h2>

                {usePersonalized && (
                  <button
                    onClick={() => setShowRecommendationInfo(!showRecommendationInfo)}
                    className="text-xs text-blue-400 hover:text-blue-300 ml-2"
                  >
                    <span className="hidden sm:inline">How it works</span>
                    <span className="sm:hidden">?</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={togglePersonalization}
                  className="text-xs text-gray-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-800"
                >
                  {usePersonalized ? (
                    <>
                      <Filter className="w-3 h-3" />
                      <span className="hidden sm:inline">Standard</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span className="hidden sm:inline">Personalized</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleRefresh}
                  disabled={isLoadingPersonalized || isLoadingStandard}
                  className="text-xs text-gray-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  {isLoadingPersonalized || isLoadingStandard ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          )}

          {/* Personalization Info Box */}
          {showRecommendationInfo && (
            <div className="mb-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50 text-sm text-blue-300">
              <h3 className="font-medium mb-2 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                How AI Personalization Works
              </h3>
              <p className="mb-2 text-xs">
                Your feed is powered by AI that analyzes:
              </p>
              <ul className="text-xs space-y-1 list-disc pl-4 mb-2">
                <li>Your interactions with posts, users, and content</li>
                <li>Similarities between content you engage with</li>
                <li>Topics and themes that match your interests</li>
                <li>Content popular with users similar to you</li>
              </ul>
              <p className="text-xs">
                Each post shows why it was recommended to help you understand your feed.
              </p>
            </div>
          )}

          {/* პოსტების ფიდი */}
          <div className="posts-feed space-y-4">
            {displayPosts}
          </div>
        </main>

        {/* მარჯვენა სვეტი - ჩატი და კონტაქტები */}
        <RightSidebar />
      </div>

      {/* მობილური ნავიგაცია */}
      <MobileNavigation />
    </div>
  );
}