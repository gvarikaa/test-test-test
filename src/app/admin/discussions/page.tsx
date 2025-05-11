import { Suspense } from 'react';
import { trpc } from '@/lib/trpc/client';
import { BarChart, AlertTriangle, MessageSquare, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Discussion Analysis | DapDip Admin',
  description: 'Analyze discussions and comments on DapDip',
};

export default function DiscussionsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Discussion Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stats cards */}
        <Suspense fallback={<StatsCardSkeleton />}>
          <DiscussionStats />
        </Suspense>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Discussion that might need moderation */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3 flex justify-between items-center">
            <h2 className="text-lg font-medium">Discussions Needing Moderation</h2>
            <button className="text-blue-500 hover:text-blue-700">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading moderation queue...</div>}>
            <ModerationQueue />
          </Suspense>
        </div>
        
        {/* Top trending discussions */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-medium">Top Trending Discussions</h2>
          </div>
          
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading trending discussions...</div>}>
            <TrendingDiscussions />
          </Suspense>
        </div>
      </div>
      
      {/* Analysis dashboard */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-medium">Discussion Analysis Dashboard</h2>
        </div>
        
        <div className="p-4">
          <p className="text-gray-500 mb-4">
            Use the discussion analysis tools to gain insights into user interactions, detect problematic content,
            and understand engagement patterns across the platform.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="mb-3">
                <BarChart className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">Sentiment Analysis</h3>
              <p className="text-sm text-gray-600 mb-3">
                Track the overall sentiment of discussions and comments across your platform.
              </p>
              <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View dashboard →
              </a>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="mb-3">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">Toxicity Monitoring</h3>
              <p className="text-sm text-gray-600 mb-3">
                Identify and address toxic content before it impacts your community.
              </p>
              <a href="#" className="text-amber-600 hover:text-amber-800 text-sm font-medium">
                View dashboard →
              </a>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="mb-3">
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">Engagement Metrics</h3>
              <p className="text-sm text-gray-600 mb-3">
                Understand how users engage with content and each other in discussions.
              </p>
              <a href="#" className="text-green-600 hover:text-green-800 text-sm font-medium">
                View dashboard →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Discussion stats component
function DiscussionStats() {
  const { data, isLoading } = trpc.commentAnalysis.getDiscussionStats.useQuery({ timeframe: 'week' });
  
  if (isLoading || !data) {
    return <StatsCardSkeleton />;
  }
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-xs uppercase text-gray-500 font-medium">Total Discussions</div>
        <div className="mt-1 flex items-baseline">
          <span className="text-2xl font-semibold">{data.totalDiscussions}</span>
          <span className="ml-2 text-sm text-green-600">+5% from last week</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-xs uppercase text-gray-500 font-medium">Total Comments</div>
        <div className="mt-1 flex items-baseline">
          <span className="text-2xl font-semibold">{data.totalComments}</span>
          <span className="ml-2 text-sm text-green-600">+12% from last week</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-xs uppercase text-gray-500 font-medium">Average Sentiment</div>
        <div className="mt-1 flex items-baseline">
          <span className={`text-2xl font-semibold ${
            data.averageSentiment > 0.3 ? 'text-green-600' :
            data.averageSentiment > -0.3 ? 'text-blue-600' : 'text-red-600'
          }`}>
            {data.averageSentiment.toFixed(2)}
          </span>
          <span className="ml-2 text-sm text-gray-500">(-1 to 1 scale)</span>
        </div>
      </div>
    </>
  );
}

// Stats card skeleton
function StatsCardSkeleton() {
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    </>
  );
}

// Moderation queue component
function ModerationQueue() {
  const { data, isLoading } = trpc.commentAnalysis.getDiscussionsNeedingModeration.useQuery({ threshold: 0.7 });
  
  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading moderation queue...
      </div>
    );
  }
  
  if (!data || data.discussions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No discussions currently need moderation.
      </div>
    );
  }
  
  return (
    <div className="divide-y">
      {data.discussions.map((discussion) => (
        <div key={discussion.id} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">Discussion #{discussion.id.substring(0, 8)}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              discussion.moderationScore > 0.8 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
            }`}>
              Score: {(discussion.moderationScore * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="mb-2">
            <h4 className="text-xs text-gray-500 uppercase">Reasons:</h4>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {discussion.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs text-gray-500 uppercase">Recommended Actions:</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {discussion.recommendedActions.map((action, index) => (
                <button 
                  key={index}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    action.type === 'remove' ? 'bg-red-100 text-red-800' :
                    action.type === 'warn' ? 'bg-amber-100 text-amber-800' :
                    action.type === 'restrict' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                  }`}
                >
                  {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-3 flex justify-end">
            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 mr-2">
              View Discussion
            </button>
            <button className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300">
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Trending discussions component
function TrendingDiscussions() {
  // This would be fetched from an API in a real app
  const trendingDiscussions = [
    {
      id: '1',
      title: 'New AI features announcement',
      commentCount: 87,
      engagementLevel: 'VERY_HIGH',
      topics: ['AI', 'Product Updates', 'Features'],
      sentiment: 0.78,
    },
    {
      id: '2',
      title: 'Community feedback on recent UI changes',
      commentCount: 54,
      engagementLevel: 'HIGH',
      topics: ['UI/UX', 'Feedback', 'Design'],
      sentiment: 0.12,
    },
    {
      id: '3',
      title: 'Tips and tricks for using the platform',
      commentCount: 32,
      engagementLevel: 'MODERATE',
      topics: ['Tips', 'How-to', 'Productivity'],
      sentiment: 0.92,
    },
  ];
  
  if (trendingDiscussions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No trending discussions found.
      </div>
    );
  }
  
  return (
    <div className="divide-y">
      {trendingDiscussions.map((discussion) => (
        <div key={discussion.id} className="p-4">
          <h3 className="font-medium mb-2">{discussion.title}</h3>
          
          <div className="flex flex-wrap gap-y-2 text-sm">
            <div className="w-1/2">
              <span className="text-gray-500">Comments:</span> {discussion.commentCount}
            </div>
            
            <div className="w-1/2">
              <span className="text-gray-500">Engagement:</span> {discussion.engagementLevel.replace('_', ' ').toLowerCase()}
            </div>
            
            <div className="w-1/2">
              <span className="text-gray-500">Sentiment:</span> 
              <span className={
                discussion.sentiment > 0.5 ? 'text-green-600' :
                discussion.sentiment > 0 ? 'text-blue-600' : 'text-red-600'
              }>
                {' '}{(discussion.sentiment * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="w-1/2">
              <span className="text-gray-500">Topics:</span> {discussion.topics.join(', ')}
            </div>
          </div>
          
          <div className="mt-3 flex justify-end">
            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              View Analysis
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}