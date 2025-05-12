"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import InlineRealityCheck from './InlineRealityCheck';
import { RichTextContent } from '../posts/rich-text';

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
  };
}

export default function Post({ post }: PostProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Reality check state
  const [showRealityCheck, setShowRealityCheck] = useState(false);
  const [realityCheckResult, setRealityCheckResult] = useState<any>(null);
  const [loadingRealityCheck, setLoadingRealityCheck] = useState(false);
  
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

    setLoadingAnalytics(true);
    try {
      const response = await fetch(`/api/test/analyze-post?id=${post.id}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data);
        setShowAnalytics(true);
      } else {
        console.error("Error analyzing post:", data.error);
        alert(`Error analyzing post: ${data.error}`);
      }
    } catch (error) {
      console.error("Error fetching post analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Perform reality check
  const checkReality = async () => {
    if (loadingRealityCheck) return;

    setLoadingRealityCheck(true);
    try {
      const response = await fetch(`/api/test/fact-check?id=${post.id}`);
      const data = await response.json();

      if (data.success) {
        setRealityCheckResult(data);
        setShowRealityCheck(true);
      } else {
        console.error("Error fact-checking post:", data.error);
        alert(`Error fact-checking post: ${data.error}`);
      }
    } catch (error) {
      console.error("Error during reality check:", error);
    } finally {
      setLoadingRealityCheck(false);
    }
  };

  return (
    <article className="card mb-4 overflow-hidden relative">
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
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Link href={`/profile/${post.user.id}`}>
            <Image 
              src={post.user.image}
              alt={post.user.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full"
            />
          </Link>
          <div>
            <Link 
              href={`/profile/${post.user.id}`}
              className="font-semibold text-text-primary hover:underline"
            >
              {post.user.name}
            </Link>
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <span>{new Date(post.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}</span>
              <span>•</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.75 12a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <button className="rounded-full p-2 hover:bg-hover-bg">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* კონტენტი */}
      <div className="px-3 pb-3">
        <Link href={`/posts/${post.id}`} className="block mb-3 text-text-primary hover:underline">
          {post.formattedContent ? (
            <div className="rich-text-content whitespace-normal">
              <RichTextContent jsonContent={post.formattedContent} />
            </div>
          ) : (
            <p className="whitespace-pre-line">{post.content}</p>
          )}
        </Link>

        {post.images && post.images.length > 0 && (
          <Link href={`/posts/${post.id}`} className="block">
            <div className={`overflow-hidden rounded-lg ${post.images.length === 1 ? '' : 'grid grid-cols-2 gap-1'}`}>
              {post.images.map((image, index) => (
                <Image
                  key={index}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  width={500}
                  height={500}
                  className="w-full object-cover"
                  style={{
                    maxHeight: post.images && post.images.length === 1 ? '500px' : '250px',
                    height: post.images && post.images.length === 1 ? 'auto' : '250px'
                  }}
                />
              ))}
            </div>
          </Link>
        )}
      </div>

      {/* ინტერაქციის სტატისტიკა */}
      <div className="border-t border-b border-border-color px-3 py-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-3">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
            <span className="text-sm text-text-secondary">{likesCount}</span>
          </div>
          <div className="flex gap-3 text-sm text-text-secondary">
            <button onClick={() => setShowComments(true)}>{post.comments} comments</button>
            <button>{post.shares} shares</button>
          </div>
        </div>
      </div>

      {/* ინტერაქციის სექცია */}
      <div className="px-3 pt-2 pb-1">
        {/* AI Analysis button - top, primary button */}
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md mb-2 py-2.5
                   bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold
                   hover:from-blue-500 hover:to-purple-500 shadow-md hover:shadow-lg
                   transform hover:scale-[1.02] transition-all duration-200"
          onClick={checkReality}
          disabled={loadingRealityCheck}
        >
          {loadingRealityCheck ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.75 6.75 0 1113.5 0v4.661c0 .326.277.585.6.544.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z" />
              <path fillRule="evenodd" d="M9.013 19.9a.75.75 0 01.877-.597 11.319 11.319 0 004.22 0 .75.75 0 11.28 1.473 12.819 12.819 0 01-4.78 0 .75.75 0 01-.597-.876zM9.754 22.344a.75.75 0 01.824-.668 13.682 13.682 0 002.844 0 .75.75 0 11.156 1.492 15.156 15.156 0 01-3.156 0 .75.75 0 01-.668-.824z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-base">{loadingRealityCheck ? "Analyzing..." : "AI ANALYSIS"}</span>
        </button>

        {/* Like/Comment/Share buttons with counts */}
        <div className="flex border-t border-gray-700 pt-1">
          <button
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 hover:bg-hover-bg ${liked ? 'text-accent-blue' : 'text-text-primary'}`}
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
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-text-primary hover:bg-hover-bg"
            onClick={() => setShowComments(!showComments)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            <span className="font-medium">{post.comments}</span>
          </button>

          <button className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-text-primary hover:bg-hover-bg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            <span className="font-medium">{post.shares}</span>
          </button>
        </div>
      </div>

      {/* Analytics section */}
      {showAnalytics && analytics && (
        <div className="border-t border-border-color px-3 py-3 bg-purple-900/10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-purple-400">Post Analytics</h3>
            <button
              onClick={() => setShowAnalytics(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-400">Published</div>
                <div className="font-medium">{analytics.publishedAt}</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-400">Visibility</div>
                <div className="font-medium">{analytics.visibility}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-400">Words</div>
                <div className="font-medium">{analytics.wordCount}</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-400">Characters</div>
                <div className="font-medium">{analytics.characterCount}</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-400">Media</div>
                <div className="font-medium">{analytics.mediaCount}</div>
              </div>
            </div>

            <div className="bg-gray-800/50 p-2 rounded">
              <div className="text-gray-400">Engagement</div>
              <div className="flex justify-between mt-1">
                <div><span className="font-medium">{analytics.engagementStats.totalReactions}</span> reactions</div>
                <div><span className="font-medium">{analytics.engagementStats.totalComments}</span> comments</div>
                <div><span className="font-medium">{analytics.engagementStats.totalSaves}</span> saves</div>
              </div>
              <div className="mt-1">
                <div className="text-sm">Engagement Score: <span className="font-medium text-purple-400">{analytics.engagementStats.engagementScore}</span></div>
              </div>
            </div>

            {analytics.aiAnalysis && (
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-400">AI Analysis</div>
                <div className="mt-1">
                  <div>Sentiment: <span className="font-medium capitalize">{analytics.aiAnalysis.sentiment}</span></div>
                  {analytics.aiAnalysis.topics.length > 0 && (
                    <div className="mt-1">
                      <div className="text-gray-400">Topics:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analytics.aiAnalysis.topics.map((topic: string, index: number) => (
                          <span key={index} className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs">
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
        <div className="border-t border-border-color px-3 py-3">
          {/* კომენტარის ფორმა */}
          <form onSubmit={handleComment} className="mb-3 flex gap-2">
            <Image 
              src="https://ui-avatars.com/api/?name=Test+User&background=4CAF50&color=fff"
              alt="Your profile" 
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
            <div className="flex flex-1 items-center overflow-hidden rounded-full bg-hover-bg px-3">
              <input 
                type="text" 
                placeholder="Write a comment..."
                className="flex-1 bg-transparent py-1.5 text-text-primary placeholder:text-text-secondary focus:outline-none"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!commentText.trim()}
                className={`text-accent-blue ${!commentText.trim() ? 'opacity-50' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </form>

          {/* კომენტარების ჩვენება */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Image 
                src="https://ui-avatars.com/api/?name=Sarah+Williams&background=E91E63&color=fff"
                alt="Sarah Williams" 
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
              <div>
                <div className="rounded-xl bg-hover-bg px-3 py-2">
                  <Link 
                    href="/profile/1"
                    className="font-semibold text-text-primary hover:underline"
                  >
                    Sarah Williams
                  </Link>
                  <p className="text-text-primary">Great post! Love the updates you're sharing.</p>
                </div>
                <div className="mt-1 flex gap-3 px-3 text-xs text-text-secondary">
                  <button>Like</button>
                  <button>Reply</button>
                  <span>2h</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Image 
                src="https://ui-avatars.com/api/?name=David+Johnson&background=4CAF50&color=fff"
                alt="David Johnson" 
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
              <div>
                <div className="rounded-xl bg-hover-bg px-3 py-2">
                  <Link 
                    href="/profile/2"
                    className="font-semibold text-text-primary hover:underline"
                  >
                    David Johnson
                  </Link>
                  <p className="text-text-primary">Looking forward to seeing more!</p>
                </div>
                <div className="mt-1 flex gap-3 px-3 text-xs text-text-secondary">
                  <button>Like</button>
                  <button>Reply</button>
                  <span>1h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}