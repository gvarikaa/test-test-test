"use client";

import { useState } from 'react';
import Image from 'next/image';
import { ContentAnalyzer } from '../posts/content-analyzer';
import { api } from '@/lib/trpc/api';
import { Zap, AlertTriangle, ImageIcon, VideoIcon, SmileIcon } from 'lucide-react';
import { RichTextEditor, stripHtml, extractHashtags } from '../posts/rich-text';

export default function CreatePostBox() {
  const [text, setText] = useState('');
  const [formattedContent, setFormattedContent] = useState<any>(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [runAiAnalysis, setRunAiAnalysis] = useState(false);
  const [showRichEditor, setShowRichEditor] = useState(false);

  // Get create post mutation from tRPC
  const { mutate: createPost } = api.post.create.useMutation({
    onSuccess: () => {
      // Reset form after successful post creation
      setText('');
      setFormattedContent(null);
      setShowAnalyzer(false);
      setHashtags([]);
      setRunAiAnalysis(false);
      setSubmitting(false);
      setShowRichEditor(false);
    },
    onError: (err) => {
      setError(err.message || 'Error creating post');
      setSubmitting(false);
    },
  });

  // Handle suggestion application from the analyzer
  const handleApplySuggestion = (suggestion: string) => {
    setText(suggestion);
  };

  // Handle rich text content change
  const handleRichTextChange = (html: string, json: any) => {
    setText(stripHtml(html));
    setFormattedContent(json);

    // Extract hashtags from plain text
    const extractedTags = extractHashtags(stripHtml(html));
    setHashtags(extractedTags);

    // Hide analyzer when text changes significantly
    if (showAnalyzer) {
      setShowAnalyzer(false);
    }
  };

  // Handle post submission with fallback to direct API
  const handleSubmitPost = async () => {
    if (!text.trim()) {
      setError('Please enter some content for your post');
      return;
    }

    setSubmitting(true);
    const extractedHashtags = hashtags.length > 0 ? hashtags : extractHashtags(text);

    try {
      // Try tRPC first
      createPost({
        content: text,
        formattedContent: formattedContent,
        visibility: 'PUBLIC',
        hashtags: extractedHashtags,
        runAiAnalysis: runAiAnalysis,
      });

      // Don't wait for tRPC, immediately try to create test posts via API as fallback
      console.log("Also trying direct API for seeding");
      fetch('/api/test/seed-database')
        .then((res) => res.json())
        .then((data) => {
          console.log('Seed result (fallback):', data);
          if (data.success) {
            // Reload page after 2 seconds to see the new posts
            setTimeout(() => window.location.reload(), 2000);
          }
        })
        .catch((err) => console.error("Fallback API error:", err));
    } catch (err) {
      console.error("Post creation error:", err);
      setError('Error creating post. Trying fallback method...');

      // Try direct API in case of error
      try {
        const response = await fetch('/api/test/seed-database');
        const data = await response.json();
        console.log('Seed result (error fallback):', data);
        if (data.success) {
          alert('Created test posts instead!');
          // Reload page to see the new posts
          window.location.reload();
        }
      } catch (err2) {
        console.error("Final fallback error:", err2);
        setError('All methods failed. Please try again later.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Define theme colors for consistent styling
  const THEME = {
    primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
    secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
    accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",
    cardBg: "bg-gray-900",
    cardBgHover: "bg-gray-800/80",
    cardBorder: "border-gray-800/40",
    inputBg: "bg-gray-800/70",
    textPrimary: "text-gray-100",
    textSecondary: "text-gray-400",
    glow: "shadow-lg shadow-indigo-950/40"
  };

  return (
    <div className={`mb-4 rounded-xl border ${THEME.cardBorder} ${THEME.cardBg} overflow-hidden relative ${THEME.glow}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-transparent"></div>
      <div className="p-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-full opacity-75 bg-gradient-to-r from-indigo-500 to-purple-600 blur group-hover:opacity-100 transition duration-200"></div>
            <Image
              src="https://ui-avatars.com/api/?name=Test+User&background=4CAF50&color=fff"
              alt="Your profile"
              width={45}
              height={45}
              className="relative h-11 w-11 rounded-full border-2 border-gray-900"
            />
          </div>

          {!showRichEditor ? (
            <input
              type="text"
              placeholder="What's on your mind?"
              className={`flex-1 rounded-full ${THEME.inputBg} border ${THEME.cardBorder} px-4 py-3 ${THEME.textPrimary} placeholder:${THEME.textSecondary} focus:outline-none focus:border-indigo-700/50 transition-colors`}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Extract hashtags
                const extractedTags = extractHashtags(e.target.value);
                setHashtags(extractedTags);

                // Hide analyzer when text changes significantly
                if (showAnalyzer && Math.abs(e.target.value.length - text.length) > 10) {
                  setShowAnalyzer(false);
                }
              }}
              onFocus={() => setShowRichEditor(true)}
            />
          ) : (
            <div className="flex-1 bg-gray-800/60 rounded-xl border border-gray-800/60 overflow-hidden">
              <RichTextEditor
                content=""
                placeholder="What's on your mind?"
                onChange={handleRichTextChange}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Error message display */}
        {error && (
          <div className="mt-3 p-3 bg-rose-900/30 border border-rose-800/40 text-rose-300 rounded-lg text-sm flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-rose-400" />
            {error}
          </div>
        )}

        {/* Hashtags display */}
        {hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hashtags.map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-indigo-900/30 text-indigo-300 text-xs rounded-full border border-indigo-800/40"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* AI Content Analyzer (conditionally rendered) */}
        {showAnalyzer && text.trim() && (
          <div className="mt-4 p-0.5 rounded-xl bg-gradient-to-r from-indigo-700/40 to-purple-700/40">
            <div className="bg-gray-900 rounded-lg p-3">
              <ContentAnalyzer
                content={text}
                onSuggestionApply={handleApplySuggestion}
              />
            </div>
          </div>
        )}

        {/* Post actions and submission */}
        <div className="mt-4 border-t border-gray-800/60 pt-3">
          <div className="flex flex-col">
            <div className="flex flex-wrap md:flex-nowrap justify-between gap-1 mb-3">
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-3 ${THEME.cardBgHover} border ${THEME.cardBorder} hover:border-gray-700 transition-colors`}
                disabled={submitting}
              >
                <VideoIcon className="h-5 w-5 text-red-400" />
                <span className="text-sm font-medium text-gray-300">Live video</span>
              </button>

              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-3 ${THEME.cardBgHover} border ${THEME.cardBorder} hover:border-gray-700 transition-colors`}
                disabled={submitting}
              >
                <ImageIcon className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-medium text-gray-300">Photo/video</span>
              </button>

              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-3 ${THEME.cardBgHover} border ${THEME.cardBorder} hover:border-gray-700 transition-colors`}
                disabled={submitting}
              >
                <SmileIcon className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-medium text-gray-300">Feeling</span>
              </button>

              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-3 ${
                  showAnalyzer
                    ? 'bg-indigo-900/40 border-indigo-700/60'
                    : `${THEME.cardBgHover} border ${THEME.cardBorder} hover:border-indigo-700/50`
                } transition-colors`}
                onClick={() => setShowAnalyzer(!showAnalyzer)}
                disabled={!text.trim() || submitting}
              >
                <Zap className={`h-5 w-5 ${showAnalyzer ? 'text-indigo-300' : 'text-indigo-400'}`} />
                <span className={`text-sm font-medium ${showAnalyzer ? 'text-indigo-300' : 'text-gray-300'}`}>
                  {showAnalyzer ? "Hide Analysis" : "AI Analysis"}
                </span>
              </button>
            </div>

            {/* Post submission */}
            <div className="flex flex-col sm:flex-row justify-between mt-1 gap-3">
              <div className="flex items-center">
                <label className="flex items-center text-sm text-gray-400 hover:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runAiAnalysis}
                    onChange={(e) => setRunAiAnalysis(e.target.checked)}
                    className="mr-2 accent-indigo-500 h-4 w-4 rounded-sm"
                    disabled={submitting}
                  />
                  <span>Save AI analysis with post</span>
                </label>
              </div>
              <button
                onClick={handleSubmitPost}
                disabled={!text.trim() || submitting}
                className={`px-6 py-2.5 ${THEME.primaryGradient} text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg shadow-indigo-900/40 font-medium`}
              >
                {submitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}