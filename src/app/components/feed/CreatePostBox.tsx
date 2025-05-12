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

  // Handle post submission
  const handleSubmitPost = () => {
    if (!text.trim()) {
      setError('Please enter some content for your post');
      return;
    }

    setSubmitting(true);
    const extractedHashtags = hashtags.length > 0 ? hashtags : extractHashtags(text);

    createPost({
      content: text,
      formattedContent: formattedContent,
      visibility: 'PUBLIC',
      hashtags: extractedHashtags,
      runAiAnalysis: runAiAnalysis,
    });
  };

  return (
    <div className="card mb-4 overflow-hidden">
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Image
            src="https://ui-avatars.com/api/?name=Test+User&background=4CAF50&color=fff"
            alt="Your profile"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
          />

          {!showRichEditor ? (
            <input
              type="text"
              placeholder="What's on your mind?"
              className="flex-1 rounded-full bg-hover-bg px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:outline-none"
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
            <div className="flex-1">
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
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-sm flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {/* Hashtags display */}
        {hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {hashtags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* AI Content Analyzer (conditionally rendered) */}
        {showAnalyzer && text.trim() && (
          <div className="mt-3">
            <ContentAnalyzer
              content={text}
              onSuggestionApply={handleApplySuggestion}
            />
          </div>
        )}

        {/* Post actions and submission */}
        <div className="mt-3 border-t border-border-color pt-2">
          <div className="flex flex-col">
            <div className="flex justify-between mb-2">
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 hover:bg-hover-bg"
                disabled={submitting}
              >
                <VideoIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-text-primary">Live video</span>
              </button>

              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 hover:bg-hover-bg"
                disabled={submitting}
              >
                <ImageIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-text-primary">Photo/video</span>
              </button>

              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 hover:bg-hover-bg"
                disabled={submitting}
              >
                <SmileIcon className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-text-primary">Feeling/activity</span>
              </button>

              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 hover:bg-hover-bg"
                onClick={() => setShowAnalyzer(!showAnalyzer)}
                disabled={!text.trim() || submitting}
              >
                <Zap className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-text-primary">
                  {showAnalyzer ? "Hide Analysis" : "AI Analysis"}
                </span>
              </button>
            </div>

            {/* Post submission */}
            <div className="flex justify-between mt-2">
              <div className="flex items-center">
                <label className="flex items-center text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={runAiAnalysis}
                    onChange={(e) => setRunAiAnalysis(e.target.checked)}
                    className="mr-2"
                    disabled={submitting}
                  />
                  Save AI analysis with post
                </label>
              </div>
              <button
                onClick={handleSubmitPost}
                disabled={!text.trim() || submitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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