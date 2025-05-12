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
  Filter,
  Zap,
  Brain,
  PenSquare,
  TrendingUp,
  Users,
  Stars
} from "lucide-react";

// Define animations and gradients for the enhanced dark theme
const ANIMATIONS = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  fadeInUp: `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }
  `,
  glow: `
    @keyframes glow {
      0%, 100% {
        box-shadow: 0 0 5px 0px rgba(99, 102, 241, 0.3);
      }
      50% {
        box-shadow: 0 0 20px 5px rgba(99, 102, 241, 0.6);
      }
    }
  `
};

// Define theme colors for consistent styling
const THEME = {
  // Primary gradients
  primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
  secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
  accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",
  successGradient: "bg-gradient-to-r from-emerald-600 to-green-700",
  warningGradient: "bg-gradient-to-r from-amber-600 to-orange-600",
  dangerGradient: "bg-gradient-to-r from-rose-600 to-red-700",

  // Background levels
  darkBg: "bg-gray-950",
  cardBg: "bg-gray-900",
  cardBgHover: "bg-gray-800/80",
  cardBorder: "border-gray-800/40",

  // Text colors
  textPrimary: "text-gray-100",
  textSecondary: "text-gray-400",
  textMuted: "text-gray-500",

  // Effects
  glow: "shadow-lg shadow-indigo-950/40"
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const [usePersonalized, setUsePersonalized] = useState(true);
  const [showRecommendationInfo, setShowRecommendationInfo] = useState(false);
  // Reference to the posts returned by tRPC for use in the debug section
  const [apiPosts, setApiPosts] = useState([]);

  // For direct debug access to posts
  const [directPosts, setDirectPosts] = useState([]);
  const [directPostsLoading, setDirectPostsLoading] = useState(false);
  const [directPostsError, setDirectPostsError] = useState(null);

  // Fetch posts directly from the API to bypass tRPC
  const fetchDirectPosts = async () => {
    try {
      setDirectPostsLoading(true);
      const response = await fetch('/api/test/debug-posts');

      // Log the raw response for debugging
      console.log("Raw response status:", response.status);

      // Check if the response is successful
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Direct API response:", data);

      if (data.success) {
        // Format the posts to match UI expectations
        const formattedPosts = data.posts.map(post => ({
          ...post,
          id: post.id || '',
          content: post.content || '',
          createdAt: post.createdAt || new Date().toISOString(),
          user: post.user || {
            id: '',
            name: 'Unknown User',
            image: 'https://ui-avatars.com/api/?name=Unknown+User&background=random&color=fff'
          },
          _count: post._count || {
            reactions: 0,
            comments: 0,
            shares: 0
          },
          media: post.media || []
        }));

        console.log("Formatted direct API posts:", formattedPosts);
        setDirectPosts(formattedPosts);
      } else {
        console.error("Error from direct API:", data.error);
        setDirectPostsError(data.error || "Unknown error in API response");
      }
    } catch (error) {
      console.error("Error fetching direct posts:", error);
      setDirectPostsError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDirectPostsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    // ავტომატურად დავაყენოთ მუქი თემა
    document.documentElement.classList.add('dark');

    // Set personalization to be enabled by default (automatic personalization)
    setUsePersonalized(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('usePersonalizedFeed', 'true');
    }

    // Fetch posts directly from API for debugging
    fetchDirectPosts();

    // Set a timeout to try refreshing data if after 3 seconds we don't have posts
    const refreshTimer = setTimeout(() => {
      if (apiPosts.length === 0) {
        console.log("Still no posts after 3 seconds, trying to refresh...");
        fetchDirectPosts();
        handleRefresh();
      }
    }, 3000);

    return () => clearTimeout(refreshTimer);
  }, [apiPosts.length]);

  // Get personalized feed if user is authenticated and personalization is enabled
  const {
    data: personalizedData,
    isLoading: isLoadingPersonalized,
    error: personalizedError,
    refetch: refetchPersonalized
  } = api.post.getPersonalizedFeed.useQuery(
    {
      limit: 20
    }, // Provide minimal parameters
    {
      enabled: !!session && usePersonalized && mounted,
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.error("Error fetching personalized feed:", error);
      }
    }
  );

  // Fallback to standard posts
  const {
    data: standardData,
    isLoading: isLoadingStandard,
    error: standardError,
    refetch: refetchStandard
  } = api.post.getAll.useQuery(
    {
      limit: 20
    }, // Provide minimal parameters
    {
      enabled: mounted, // Only require mounted, not session or personalization setting
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.error("Error fetching standard posts:", error);
      }
    }
  );

  // This function is kept for compatibility but won't be exposed in the UI
  // since we're making personalization automatic
  const togglePersonalization = () => {
    setUsePersonalized(true); // Always use personalized feed
    if (typeof window !== 'undefined') {
      localStorage.setItem('usePersonalizedFeed', 'true');
    }
  };

  const handleRefresh = () => {
    if (usePersonalized && !!session) {
      refetchPersonalized();
    } else {
      refetchStandard();
    }
  };

  // Debug function to help troubleshoot response formats
  const debugApiState = () => {
    console.log("Session:", session);
    console.log("Loading states:", { isLoadingPersonalized, isLoadingStandard });
    console.log("Error states:", { personalizedError, standardError });
    console.log("usePersonalized setting:", usePersonalized);

    if (personalizedData) {
      console.log("Personalized data structure:", Object.keys(personalizedData));
      if (personalizedData.posts) {
        console.log("Personalized posts count:", personalizedData.posts.length);
        if (personalizedData.posts.length > 0) {
          console.log("First post sample:", personalizedData.posts[0]);
        }
      }
    }

    if (standardData) {
      console.log("Standard data structure:", Object.keys(standardData));
      if (standardData.posts) {
        console.log("Standard posts count:", standardData.posts.length);
        if (standardData.posts.length > 0) {
          console.log("First post sample:", standardData.posts[0]);
        }
      }
    }
  };

  // Run debug analysis when data changes
  useEffect(() => {
    if (mounted && (standardData || personalizedData)) {
      debugApiState();
    }

    // Update apiPosts state for use throughout the component
    // Always prefer personalized data if available, then standard data, then direct posts
    const postsFromApi = personalizedData?.posts || standardData?.posts || [];

    // ყოველთვის ვიყენებთ პირდაპირი API-ს პოსტებს (ტესტისთვის)
    console.log("Always using direct API posts for testing");
    if (directPosts.length > 0) {
      setApiPosts(directPosts);
    } else if (postsFromApi.length > 0) {
      setApiPosts(postsFromApi);
    } else {
      console.log("No posts available from any source");
    }

  }, [standardData, personalizedData, mounted, usePersonalized, directPosts]);

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

    // Always use personalized data if available, fall back to standard
    const apiPosts = personalizedData?.posts || standardData?.posts || [];

    console.log("apiPosts:", apiPosts);

    // Get the locally stored apiPosts
    const postsToDisplay = apiPosts;

    if (!postsToDisplay || postsToDisplay.length === 0) {
      console.log("No posts found - showing empty state");
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
          <div className="flex justify-center gap-4">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={16} className="inline mr-2" />
              Refresh Feed
            </button>
            <button
              onClick={fetchDirectPosts}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
            >
              <RefreshCw size={16} className="inline mr-2" />
              Try Direct API
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {postsToDisplay && postsToDisplay.map((post) => (
          <div key={post?.id} className="relative">
            {/* Show recommendation badge if available */}
            {post?.recommendationMetadata && (
              <div className="absolute -top-2 right-2 z-10">
                <RecommendationBadge reason={post.recommendationMetadata?.reason} />
              </div>
            )}

            <Post
              post={{
                id: post?.id || '',
                user: post?.user || {
                  id: '',
                  name: 'Unknown User',
                  image: 'https://ui-avatars.com/api/?name=Unknown+User&background=random&color=fff'
                },
                content: post?.content || '',
                formattedContent: post?.formattedContent,
                images: post?.media?.map(m => m.url) || [],
                createdAt: post?.createdAt || new Date().toISOString(),
                likes: post?._count?.reactions || 0,
                comments: post?._count?.comments || 0,
                shares: post?._count?.shares || 0,
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
    <div className="min-h-screen bg-gray-950">
      <style jsx global>{`
        ${ANIMATIONS.fadeIn}
        ${ANIMATIONS.fadeInUp}
        ${ANIMATIONS.shimmer}
        ${ANIMATIONS.pulse}
        ${ANIMATIONS.glow}

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }

        .animate-pulse-subtle {
          animation: pulse 2s infinite ease-in-out;
        }

        .animate-glow {
          animation: glow 2.5s infinite ease-in-out;
        }

        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.5s; }
      `}</style>

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
            <div className={`mb-4 flex items-center justify-between p-4 rounded-xl border ${THEME.cardBorder} ${THEME.cardBg} animate-fade-in-up stagger-4`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${THEME.primaryGradient} animate-glow`}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className={`text-sm font-medium ${THEME.textPrimary}`}>
                    Personalized For You
                  </h2>
                  <p className="text-xs text-gray-400">Your AI-optimized feed</p>
                </div>
                <button
                  onClick={() => setShowRecommendationInfo(!showRecommendationInfo)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 ml-2 hover:underline"
                >
                  <span className="hidden sm:inline">How it works</span>
                  <span className="sm:hidden">?</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isLoadingPersonalized || isLoadingStandard}
                  className={`text-xs ${THEME.textPrimary} flex items-center gap-1 px-3 py-1.5 rounded-lg ${THEME.cardBgHover} border ${THEME.cardBorder} disabled:opacity-50 hover:border-indigo-800/60 transition-colors`}
                >
                  {isLoadingPersonalized || isLoadingStandard ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Debug Button - For testing only */}
                <button
                  onClick={fetchDirectPosts}
                  className={`text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-900/40 hover:border-amber-700/40 transition-colors`}
                >
                  <Settings className="w-3 h-3" />
                  <span className="hidden sm:inline">Load Direct</span>
                </button>
              </div>
            </div>
          )}

          {/* Personalization Info Box */}
          {showRecommendationInfo && (
            <div className={`mb-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/50 text-sm ${THEME.textPrimary} animate-fade-in`}>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <div className={`p-1 rounded-full ${THEME.primaryGradient}`}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span>How AI Personalization Works</span>
              </h3>
              <p className={`mb-3 text-sm ${THEME.textSecondary}`}>
                Your feed is intelligently curated by our AI system that analyzes:
              </p>
              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <div className="p-1 rounded-full bg-indigo-900/50 mt-0.5">
                    <Brain className="w-3 h-3 text-indigo-300" />
                  </div>
                  <p className="text-xs text-gray-300">Your interactions with posts, users, and content</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="p-1 rounded-full bg-purple-900/50 mt-0.5">
                    <Users className="w-3 h-3 text-purple-300" />
                  </div>
                  <p className="text-xs text-gray-300">Similarities between content you engage with</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="p-1 rounded-full bg-fuchsia-900/50 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-fuchsia-300" />
                  </div>
                  <p className="text-xs text-gray-300">Topics and themes that match your interests</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="p-1 rounded-full bg-blue-900/50 mt-0.5">
                    <Stars className="w-3 h-3 text-blue-300" />
                  </div>
                  <p className="text-xs text-gray-300">Content popular with users similar to you</p>
                </div>
              </div>
              <div className="bg-indigo-900/20 rounded-lg p-2 text-xs text-indigo-300 border border-indigo-900/30">
                Each post shows why it was recommended to help you understand your personalized experience.
              </div>
            </div>
          )}

          {/* სატესტო ღილაკები პოსტების შემოწმებისთვის */}
          <div className={`mb-4 p-4 rounded-xl bg-indigo-950/20 border ${THEME.cardBorder} animate-fade-in-up stagger-5`}>
            <h3 className="text-indigo-300 text-sm font-medium mb-3 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-900/50">
                <Settings className="w-4 h-4 text-indigo-300" />
              </div>
              <span>პოსტების ტესტი</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchDirectPosts}
                className={`px-3 py-1.5 text-xs ${THEME.primaryGradient} text-white rounded-lg hover:opacity-90 transition-opacity shadow-md`}
              >
                ბაზიდან პოსტების ჩატვირთვა
              </button>
              <button
                onClick={() => window.location.reload()}
                className={`px-3 py-1.5 text-xs ${THEME.secondaryGradient} text-white rounded-lg hover:opacity-90 transition-opacity shadow-md`}
              >
                გვერდის განახლება
              </button>
              <button
                onClick={() => fetch('/api/test/seed-database').then(res => res.json()).then(data => {
                  console.log('Seed result:', data);
                  if (data.success) {
                    alert('Database seeded successfully! Refreshing...');
                    fetchDirectPosts();
                  } else {
                    alert('Error seeding database: ' + data.error);
                  }
                })}
                className={`px-3 py-1.5 text-xs ${THEME.accentGradient} text-white rounded-lg hover:opacity-90 transition-opacity shadow-md`}
              >
                ბაზის მონაცემების შევსება
              </button>
            </div>
          </div>

          {/* Posts feed */}
          {apiPosts && apiPosts.length > 0 && (
            <div className="posts-feed space-y-4 animate-fade-in-up">
              {displayPosts}
            </div>
          )}
        </main>

        {/* მარჯვენა სვეტი - ჩატი და კონტაქტები */}
        <RightSidebar />
      </div>

      {/* მობილური ნავიგაცია */}
      <MobileNavigation />
    </div>
  );
}