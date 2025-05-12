"use client";

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { ContentOptimizationResult } from '@/lib/seo-optimization';
// UI components not available
// import { Button, Textarea } from '@/app/components/ui';
import { Loader2, ArrowRight } from 'lucide-react';

interface ContentOptimizerProps {
  content: string;
  targetKeywords?: string[];
  onOptimizedContent?: (result: ContentOptimizationResult) => void;
  className?: string;
}

export default function ContentOptimizer({
  content,
  targetKeywords = [],
  onOptimizedContent,
  className = '',
}: ContentOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<ContentOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  
  const optimizeContentMutation = trpc.seo.optimizeContent.useMutation({
    onSuccess: (data) => {
      setOptimizationResult(data);
      if (onOptimizedContent) {
        onOptimizedContent(data);
      }
      setIsOptimizing(false);
    },
    onError: (err) => {
      setError(`Failed to optimize content: ${err.message}`);
      setIsOptimizing(false);
    }
  });

  const handleOptimizeContent = async () => {
    setIsOptimizing(true);
    setError(null);
    
    optimizeContentMutation.mutate({
      content,
      targetKeywords,
      preserveTone: true,
    });
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Content Optimization</h3>
        <Button 
          onClick={handleOptimizeContent}
          disabled={isOptimizing || !content}
          variant="primary"
          size="sm"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            'Optimize Content'
          )}
        </Button>
      </div>
      
      {error && (
        <div className="p-3 text-sm bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {optimizationResult && (
        <div className="space-y-4">
          {/* Toggle between original and optimized */}
          {optimizationResult.optimizedContent !== content && (
            <div className="flex justify-end">
              <button
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
                onClick={() => setShowOriginal(!showOriginal)}
              >
                {showOriginal ? 'Show Optimized Content' : 'Show Original Content'}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {/* Content display */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-sm text-gray-500 mb-2">
              {showOriginal ? 'Original Content' : 'Optimized Content'}
            </h4>
            <Textarea
              value={showOriginal ? content : optimizationResult.optimizedContent}
              readOnly
              className="min-h-[200px] border border-gray-300 w-full"
            />
          </div>
          
          {/* Optimization changes */}
          <div>
            <h4 className="font-medium text-sm text-gray-500">Changes Made</h4>
            <div className="space-y-2 mt-2">
              {optimizationResult.changes.map((change, index) => (
                <div key={index} className="bg-white p-3 rounded border text-sm">
                  <div className="font-medium">{change.type}</div>
                  <p className="text-gray-600 mt-1">{change.description}</p>
                  {change.before && change.after && (
                    <div className="mt-2 bg-gray-50 p-2 rounded text-xs">
                      <div className="text-red-600">- {change.before}</div>
                      <div className="text-green-600">+ {change.after}</div>
                    </div>
                  )}
                </div>
              ))}
              
              {optimizationResult.changes.length === 0 && (
                <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                  No significant changes needed. Your content is already well-optimized.
                </div>
              )}
            </div>
          </div>
          
          {/* Keyword optimization */}
          <div>
            <h4 className="font-medium text-sm text-gray-500">Keyword Optimization</h4>
            <div className="bg-white p-3 rounded border mt-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Keyword</th>
                    <th className="text-left py-2 font-medium">Before</th>
                    <th className="text-left py-2 font-medium">After</th>
                    <th className="text-left py-2 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {optimizationResult.keywordOptimization.map((keyword, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2">{keyword.keyword}</td>
                      <td className="py-2">{keyword.beforeCount}</td>
                      <td className="py-2">{keyword.afterCount}</td>
                      <td className="py-2">
                        <span className={
                          keyword.afterCount > keyword.beforeCount
                            ? 'text-green-600'
                            : keyword.afterCount < keyword.beforeCount
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }>
                          {keyword.afterCount > keyword.beforeCount && '+'}
                          {keyword.afterCount - keyword.beforeCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Readability metrics */}
          <div>
            <h4 className="font-medium text-sm text-gray-500">Readability Improvements</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-xs">Reading Level</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">
                    {optimizationResult.readabilityMetrics.readingLevel}
                  </span>
                  {optimizationResult.readabilityMetrics.readingLevelBefore !== 
                   optimizationResult.readabilityMetrics.readingLevel && (
                    <span className="text-xs text-gray-500">
                      was: {optimizationResult.readabilityMetrics.readingLevelBefore}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-xs">Avg. Sentence Length</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">
                    {optimizationResult.readabilityMetrics.avgSentenceLength}
                  </span>
                  {optimizationResult.readabilityMetrics.avgSentenceLengthBefore !==
                   optimizationResult.readabilityMetrics.avgSentenceLength && (
                    <span className="text-xs text-gray-500">
                      was: {optimizationResult.readabilityMetrics.avgSentenceLengthBefore}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-xs">Complex Words %</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">
                    {optimizationResult.readabilityMetrics.complexWordsPercentage}%
                  </span>
                  {optimizationResult.readabilityMetrics.complexWordsPercentageBefore !==
                   optimizationResult.readabilityMetrics.complexWordsPercentage && (
                    <span className="text-xs text-gray-500">
                      was: {optimizationResult.readabilityMetrics.complexWordsPercentageBefore}%
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-xs">Passive Voice %</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">
                    {optimizationResult.readabilityMetrics.passiveVoicePercentage}%
                  </span>
                  {optimizationResult.readabilityMetrics.passiveVoicePercentageBefore !==
                   optimizationResult.readabilityMetrics.passiveVoicePercentage && (
                    <span className="text-xs text-gray-500">
                      was: {optimizationResult.readabilityMetrics.passiveVoicePercentageBefore}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional suggestions */}
          {optimizationResult.additionalSuggestions && (
            <div>
              <h4 className="font-medium text-sm text-gray-500">Additional Suggestions</h4>
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mt-2">
                {optimizationResult.additionalSuggestions}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}