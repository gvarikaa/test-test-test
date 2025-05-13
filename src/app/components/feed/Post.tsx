"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { useSession } from 'next-auth/react';
import InlineRealityCheck from './InlineRealityCheck';
import { RichTextContent } from '../posts/rich-text';
import { sanitizeString, sanitizeUrl } from '@/lib/utils/sanitizers';
import { loggers } from '@/lib/utils/debug';
import { ErrorBoundary } from '@/components/error-boundary';
import ChatButton from '../chat/chat-button';

interface Category {
  id: string;
  name: string;
}

interface PostProps {
  post: {
    id: string;
    user: {
      id: string;
      name: string;
      image: string;
    };
    content: string;
    formattedContent?: any;
    images?: string[];
    createdAt: string;
    likes: number;
    comments: number;
    shares: number;
    visibility?: 'PUBLIC' | 'PRIVATE' | 'FRIENDS';
    categories?: Category[] | string[];
    aiAnalyzed?: boolean;
    score?: number;
    trending?: boolean;
  };
}

// Define theme colors for consistent styling
const THEME = {
  primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
  secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
  accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",
  dangerGradient: "bg-gradient-to-r from-rose-600 to-red-700",
  cardBg: "bg-gray-900",
  cardBgHover: "bg-gray-800/80",
  cardBorder: "border-gray-800/40",
  inputBg: "bg-gray-800/70",
  textPrimary: "text-gray-100",
  textSecondary: "text-gray-400",
  glow: "shadow-lg shadow-indigo-950/40"
};

// Create a component-specific error boundary wrapper
const PostErrorFallback = ({ error }: { error: Error }) => (
  <div className={`mb-4 overflow-hidden relative p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 ${THEME.glow}`}>
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-900/30 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-rose-400">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      </div>
      <h4 className="font-medium text-rose-400">Post Display Error</h4>
      <p className="text-sm text-gray-300 mt-1">{error.message || 'Failed to display this post'}</p>
    </div>
  </div>
);

// Main post component
export default function Post({ post }: PostProps) {
  // Get session properly using next-auth's useSession
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reality check state
  const [showRealityCheck, setShowRealityCheck] = useState(false);
  const [realityCheckResult, setRealityCheckResult] = useState<any>(null);
  const [loadingRealityCheck, setLoadingRealityCheck] = useState(false);

  // tRPC mutations
  const analyzePostMutation = trpc.ai.analyzePost.useMutation();
  const factCheckMutation = trpc.ai.factCheckPost.useMutation();

  // Check if user has tokens for AI operations
  const tokenCheck = trpc.ai.checkTokenAvailability.useQuery({
    operationType: 'CONTENT_ANALYSIS',
    variation: 'detailed'
  }, {
    staleTime: 1000 * 60 * 5, // Re-fetch after 5 minutes
    refetchOnWindowFocus: false
  });
  
  const toggleLike = () => {
    if (liked) {
      setLikesCount(likesCount - 1);
    } else {
      setLikesCount(likesCount + 1);
    }
    setLiked(!liked);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      // Would send comment to backend in real implementation
      setCommentText('');
    }
  };

  const analyzePost = async () => {
    if (loadingAnalytics) return;

    // Check if user has enough tokens
    if (!tokenCheck.data?.hasTokens) {
      setError("You don't have enough tokens for this operation. Please upgrade your plan.");
      return;
    }

    setError(null);
    setLoadingAnalytics(true);

    try {
      const data = await analyzePostMutation.mutateAsync({ id: post.id });

      if (data) {
        setAnalytics(data);
        setShowAnalytics(true);
      }
    } catch (error) {
      console.error("Error analyzing post:", error);
      setError(error instanceof Error ? error.message : "An error occurred while analyzing the post");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Perform reality check
  const checkReality = async () => {
    if (loadingRealityCheck) return;

    // Check if user has enough tokens
    if (!tokenCheck.data?.hasTokens) {
      setError("You don't have enough tokens for this operation. Please upgrade your plan.");
      return;
    }

    setError(null);
    setLoadingRealityCheck(true);

    try {
      const data = await factCheckMutation.mutateAsync({ id: post.id });

      if (data) {
        setRealityCheckResult(data);
        setShowRealityCheck(true);
      }
    } catch (error) {
      console.error("Error during reality check:", error);
      setError(error instanceof Error ? error.message : "An error occurred during fact-checking");
    } finally {
      setLoadingRealityCheck(false);
    }
  };

  // Sanitize potentially unsafe data
  const sanitizedPost = {
    ...post,
    content: sanitizeString(post.content),
    user: {
      ...post.user,
      name: sanitizeString(post.user.name),
      image: sanitizeUrl(post.user.image),
    }
  };

  // Log post rendering for debugging
  useEffect(() => {
    loggers.ui.debug(`Rendering post: ${post.id}`);

    // Track performance if needed
    const startTime = performance.now();
    return () => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 100) { // Log slow renders
        loggers.performance.info(`Post render took ${renderTime}ms`, { 
          extra: { postId: post.id, renderTime } 
        });
      }
    };
  }, [post.id]);

  return (
    <ErrorBoundary fallback={<PostErrorFallback error={new Error('Failed to render post')} />}>
      <article className={`mb-4 overflow-hidden relative rounded-xl ${THEME.cardBg} ${THEME.cardBorder} border ${THEME.glow} backdrop-blur-md transition-all duration-300 ease-in-out hover:scale-[1.01]`} style={{animation: 'fadeIn 0.5s ease-out forwards'}}>
      {/* Error message */}
      {error && (
        <div className={`${THEME.dangerGradient} bg-opacity-20 border border-rose-800/40 text-rose-200 p-3 mb-3 rounded-md backdrop-blur-sm`}>
          <p className="text-sm font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-400">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Inline reality check */}
      {showRealityCheck && realityCheckResult && (
        <div className="mb-4">
          <InlineRealityCheck
            result={realityCheckResult.realityCheck}
            postContent={post.content}
            mediaUrls={post.images}
            onClose={() => setShowRealityCheck(false)}
          />
        </div>
      )}

      {/* ჰედერი */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.user.id}`} className="relative group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-70 blur-sm group-hover:opacity-100 transition-all duration-300"></div>
            <Image
              src={sanitizedPost.user.image || 'https://ui-avatars.com/api/?name=Unknown+User&background=random&color=fff'}
              alt={post.user.name || 'Unknown User'}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full relative z-10 ring-2 ring-gray-900 p-0.5 group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.user.id}`}
                  className={`font-semibold ${THEME.textPrimary} hover:text-indigo-300 transition-colors duration-200`}
                >
                  {sanitizedPost.user.name || 'Unknown User'}
                </Link>

                {/* Chat button - only show if not current user */}
                {session?.user?.id !== post.user.id && (
                  <ChatButton userId={post.user.id} size="sm" className="bg-indigo-600/80 hover:bg-indigo-500" />
                )}
              </div>
              <div className={`flex items-center gap-1 text-xs ${THEME.textSecondary}`}>
                <span>{new Date(post.createdAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}</span>
                <span className="text-indigo-400/60">•</span>

                {/* Show the post visibility status with an icon */}
                {post.visibility === 'PUBLIC' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-indigo-400" title="Public">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                  </svg>
                ) : post.visibility === 'PRIVATE' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-indigo-400" title="Private">
                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-indigo-400" title="Friends">
                    <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                    <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                  </svg>
                )}
              </div>

              {/* Display post categories/topics if available */}
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {post.categories.map((category, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/30">
                      #{category.name || category}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <button className="rounded-full p-2 hover:bg-gray-800/50 text-gray-400 hover:text-gray-200 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* კონტენტი */}
      <div className="px-4 pb-4">
        {/* Badges container */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* AI recommendation badge */}
          {post.aiAnalyzed && post.score && post.score > 0.7 && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-300 border border-indigo-600/30 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-indigo-400">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              AI Recommended
            </span>
          )}

          {/* Trending badge */}
          {post.trending && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-300 border border-amber-600/30 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-400">
                <path fillRule="evenodd" d="M15.22 6.268a.75.75 0 01.44.96l-1.39 4.173a.75.75 0 01-.96.44l-4.172-1.39a.75.75 0 01-.44-.96l1.39-4.173a.75.75 0 01.96-.44l4.172 1.39zM8.878 15.61l-1.39 4.172a.75.75 0 01-.96.44l-4.173-1.39a.75.75 0 01-.44-.96l1.39-4.172a.75.75 0 01.96-.44l4.173 1.39a.75.75 0 01.44.96zM7.875 7.343l-1.39-4.173a.75.75 0 01.96-.44l4.172 1.39a.75.75 0 01.44.96l-1.39 4.173a.75.75 0 01-.96.44l-4.172-1.39a.75.75 0 01-.44-.96zM19.753 14.613l-4.172 1.39a.75.75 0 01-.96-.44l-1.39-4.173a.75.75 0 01.44-.96l4.173-1.39a.75.75 0 01.96.44l1.39 4.173a.75.75 0 01-.44.96z" clipRule="evenodd" />
              </svg>
              Trending
            </span>
          )}
        </div>

        {/* Post content */}
        <Link href={`/posts/${post.id}`} className={`block mb-4 ${THEME.textPrimary} hover:text-indigo-300 transition-colors duration-200`}>
          {post.formattedContent ? (
            <div className="rich-text-content whitespace-normal">
              <RichTextContent jsonContent={post.formattedContent} />
            </div>
          ) : (
            <p className="whitespace-pre-line leading-relaxed">{sanitizedPost.content}</p>
          )}
        </Link>

        {/* Images section */}
        {post.images && post.images.length > 0 && (
          <Link href={`/posts/${post.id}`} className="block">
            <div className={`overflow-hidden rounded-xl ${THEME.glow} ${post.images.length === 1 ? '' : 'grid grid-cols-2 gap-2'}`}>
              {post.images.map((image, index) => (
                <div key={index} className="relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/0 to-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                  <Image
                    src={image}
                    alt={`Post image ${index + 1}`}
                    width={500}
                    height={500}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{
                      maxHeight: post.images && post.images.length === 1 ? '500px' : '250px',
                      height: post.images && post.images.length === 1 ? 'auto' : '250px'
                    }}
                  />
                </div>
              ))}
            </div>
          </Link>
        )}
      </div>

      {/* ინტერაქციის სტატისტიკა */}
      <div className="border-t border-gray-800/40 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 shadow-md shadow-indigo-900/40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-3.5">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
            <span className="text-sm text-indigo-300">{likesCount}</span>
          </div>
          <div className="flex gap-4 text-sm text-gray-400">
            <button
              onClick={() => setShowComments(true)}
              className="hover:text-indigo-300 transition-colors duration-200"
            >
              {post.comments} comments
            </button>
            <button className="hover:text-indigo-300 transition-colors duration-200">
              {post.shares} shares
            </button>
          </div>
        </div>
      </div>

      {/* ინტერაქციის სექცია */}
      <div className="px-4 pt-2 pb-3">
        {/* AI Analysis button - top, primary button */}
        <button
          className={`flex w-full items-center justify-center gap-2 rounded-lg mb-3 py-2.5
                   ${!tokenCheck.data?.hasTokens
                   ? 'bg-gradient-to-r from-gray-700 to-gray-800 cursor-not-allowed'
                   : `${THEME.primaryGradient} hover:from-indigo-500 hover:to-purple-600 transform hover:scale-[1.02]`}
                   text-white font-semibold shadow-md shadow-indigo-950/40 hover:shadow-lg hover:shadow-indigo-900/50 transition-all duration-300`}
          onClick={checkReality}
          disabled={loadingRealityCheck || !tokenCheck.data?.hasTokens || tokenCheck.isLoading}
          title={!tokenCheck.data?.hasTokens ? "Not enough tokens for this operation" : "Analyze this post with AI"}
        >
          {loadingRealityCheck ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : tokenCheck.isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : !tokenCheck.data?.hasTokens ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.75 6.75 0 1113.5 0v4.661c0 .326.277.585.6.544.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z" />
              <path fillRule="evenodd" d="M9.013 19.9a.75.75 0 01.877-.597 11.319 11.319 0 004.22 0 .75.75 0 11.28 1.473 12.819 12.819 0 01-4.78 0 .75.75 0 01-.597-.876zM9.754 22.344a.75.75 0 01.824-.668 13.682 13.682 0 002.844 0 .75.75 0 11.156 1.492 15.156 15.156 0 01-3.156 0 .75.75 0 01-.668-.824z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-base">
            {loadingRealityCheck
              ? "Analyzing..."
              : tokenCheck.isLoading
                ? "Checking tokens..."
                : !tokenCheck.data?.hasTokens
                  ? "Insufficient tokens"
                  : "AI ANALYSIS"}
          </span>
        </button>

        {/* Like/Comment/Share buttons with counts */}
        <div className="flex border-t border-gray-800/40 pt-2">
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 hover:bg-gray-800/50 transition-colors duration-200 ${liked ? 'text-pink-500' : 'text-gray-300'}`}
            onClick={toggleLike}
          >
            {liked ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
            <span className="font-medium">{likesCount}</span>
          </button>

          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-gray-300 hover:bg-gray-800/50 hover:text-indigo-300 transition-colors duration-200"
            onClick={() => setShowComments(!showComments)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            <span className="font-medium">{post.comments}</span>
          </button>

          <button className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-gray-300 hover:bg-gray-800/50 hover:text-indigo-300 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            <span className="font-medium">{post.shares}</span>
          </button>
        </div>
      </div>

      {/* Analytics section */}
      {showAnalytics && analytics && (
        <div className="border-t border-gray-800/40 px-4 py-4 bg-gradient-to-br from-indigo-950/60 to-purple-950/60 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-indigo-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400">
                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm4.5 7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm3.75-1.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V12zm2.25-3a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0V9.75A.75.75 0 0113.5 9zm3.75-1.5a.75.75 0 00-1.5 0v9a.75.75 0 001.5 0v-9z" clipRule="evenodd" />
              </svg>
              Post Analytics
            </h3>
            <button
              onClick={() => setShowAnalytics(false)}
              className="text-gray-400 hover:text-indigo-300 transition-colors p-1 rounded-full hover:bg-gray-800/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/70 p-3 rounded-lg border border-indigo-900/30 shadow-sm shadow-indigo-900/20">
                <div className="text-indigo-400 mb-1">Published</div>
                <div className="font-medium text-gray-200">{analytics.publishedAt}</div>
              </div>
              <div className="bg-gray-900/70 p-3 rounded-lg border border-indigo-900/30 shadow-sm shadow-indigo-900/20">
                <div className="text-indigo-400 mb-1">Visibility</div>
                <div className="font-medium text-gray-200 flex items-center gap-1.5">
                  {analytics.visibility === 'PUBLIC' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-400">
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-400">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                  )}
                  {analytics.visibility}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900/70 p-3 rounded-lg border border-indigo-900/30 shadow-sm shadow-indigo-900/20">
                <div className="text-indigo-400 mb-1">Words</div>
                <div className="font-medium text-gray-200">{analytics.wordCount}</div>
              </div>
              <div className="bg-gray-900/70 p-3 rounded-lg border border-indigo-900/30 shadow-sm shadow-indigo-900/20">
                <div className="text-indigo-400 mb-1">Characters</div>
                <div className="font-medium text-gray-200">{analytics.characterCount}</div>
              </div>
              <div className="bg-gray-900/70 p-3 rounded-lg border border-indigo-900/30 shadow-sm shadow-indigo-900/20">
                <div className="text-indigo-400 mb-1">Media</div>
                <div className="font-medium text-gray-200">{analytics.mediaCount}</div>
              </div>
            </div>

            <div className="bg-gray-900/70 p-3 rounded-lg border border-indigo-900/30 shadow-sm shadow-indigo-900/20">
              <div className="text-indigo-400 mb-1">Engagement</div>
              <div className="flex justify-between mt-1">
                <div className="flex flex-col items-center p-2 bg-indigo-950/40 rounded-lg">
                  <span className="font-semibold text-indigo-300 text-lg">{analytics.engagementStats.totalReactions}</span>
                  <span className="text-xs text-gray-400">reactions</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-indigo-950/40 rounded-lg">
                  <span className="font-semibold text-indigo-300 text-lg">{analytics.engagementStats.totalComments}</span>
                  <span className="text-xs text-gray-400">comments</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-indigo-950/40 rounded-lg">
                  <span className="font-semibold text-indigo-300 text-lg">{analytics.engagementStats.totalSaves}</span>
                  <span className="text-xs text-gray-400">saves</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-300">Engagement Score:</div>
                <div className="text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">{analytics.engagementStats.engagementScore}</div>
              </div>
            </div>

            {analytics.aiAnalysis && (
              <div className="bg-gray-900/70 p-3 rounded-lg border border-indigo-900/30 shadow-sm shadow-indigo-900/20">
                <div className="text-indigo-400 mb-2 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.75 6.75 0 1113.5 0v4.661c0 .326.277.585.6.544.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z" />
                    <path fillRule="evenodd" d="M9.013 19.9a.75.75 0 01.877-.597 11.319 11.319 0 004.22 0 .75.75 0 11.28 1.473 12.819 12.819 0 01-4.78 0 .75.75 0 01-.597-.876zM9.754 22.344a.75.75 0 01.824-.668 13.682 13.682 0 002.844 0 .75.75 0 11.156 1.492 15.156 15.156 0 01-3.156 0 .75.75 0 01-.668-.824z" clipRule="evenodd" />
                  </svg>
                  AI Analysis
                </div>
                <div className="mt-2">
                  <div className="flex justify-between items-center bg-indigo-950/40 p-2 rounded-lg">
                    <div className="text-sm text-gray-300">Sentiment:</div>
                    <span className="font-medium capitalize px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300">
                      {analytics.aiAnalysis.sentiment}
                    </span>
                  </div>
                  {analytics.aiAnalysis.topics.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-300 mb-2">Topics:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {analytics.aiAnalysis.topics.map((topic: string, index: number) => (
                          <span key={index} className="px-2.5 py-1 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 text-indigo-200 rounded-full text-xs border border-indigo-700/30">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* კომენტარების სექცია */}
      {showComments && (
        <div className="border-t border-gray-800/40 px-4 py-4 bg-gradient-to-b from-gray-900/60 to-gray-900/30">
          {/* კომენტარის ფორმა */}
          <form onSubmit={handleComment} className="mb-4 flex gap-3">
            <div className="relative group">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-50 blur-[2px] group-hover:opacity-100 transition-all duration-300"></div>
              <Image
                src={session?.user?.image || "https://ui-avatars.com/api/?name=User&background=4CAF50&color=fff"}
                alt="Your profile"
                width={32}
                height={32}
                className="h-9 w-9 rounded-full relative z-10 ring-2 ring-gray-900 border border-gray-800 group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-1 items-center overflow-hidden rounded-full bg-gray-800/70 border border-gray-700/30 px-4 shadow-inner shadow-black/20">
              <input
                type="text"
                placeholder="Write a comment..."
                className="flex-1 bg-transparent py-2 text-gray-200 placeholder:text-gray-500 focus:outline-none"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className={`text-indigo-400 hover:text-indigo-300 transition-colors ${!commentText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </form>

          {/* კომენტარების ჩვენება */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 opacity-40 blur-[2px]"></div>
                <Image
                  src="https://ui-avatars.com/api/?name=Sarah+Williams&background=E91E63&color=fff"
                  alt="Sarah Williams"
                  width={32}
                  height={32}
                  className="h-9 w-9 rounded-full relative z-10 ring-2 ring-gray-900 border border-gray-800"
                />
              </div>
              <div className="flex-1">
                <div className="rounded-xl px-4 py-2.5 bg-gray-800/60 border border-gray-700/30 shadow-sm">
                  <Link
                    href="/profile/1"
                    className="font-semibold text-gray-200 hover:text-indigo-300 transition-colors"
                  >
                    Sarah Williams
                  </Link>
                  <p className="text-gray-300 mt-1">Great post! Love the updates you're sharing.</p>
                </div>
                <div className="mt-1.5 flex gap-4 px-3 text-xs text-gray-500">
                  <button className="hover:text-indigo-400 transition-colors">Like</button>
                  <button className="hover:text-indigo-400 transition-colors">Reply</button>
                  <span>2h</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 opacity-40 blur-[2px]"></div>
                <Image
                  src="https://ui-avatars.com/api/?name=David+Johnson&background=4CAF50&color=fff"
                  alt="David Johnson"
                  width={32}
                  height={32}
                  className="h-9 w-9 rounded-full relative z-10 ring-2 ring-gray-900 border border-gray-800"
                />
              </div>
              <div className="flex-1">
                <div className="rounded-xl px-4 py-2.5 bg-gray-800/60 border border-gray-700/30 shadow-sm">
                  <Link
                    href="/profile/2"
                    className="font-semibold text-gray-200 hover:text-indigo-300 transition-colors"
                  >
                    David Johnson
                  </Link>
                  <p className="text-gray-300 mt-1">Looking forward to seeing more!</p>
                </div>
                <div className="mt-1.5 flex gap-4 px-3 text-xs text-gray-500">
                  <button className="hover:text-indigo-400 transition-colors">Like</button>
                  <button className="hover:text-indigo-400 transition-colors">Reply</button>
                  <span>1h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
    </ErrorBoundary>
  );
}