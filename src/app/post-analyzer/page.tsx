"use client";

import { useState } from "react";
import { PostAnalysisManager } from "@/app/components/posts/post-analysis-manager";
import { Sparkles, PenLine } from "lucide-react";

export default function PostAnalyzerDemo() {
  const [content, setContent] = useState("");

  // Function to apply suggestion to content
  const applySuggestion = (suggestion: string) => {
    // Simple implementation - append the suggestion to the content
    // In a real implementation, you might want to be more sophisticated about how suggestions are applied
    setContent((prev) => prev.trim() + "\n\n" + suggestion);
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-center mb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Post Analyzer Demo
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Write your post content below and our AI will analyze it for tone, sentiment, and engagement potential.
            Get visualization of key metrics and suggestions to improve your content.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Write Your Post</h2>
          </div>

          <div className="rounded-lg border border-border">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your post content here..."
              className="w-full h-64 p-4 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />

            <div className="p-4 border-t border-border bg-card/50 rounded-b-lg">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {content.length} characters
                </div>
                <button
                  onClick={() => setContent("")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Sample Content Templates */}
          <div className="mt-6 p-4 border border-border rounded-lg">
            <h3 className="font-medium mb-2">Sample Templates</h3>
            <div className="space-y-2">
              <button
                onClick={() => setContent("I'm excited to announce our new product launch! This innovative solution will transform how you work and boost productivity. We've been working on this for months and can't wait for you to try it.")}
                className="w-full p-2 text-left bg-muted rounded-md hover:bg-muted/70 text-sm transition-colors"
              >
                Product Announcement
              </button>
              <button
                onClick={() => setContent("Today I want to share my personal journey about overcoming challenges in my career. It wasn't always easy, but I learned valuable lessons about persistence and growth mindset along the way.")}
                className="w-full p-2 text-left bg-muted rounded-md hover:bg-muted/70 text-sm transition-colors"
              >
                Personal Story
              </button>
              <button
                onClick={() => setContent("Let me tell you why this company is terrible and their customer service is the worst I've ever experienced. I'll never shop there again after what happened yesterday!")}
                className="w-full p-2 text-left bg-muted rounded-md hover:bg-muted/70 text-sm transition-colors"
              >
                Negative Review
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Content Analysis</h2>
          </div>

          {/* Integrated Analysis Manager Component */}
          <PostAnalysisManager
            content={content}
            onSuggestionApply={applySuggestion}
          />
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Powered by AI content analysis and visualization tools. This is a demo of how content can be analyzed and visualized.
        </p>
      </div>
    </div>
  );
}