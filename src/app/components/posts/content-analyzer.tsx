"use client";

import { useState } from "react";
import { ContentAnalysis } from "@/lib/gemini";
import { api } from "@/lib/trpc/api";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, ThumbsUp, ThumbsDown, Zap, Lightbulb } from "lucide-react";

interface ContentAnalyzerProps {
  content: string;
  onSuggestionApply?: (suggestion: string) => void;
}

export function ContentAnalyzer({ content, onSuggestionApply }: ContentAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState(0);

  // tRPC mutation to analyze content
  const { mutate: analyzeContent } = api.ai.analyzeContent.useMutation({
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      setTokenUsage(data.tokenUsage);
      setIsAnalyzing(false);
    },
    onError: (err) => {
      setError(err.message || "Failed to analyze content");
      setIsAnalyzing(false);
    },
  });

  const handleAnalyze = () => {
    if (!content.trim()) {
      setError("Please enter some content to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    analyzeContent({ content });
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="w-5 h-5 text-green-500" />;
      case "negative":
        return <ThumbsDown className="w-5 h-5 text-red-500" />;
      case "mixed":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Check className="w-5 h-5 text-blue-500" />;
    }
  };

  const getEngagementColor = (prediction: string) => {
    switch (prediction) {
      case "high":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="w-full bg-muted/20 rounded-lg p-4 border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          AI Content Analysis
        </h3>
        {analysis ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? "Show Less" : "Show More"}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Powered by Gemini AI</span>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !content.trim()}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Analyze Content
        </button>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Analyzing your content...</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-muted p-2 rounded-full">
                {getSentimentIcon(analysis.sentiment)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sentiment</p>
                <p className="font-medium capitalize">{analysis.sentiment}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-muted p-2 rounded-full">
                <Zap className={`w-5 h-5 ${getEngagementColor(analysis.engagementPrediction)}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Engagement</p>
                <p className="font-medium capitalize">{analysis.engagementPrediction}</p>
              </div>
            </div>
          </div>

          {isExpanded && (
            <>
              <div>
                <p className="text-sm font-medium mb-1">Topics</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted text-xs rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.entities.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Entities</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.entities.map((entity, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted text-xs rounded-full flex items-center gap-1"
                      >
                        <span className="text-muted-foreground">{entity.type}:</span>
                        {entity.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Tone</p>
                <p className="text-sm">{analysis.tone}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Suggestions</p>
                <ul className="space-y-2">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{suggestion}</p>
                        {onSuggestionApply && (
                          <button
                            onClick={() => onSuggestionApply(suggestion)}
                            className="text-xs text-primary hover:underline mt-1"
                          >
                            Apply this suggestion
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Engagement Prediction</p>
                <p className="text-sm">{analysis.reasonForEngagementPrediction}</p>
              </div>
            </>
          )}

          <div className="text-xs text-muted-foreground">
            {`Token usage: ${tokenUsage} tokens`}
          </div>
        </div>
      )}
    </div>
  );
}