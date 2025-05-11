"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/trpc/api';
import { 
  FileText, 
  Check,
  AlertCircle, 
  Loader, 
  Lightbulb, 
  Sparkles, 
  FileSparkles,
  ThumbsUp,
  Gauge,
  Scroll,
  MessageSquare
} from 'lucide-react';

interface LanguageAnalyzerProps {
  initialText?: string;
  language?: string;
  onAnalysisComplete?: (analysis: any) => void;
  className?: string;
}

export default function LanguageAnalyzer({
  initialText = '',
  language,
  onAnalysisComplete,
  className = ''
}: LanguageAnalyzerProps) {
  const [text, setText] = useState(initialText);
  const [analysisLanguage, setAnalysisLanguage] = useState(language);
  const [analysisRequested, setAnalysisRequested] = useState(false);
  
  // Get supported languages
  const { data: supportedLanguages, isLoading: isLoadingLanguages } = api.ai.getSupportedLanguages.useQuery();
  
  // Language analysis mutation
  const { 
    mutate: analyzeLanguage, 
    data: analysis, 
    isLoading: isAnalyzing, 
    error: analysisError 
  } = api.ai.analyzeLanguageQuality.useMutation({
    onSuccess: (data) => {
      setAnalysisRequested(false);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    },
    onError: () => {
      setAnalysisRequested(false);
    }
  });
  
  // Language detection effect when text changes significantly
  useEffect(() => {
    if (initialText && !text) {
      setText(initialText);
    }
  }, [initialText, text]);
  
  // Handle analysis request
  const handleAnalyzeText = () => {
    if (text) {
      setAnalysisRequested(true);
      analyzeLanguage({
        text,
        language: analysisLanguage
      });
    }
  };
  
  // Get color for severity
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'text-yellow-500';
      case 'moderate': return 'text-orange-500';
      case 'major': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };
  
  // Get icon for formality level
  const getFormalityIcon = (formality: string) => {
    switch (formality) {
      case 'formal': return <Scroll className="h-4 w-4" />;
      case 'informal': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };
  
  // Get color for complexity
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'text-green-500';
      case 'standard': return 'text-blue-500';
      case 'complex': return 'text-purple-500';
      case 'technical': return 'text-violet-600';
      default: return 'text-blue-500';
    }
  };
  
  return (
    <div className={`border rounded-lg bg-card ${className}`}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Language Quality Analysis</h3>
        </div>
      </div>
      
      {/* Main content */}
      <div className="p-4">
        {/* Language selection and input */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">Language:</label>
            <select
              value={analysisLanguage || ''}
              onChange={(e) => setAnalysisLanguage(e.target.value || undefined)}
              className="text-sm bg-muted px-2 py-1 rounded"
              disabled={isAnalyzing}
            >
              <option value="">Auto-detect</option>
              {isLoadingLanguages ? (
                <option disabled>Loading languages...</option>
              ) : (
                supportedLanguages?.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to analyze..."
            className="w-full h-24 p-3 rounded-md border bg-muted/30 text-sm"
            disabled={isAnalyzing}
          />
          
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAnalyzeText}
              disabled={isAnalyzing || !text || text.length < 10}
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-1 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze Text
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Analysis results */}
        {analysis && (
          <div className="mt-4 space-y-4">
            {/* Basic information */}
            <div className="bg-muted/20 p-3 rounded-md">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <FileText className="h-4 w-4 text-primary" />
                General Analysis
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="text-sm">{analysis.languageName} ({analysis.language})</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Formality</p>
                  <p className="text-sm flex items-center gap-1">
                    {getFormalityIcon(analysis.formalityLevel)}
                    <span className="capitalize">{analysis.formalityLevel}</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Complexity</p>
                  <p className={`text-sm flex items-center gap-1 ${getComplexityColor(analysis.complexity)}`}>
                    <Gauge className="h-4 w-4" />
                    <span className="capitalize">{analysis.complexity}</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Tone</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.toneAssessment.slice(0, 3).map((tone, index) => (
                      <span 
                        key={index} 
                        className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full"
                      >
                        {tone}
                      </span>
                    ))}
                    {analysis.toneAssessment.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{analysis.toneAssessment.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Suggestions */}
            {analysis.suggestions && analysis.suggestions.length > 0 && (
              <div className="bg-primary/5 p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Improvement Suggestions
                </h4>
                
                <ul className="space-y-1">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-1 text-sm">
                      <span className="mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Grammar issues */}
            {analysis.grammarIssues && analysis.grammarIssues.length > 0 && (
              <div className="bg-muted/20 p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Grammar Issues ({analysis.grammarIssues.length})
                </h4>
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {analysis.grammarIssues.map((issue, index) => (
                    <div key={index} className="border-b border-border/50 pb-2">
                      <div className="flex items-start gap-1">
                        <span className={`text-xs font-medium mt-0.5 ${getSeverityColor(issue.severity)}`}>
                          {issue.severity.toUpperCase()}:
                        </span>
                        <span className="text-sm">{issue.issue}</span>
                      </div>
                      <div className="mt-1 text-sm pl-4 flex items-start gap-1 text-green-600">
                        <Check className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{issue.suggestion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* No issues */}
            {(!analysis.grammarIssues || analysis.grammarIssues.length === 0) && 
             (!analysis.suggestions || analysis.suggestions.length === 0) && (
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Your text looks great! No significant issues found.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Error state */}
        {analysisError && !isAnalyzing && analysisRequested && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Failed to analyze text. Please try again.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}