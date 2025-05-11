import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Loader2, BarChart3, MessageSquare, Users, TrendingUp, AlertTriangle, ThumbsUp, Lightbulb } from 'lucide-react';
import { DiscussionTone, EngagementLevel, DiscussionQuality } from '@/lib/discussion-analysis';

interface DiscussionAnalyzerProps {
  discussionId: string;
  postId: string;
  className?: string;
}

export default function DiscussionAnalyzer({
  discussionId,
  postId,
  className = '',
}: DiscussionAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze discussion mutation
  const analyzeDiscussionMutation = trpc.commentAnalysis.analyzeDiscussion.useMutation({
    onSettled: () => {
      setIsAnalyzing(false);
    },
  });

  const handleAnalyzeClick = () => {
    setIsAnalyzing(true);
    analyzeDiscussionMutation.mutate({
      discussionId,
      postId,
      includeSummary: true,
      includeTimeline: true,
      includeRecommendedActions: true,
    });
  };

  // Helper to get tone icon and color
  const getToneInfo = (tone: DiscussionTone) => {
    switch (tone) {
      case DiscussionTone.POSITIVE:
        return { icon: <ThumbsUp className="h-5 w-5" />, color: 'text-green-500 bg-green-50' };
      case DiscussionTone.NEGATIVE:
        return { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500 bg-red-50' };
      case DiscussionTone.CONSTRUCTIVE:
        return { icon: <Lightbulb className="h-5 w-5" />, color: 'text-blue-500 bg-blue-50' };
      case DiscussionTone.CONTROVERSIAL:
        return { icon: <TrendingUp className="h-5 w-5" />, color: 'text-amber-500 bg-amber-50' };
      case DiscussionTone.TOXIC:
        return { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-600 bg-red-50' };
      default:
        return { icon: <MessageSquare className="h-5 w-5" />, color: 'text-gray-500 bg-gray-50' };
    }
  };

  // Loading state
  if (isAnalyzing) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow-sm ${className}`}>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-600">Analyzing discussion...</span>
        </div>
      </div>
    );
  }

  // Analysis not yet performed
  if (!analyzeDiscussionMutation.data) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow-sm ${className}`}>
        <div className="text-center p-6">
          <BarChart3 className="h-10 w-10 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Discussion Analysis</h3>
          <p className="text-gray-500 mb-4">
            Analyze this discussion to gain insights into tone, engagement, and key topics.
          </p>
          <button
            onClick={handleAnalyzeClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={isAnalyzing}
          >
            Analyze Discussion
          </button>
        </div>
      </div>
    );
  }

  // Analysis results
  const analysis = analyzeDiscussionMutation.data;
  const toneInfo = getToneInfo(analysis.overallTone);

  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div className="border-b px-4 py-3">
        <h3 className="text-lg font-medium">Discussion Analysis</h3>
      </div>

      <div className="p-4">
        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Comments</div>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-xl font-semibold">{analysis.commentCount}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Participants</div>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-purple-500 mr-1" />
              <span className="text-xl font-semibold">{analysis.participantCount}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Controversy</div>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-amber-500 mr-1" />
              <span className="text-xl font-semibold">{(analysis.controversyScore * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Toxicity</div>
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-xl font-semibold">{(analysis.toxicityLevel * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        
        {/* Overall tone */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Overall Tone</h4>
          <div className={`flex items-center p-3 rounded-lg ${toneInfo.color}`}>
            {toneInfo.icon}
            <span className="ml-2 font-medium">
              {analysis.overallTone.charAt(0).toUpperCase() + analysis.overallTone.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Sentiment breakdown */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sentiment Breakdown</h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="h-4 w-full flex rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${analysis.sentimentBreakdown.positive}%` }}
                title={`Positive: ${analysis.sentimentBreakdown.positive}%`}
              />
              <div 
                className="bg-gray-400 h-full" 
                style={{ width: `${analysis.sentimentBreakdown.neutral}%` }}
                title={`Neutral: ${analysis.sentimentBreakdown.neutral}%`}
              />
              <div 
                className="bg-red-500 h-full" 
                style={{ width: `${analysis.sentimentBreakdown.negative}%` }}
                title={`Negative: ${analysis.sentimentBreakdown.negative}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <div>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Positive: {analysis.sentimentBreakdown.positive}%
              </div>
              <div>
                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                Neutral: {analysis.sentimentBreakdown.neutral}%
              </div>
              <div>
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                Negative: {analysis.sentimentBreakdown.negative}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Topics and engagement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Main topics */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Main Topics</h4>
            <div className="space-y-1">
              {analysis.topTopics.map((topic, index) => (
                <div key={index} className="bg-gray-50 px-3 py-2 rounded-md">
                  {topic}
                </div>
              ))}
            </div>
          </div>
          
          {/* Engagement and quality */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Engagement & Quality</h4>
            <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
              <div>
                <div className="text-xs text-gray-500">Engagement Level</div>
                <div className="font-medium capitalize">{analysis.engagementLevel.replace('_', ' ').toLowerCase()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Discussion Quality</div>
                <div className="font-medium capitalize">{analysis.discussionQuality.toLowerCase()}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Top contributors */}
        {analysis.topContributors && analysis.topContributors.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Top Contributors</h4>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analysis.topContributors.map((contributor, index) => (
                    <tr key={index}>
                      <td className="py-2 px-3 text-sm">{contributor.userId.substring(0, 8)}...</td>
                      <td className="py-2 px-3 text-sm">{contributor.commentCount}</td>
                      <td className="py-2 px-3 text-sm">{(contributor.averageQuality * 10).toFixed(1)}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Timeline if included */}
        {analysis.timeline && analysis.timeline.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Engagement Timeline</h4>
            <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
              <div className="min-w-[500px] h-40 relative">
                {/* Simple chart visualization */}
                <div className="absolute inset-0 flex items-end">
                  {analysis.timeline.map((point, index) => {
                    const height = (point.commentCount / Math.max(...analysis.timeline.map(p => p.commentCount))) * 100;
                    return (
                      <div 
                        key={index}
                        className="flex-1 mx-1 flex flex-col items-center"
                      >
                        <div 
                          className={`w-full rounded-t-sm ${
                            point.averageSentiment > 0.3 ? 'bg-green-400' :
                            point.averageSentiment > -0.3 ? 'bg-blue-400' : 'bg-red-400'
                          }`}
                          style={{ height: `${Math.max(5, height)}%` }}
                        />
                        <div className="text-xs text-gray-500 mt-1 w-full text-center overflow-hidden text-ellipsis whitespace-nowrap">
                          {point.timePoint}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Recommended actions if included */}
        {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommended Actions</h4>
            <div className="space-y-2">
              {analysis.recommendedActions.map((action, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${
                    action.priority === 'high' ? 'bg-red-50 text-red-800' :
                    action.priority === 'medium' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="font-medium capitalize">{action.type}:</div>
                    <div className="ml-2">{action.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Summary if included */}
        {analysis.summary && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-700">{analysis.summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}