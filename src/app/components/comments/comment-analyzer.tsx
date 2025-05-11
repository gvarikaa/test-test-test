import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Loader2, AlertTriangle, CheckCircle2, BadgeInfo, MessageSquare, BarChart, ThumbsUp, ThumbsDown } from 'lucide-react';

interface CommentAnalyzerProps {
  commentId: string;
  content: string;
  parentContent?: string;
  showFull?: boolean;
  className?: string;
}

export default function CommentAnalyzer({
  commentId,
  content,
  parentContent,
  showFull = false,
  className = '',
}: CommentAnalyzerProps) {
  const [expanded, setExpanded] = useState(showFull);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get existing analysis or analyze on-demand
  const { data: analysis, isLoading, refetch } = trpc.commentAnalysis.getCommentAnalysis.useQuery(
    { commentId },
    { 
      enabled: true,
      onSettled: () => setIsAnalyzing(false),
    }
  );

  // Mutation to analyze on demand
  const analyzeCommentMutation = trpc.commentAnalysis.analyzeComment.useMutation({
    onSuccess: () => {
      refetch();
    },
    onSettled: () => {
      setIsAnalyzing(false);
    },
  });

  const handleAnalyzeClick = () => {
    setIsAnalyzing(true);
    analyzeCommentMutation.mutate({
      commentId,
      content,
      parentContent,
      includeToxicity: true,
      includeEntities: true,
      includeTopics: true,
    });
  };

  // Helper to determine sentiment color
  const getSentimentColor = (score: number) => {
    if (score >= 0.5) return 'text-green-500';
    if (score >= 0) return 'text-blue-500';
    if (score >= -0.5) return 'text-amber-500';
    return 'text-red-500';
  };

  if (isLoading || isAnalyzing) {
    return (
      <div className={`flex items-center p-2 bg-gray-50 rounded-md ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">Analyzing comment...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`flex items-center justify-between p-2 bg-gray-50 rounded-md ${className}`}>
        <span className="text-sm text-gray-500">No analysis available</span>
        <button
          onClick={handleAnalyzeClick}
          className="text-xs text-blue-500 hover:text-blue-700 font-medium"
        >
          Analyze now
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-md overflow-hidden ${className}`}>
      {/* Summary view */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center">
          {analysis.sentiment?.label === 'positive' && (
            <ThumbsUp className="h-4 w-4 text-green-500 mr-2" />
          )}
          {analysis.sentiment?.label === 'negative' && (
            <ThumbsDown className="h-4 w-4 text-red-500 mr-2" />
          )}
          {analysis.sentiment?.label === 'neutral' && (
            <BadgeInfo className="h-4 w-4 text-blue-500 mr-2" />
          )}
          <span className={`text-sm font-medium ${getSentimentColor(analysis.sentiment?.score || 0)}`}>
            {analysis.sentiment?.label?.charAt(0).toUpperCase()}{analysis.sentiment?.label?.slice(1)}
          </span>
          
          {analysis.toxicity?.isToxic && (
            <span className="ml-3 flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-xs text-red-500 font-medium">Potentially toxic</span>
            </span>
          )}
          
          {analysis.quality?.insightful && (
            <span className="ml-3 flex items-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-xs text-emerald-500 font-medium">Insightful</span>
            </span>
          )}
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-700 font-medium"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      </div>
      
      {/* Expanded view */}
      {expanded && (
        <div className="p-3 space-y-4">
          {/* Sentiment analysis */}
          <div>
            <h4 className="text-xs uppercase text-gray-500 font-medium mb-1">Sentiment</h4>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    analysis.sentiment?.score >= 0.5 ? 'bg-green-500' :
                    analysis.sentiment?.score >= 0 ? 'bg-blue-500' :
                    analysis.sentiment?.score >= -0.5 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${((analysis.sentiment?.score || 0) + 1) * 50}%`,
                  }}
                />
              </div>
              <span className="ml-2 text-xs font-medium">
                {(analysis.sentiment?.score || 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </div>
          
          {/* Toxicity (if included) */}
          {analysis.toxicity && (
            <div>
              <h4 className="text-xs uppercase text-gray-500 font-medium mb-1">Toxicity</h4>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysis.toxicity.score >= 0.7 ? 'bg-red-500' :
                      analysis.toxicity.score >= 0.4 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(analysis.toxicity.score || 0) * 100}%` }}
                  />
                </div>
                <span className="ml-2 text-xs font-medium">
                  {(analysis.toxicity.score * 100).toFixed(0)}%
                </span>
              </div>
              
              {/* Toxicity categories */}
              {analysis.toxicity.categories && Object.keys(analysis.toxicity.categories).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(analysis.toxicity.categories).map(([category, score]) => (
                    score > 0.2 && (
                      <span 
                        key={category}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          score >= 0.7 ? 'bg-red-100 text-red-800' :
                          score >= 0.4 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {category}: {(score * 100).toFixed(0)}%
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Topics */}
          {analysis.topics && analysis.topics.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-gray-500 font-medium mb-1">Topics</h4>
              <div className="flex flex-wrap gap-1">
                {analysis.topics.map((topic, i) => (
                  <span 
                    key={i}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Relevance if parent content was provided */}
          {analysis.relevance !== undefined && (
            <div>
              <h4 className="text-xs uppercase text-gray-500 font-medium mb-1">Relevance to Discussion</h4>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysis.relevance >= 0.7 ? 'bg-green-500' :
                      analysis.relevance >= 0.4 ? 'bg-blue-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${analysis.relevance * 100}%` }}
                  />
                </div>
                <span className="ml-2 text-xs font-medium">
                  {(analysis.relevance * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
          
          {/* Quality assessment */}
          {analysis.quality && (
            <div>
              <h4 className="text-xs uppercase text-gray-500 font-medium mb-1">Comment Quality</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-500">Quality Score</div>
                  <div className="font-medium">
                    {(analysis.quality.score * 10).toFixed(1)}/10
                  </div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-500">Length</div>
                  <div className="font-medium capitalize">
                    {analysis.quality.length}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-500">Insightful</div>
                  <div className={`font-medium ${analysis.quality.insightful ? 'text-green-600' : 'text-gray-600'}`}>
                    {analysis.quality.insightful ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-500">Actionable</div>
                  <div className={`font-medium ${analysis.quality.actionable ? 'text-green-600' : 'text-gray-600'}`}>
                    {analysis.quality.actionable ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Spam detection */}
          {analysis.isSpam !== undefined && (
            <div className="flex items-center gap-1">
              <h4 className="text-xs uppercase text-gray-500 font-medium">Spam Detection:</h4>
              <span className={`text-xs font-medium ${analysis.isSpam ? 'text-red-500' : 'text-green-500'}`}>
                {analysis.isSpam ? 'Potential Spam' : 'Not Spam'}
              </span>
            </div>
          )}
          
          {/* Keywords */}
          {analysis.keywords && analysis.keywords.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-gray-500 font-medium mb-1">Keywords</h4>
              <div className="flex flex-wrap gap-1">
                {analysis.keywords.map((keyword, i) => (
                  <span 
                    key={i}
                    className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Named entities (if included) */}
          {analysis.entities && analysis.entities.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-gray-500 font-medium mb-1">Entities</h4>
              <div className="flex flex-wrap gap-1">
                {analysis.entities.map((entity, i) => (
                  <span 
                    key={i}
                    className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full"
                  >
                    {entity.name}
                    {entity.type && (
                      <span className="text-purple-600"> ({entity.type})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Analysis timestamp */}
          <div className="mt-2 text-xs text-gray-400 text-right">
            Last analyzed: {new Date().toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}