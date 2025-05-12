"use client";

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { KeywordAnalysisResult, KeywordSuggestion } from '@/lib/seo-optimization';
// UI components not available
// import { Button } from '@/app/components/ui';
import { Loader2, Plus, X, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

interface KeywordAnalyzerProps {
  content?: string;
  url?: string;
  initialKeywords?: string[];
  onKeywordsSelected?: (keywords: string[]) => void;
  className?: string;
}

export default function KeywordAnalyzer({
  content = '',
  url = '',
  initialKeywords = [],
  onKeywordsSelected,
  className = '',
}: KeywordAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(initialKeywords);
  const [newKeyword, setNewKeyword] = useState('');
  
  const analyzeKeywordsMutation = trpc.seo.analyzeKeywords.useMutation({
    onSuccess: (data) => {
      setKeywordAnalysis(data);
      setIsAnalyzing(false);
    },
    onError: (err) => {
      setError(`Failed to analyze keywords: ${err.message}`);
      setIsAnalyzing(false);
    }
  });

  const handleAnalyzeKeywords = async () => {
    if (!content && !url) {
      setError('Please provide content or URL to analyze keywords');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    analyzeKeywordsMutation.mutate({
      content,
      url,
      currentKeywords: selectedKeywords,
    });
  };
  
  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    
    if (!selectedKeywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...selectedKeywords, newKeyword.trim()];
      setSelectedKeywords(updatedKeywords);
      
      if (onKeywordsSelected) {
        onKeywordsSelected(updatedKeywords);
      }
    }
    
    setNewKeyword('');
  };
  
  const handleRemoveKeyword = (keyword: string) => {
    const updatedKeywords = selectedKeywords.filter(k => k !== keyword);
    setSelectedKeywords(updatedKeywords);
    
    if (onKeywordsSelected) {
      onKeywordsSelected(updatedKeywords);
    }
  };
  
  const handleSuggestedKeywordClick = (keyword: string) => {
    if (!selectedKeywords.includes(keyword)) {
      const updatedKeywords = [...selectedKeywords, keyword];
      setSelectedKeywords(updatedKeywords);
      
      if (onKeywordsSelected) {
        onKeywordsSelected(updatedKeywords);
      }
    }
  };
  
  // Sort keyword suggestions by relevance score
  const sortedSuggestions = keywordAnalysis?.suggestions
    ? [...keywordAnalysis.suggestions].sort((a, b) => b.relevanceScore - a.relevanceScore)
    : [];
    
  const renderCompetitiveIndicator = (difficulty: number) => {
    if (difficulty >= 80) {
      return (
        <span className="flex items-center text-red-600 text-xs">
          <ArrowUp className="h-3 w-3 mr-1" />
          High
        </span>
      );
    } else if (difficulty >= 50) {
      return (
        <span className="flex items-center text-yellow-600 text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Medium
        </span>
      );
    } else {
      return (
        <span className="flex items-center text-green-600 text-xs">
          <ArrowDown className="h-3 w-3 mr-1" />
          Low
        </span>
      );
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Keyword Analysis</h3>
        <Button 
          onClick={handleAnalyzeKeywords}
          disabled={isAnalyzing || (!content && !url)}
          variant="primary"
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Keywords'
          )}
        </Button>
      </div>
      
      {error && (
        <div className="p-3 text-sm bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {/* Current keywords */}
      <div>
        <h4 className="font-medium text-sm text-gray-500 mb-2">Your Keywords</h4>
        <div className="flex items-center">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              {selectedKeywords.map((keyword, index) => (
                <div 
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm"
                >
                  {keyword}
                  <button 
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    onClick={() => handleRemoveKeyword(keyword)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {selectedKeywords.length === 0 && (
                <div className="text-gray-500 text-sm">No keywords selected</div>
              )}
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder="Add keyword"
              className="border rounded-md px-3 py-1 text-sm"
            />
            <Button 
              onClick={handleAddKeyword}
              variant="outline"
              size="sm"
              disabled={!newKeyword.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Keywords analysis results */}
      {keywordAnalysis && (
        <div className="space-y-4">
          {/* Current keywords analysis */}
          {keywordAnalysis.currentKeywords.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-2">Current Keywords Analysis</h4>
              <div className="bg-white rounded-md border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competition</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Search Volume</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {keywordAnalysis.currentKeywords.map((keyword, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{keyword.keyword}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                keyword.relevanceScore >= 80 ? 'bg-green-600' :
                                keyword.relevanceScore >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${keyword.relevanceScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 mt-1">{keyword.relevanceScore}/100</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {renderCompetitiveIndicator(keyword.competitiveDifficulty)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {keyword.searchVolume ? (
                            <span>{keyword.searchVolume}/mo</span>
                          ) : (
                            <span className="text-gray-500">Unknown</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Keyword suggestions */}
          <div>
            <h4 className="font-medium text-sm text-gray-500 mb-2">Suggested Keywords</h4>
            <div className="bg-white rounded-md border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competition</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Search Volume</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedSuggestions.map((suggestion, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{suggestion.keyword}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              suggestion.relevanceScore >= 80 ? 'bg-green-600' :
                              suggestion.relevanceScore >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${suggestion.relevanceScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{suggestion.relevanceScore}/100</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {renderCompetitiveIndicator(suggestion.competitiveDifficulty)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {suggestion.searchVolume ? (
                          <span>{suggestion.searchVolume}/mo</span>
                        ) : (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                        <Button
                          onClick={() => handleSuggestedKeywordClick(suggestion.keyword)}
                          variant="ghost"
                          size="sm"
                          disabled={selectedKeywords.includes(suggestion.keyword)}
                        >
                          {selectedKeywords.includes(suggestion.keyword) ? 'Added' : 'Add'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Keyword combinations */}
          {keywordAnalysis.combinations && keywordAnalysis.combinations.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-2">Keyword Combinations</h4>
              <div className="flex flex-wrap gap-2">
                {keywordAnalysis.combinations.map((combination, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                      selectedKeywords.includes(combination) 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => handleSuggestedKeywordClick(combination)}
                  >
                    {combination}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Long-tail keywords */}
          {keywordAnalysis.longTailKeywords && keywordAnalysis.longTailKeywords.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-2">Long-Tail Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {keywordAnalysis.longTailKeywords.map((keyword, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                      selectedKeywords.includes(keyword) 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => handleSuggestedKeywordClick(keyword)}
                  >
                    {keyword}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Trending keywords */}
          {keywordAnalysis.trendingKeywords && keywordAnalysis.trendingKeywords.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-2">
                <span className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                  Trending Keywords
                </span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {keywordAnalysis.trendingKeywords.map((keyword, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                      selectedKeywords.includes(keyword) 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-50 text-green-800 hover:bg-green-100'
                    }`}
                    onClick={() => handleSuggestedKeywordClick(keyword)}
                  >
                    {keyword}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}