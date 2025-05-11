"use client";

import { useState } from "react";
import { ContentAnalyzer } from "./content-analyzer";
import { PostAnalysisDisplay } from "./post-analysis-display";
import { ContentAnalysis } from "@/lib/gemini";
import { Sparkles } from "lucide-react";

interface PostAnalysisManagerProps {
  content: string;
  onSuggestionApply?: (suggestion: string) => void;
  className?: string;
}

export function PostAnalysisManager({ 
  content, 
  onSuggestionApply,
  className = "" 
}: PostAnalysisManagerProps) {
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [tokenUsage, setTokenUsage] = useState(0);

  // Handler for when content analysis is complete
  const handleAnalysisComplete = (analysisResult: ContentAnalysis, tokens: number) => {
    setAnalysis(analysisResult);
    setTokenUsage(tokens);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Content Analyzer Component */}
      <ContentAnalyzer 
        content={content} 
        onSuggestionApply={onSuggestionApply}
        onAnalysisComplete={handleAnalysisComplete}
      />

      {/* Analysis Visualization (shown only when analysis is available) */}
      {analysis ? (
        <PostAnalysisDisplay 
          analysis={analysis} 
          tokenUsage={tokenUsage} 
        />
      ) : content ? (
        <div className="p-6 border border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-center text-muted-foreground">
          <Sparkles className="w-10 h-10 mb-3 opacity-50" />
          <p>Click "Analyze Content" above to visualize your post analysis</p>
        </div>
      ) : null}
    </div>
  );
}