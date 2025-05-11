"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/api";
import { useSession } from "next-auth/react";
import { PostAnalysisDisplay } from "@/app/components/posts/post-analysis-display";
import { AnalysisInsights } from "@/app/components/posts/analysis-insights";
import { SentimentTrends } from "@/app/components/posts/sentiment-trends";
import {
  Activity,
  BarChart,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  Loader2,
  Calendar,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileText,
  Share2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import DataVisualization from "@/app/components/common/data-visualization";
import { VisualizationType, ChartData, ColorPalette } from "@/lib/data-visualization";
import TokenUsageDisplay from "@/app/components/common/token-usage-display";
import { ContentAnalyzer } from "@/app/components/posts/content-analyzer";
import { ContentAnalysis } from "@/lib/gemini";

export default function AIAnalysisDashboard() {
  const { data: session } = useSession();
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("month");
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [demoContent, setDemoContent] = useState("");
  const [demoAnalysis, setDemoAnalysis] = useState<ContentAnalysis | null>(null);
  const [demoTokenUsage, setDemoTokenUsage] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch user's post analytics
  const { data: postsAnalytics, isLoading } = api.post.getPostAnalytics.useQuery(
    { timeframe },
    {
      enabled: !!session?.user.id,
    }
  );

  // Fetch detailed analysis for selected post
  const { data: postAnalysis } = api.post.getPostAnalysis.useQuery(
    { postId: selectedPost || "" },
    {
      enabled: !!selectedPost,
    }
  );

  // Demo templates
  const contentTemplates = [
    {
      title: "Announcement Post",
      content: "Exciting news! 🎉 We're thrilled to announce the upcoming release of our new platform that will transform how you interact with digital content. Stay tuned for more updates in the coming weeks! #NewRelease #DigitalTransformation",
    },
    {
      title: "Question Post",
      content: "What productivity tools have made the biggest difference in your daily work routine? I've been experimenting with time-blocking and it's completely changed my approach to managing tasks. Would love to hear your recommendations! #Productivity #WorkHacks",
    },
    {
      title: "Educational Post",
      content: "Did you know that the average person spends 6.5 hours per day on digital media? Here are 5 simple digital wellness practices you can implement today:\n\n1. Set app time limits\n2. Create tech-free zones at home\n3. Use the 20-20-20 rule for eye strain\n4. Enable blue light filters after sunset\n5. Practice mindful social media consumption\n\nWhich of these will you try? #DigitalWellness #TechBalance",
    }
  ];

  // Generate mock sentiment trend data
  const sentimentTrendData = {
    data: [
      { label: "Week 1", value: 65, timestamp: "2025-05-01", color: "#10b981" },
      { label: "Week 2", value: 72, timestamp: "2025-05-08", color: "#10b981" },
      { label: "Week 3", value: 58, timestamp: "2025-05-15", color: "#f59e0b" },
      { label: "Week 4", value: 83, timestamp: "2025-05-22", color: "#10b981" },
      { label: "Week 5", value: 45, timestamp: "2025-05-29", color: "#ef4444" },
    ],
    options: {
      title: "Sentiment Trends",
      subtitle: "Positive sentiment scores over time",
      showGrid: true,
    },
  };

  // Generate mock engagement prediction data
  const engagementData = {
    data: [
      { label: "High", value: postsAnalytics?.engagementStats.high || 35, color: "#10b981" },
      { label: "Medium", value: postsAnalytics?.engagementStats.medium || 45, color: "#f59e0b" },
      { label: "Low", value: postsAnalytics?.engagementStats.low || 20, color: "#ef4444" },
    ],
    options: {
      title: "Engagement Predictions",
      subtitle: "Distribution of predicted engagement",
    },
  };

  // Handle content template selection
  const handleSelectTemplate = (template: string) => {
    setDemoContent(template);
  };

  // Handle demo analysis completion
  const handleAnalysisComplete = (analysis: ContentAnalysis, tokenUsage: number) => {
    setDemoAnalysis(analysis);
    setDemoTokenUsage(tokenUsage);
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="text-primary" />
            AI Analysis Dashboard
          </h1>
          <p className="text-muted-foreground">
            Visualize and analyze your content with AI-powered insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Timeframe:</span>
          <div className="flex rounded-md overflow-hidden">
            {["week", "month", "all"].map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period as "week" | "month" | "all")}
                className={`px-3 py-1 text-sm font-medium ${
                  timeframe === period
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Token usage display */}
      <div className="mb-8">
        <TokenUsageDisplay showDetails />
      </div>

      {/* Main dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Analysis stats */}
        <div className="col-span-1 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Posts Analyzed</h3>
              <div className="text-3xl font-bold">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  postsAnalytics?.totalAnalyzed || 0
                )}
              </div>
              {!isLoading && postsAnalytics?.totalAnalyzed && postsAnalytics.changePercentage && (
                <div className="flex items-center text-xs mt-1 text-green-500">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  <span>{postsAnalytics.changePercentage}% from last {timeframe}</span>
                </div>
              )}
            </div>
            
            <div className="bg-card rounded-lg border p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Avg. Engagement</h3>
              <div className="text-3xl font-bold">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  `${postsAnalytics?.averageEngagementScore.toFixed(1) || 0}%`
                )}
              </div>
              {!isLoading && postsAnalytics?.engagementChange && (
                <div className={`flex items-center text-xs mt-1 ${
                  postsAnalytics.engagementChange > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {postsAnalytics.engagementChange > 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowRight className="w-3 h-3 mr-1" />
                  )}
                  <span>{postsAnalytics.engagementChange > 0 ? '+' : ''}{postsAnalytics.engagementChange.toFixed(1)}% from last {timeframe}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Sentiment distribution */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-4">Sentiment Distribution</h3>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <DataVisualization
                type={VisualizationType.PIE_CHART}
                data={{
                  data: [
                    { 
                      label: "Positive", 
                      value: postsAnalytics?.sentimentStats.positive || 40, 
                      color: "#10b981" 
                    },
                    { 
                      label: "Neutral", 
                      value: postsAnalytics?.sentimentStats.neutral || 35, 
                      color: "#9ca3af" 
                    },
                    { 
                      label: "Negative", 
                      value: postsAnalytics?.sentimentStats.negative || 15, 
                      color: "#ef4444" 
                    },
                    { 
                      label: "Mixed", 
                      value: postsAnalytics?.sentimentStats.mixed || 10, 
                      color: "#f59e0b" 
                    },
                  ],
                  options: {
                    title: "Content Sentiment",
                    showLegend: true,
                  }
                }}
                className="h-40"
              />
            )}
          </div>
          
          {/* Engagement prediction */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-4">Engagement Predictions</h3>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <DataVisualization
                type={VisualizationType.BAR_CHART}
                data={engagementData}
                className="h-40"
              />
            )}
          </div>
          
          {/* Top topics */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-4">Top Content Topics</h3>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {(postsAnalytics?.topTopics || []).map((topic, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">{i + 1}.</span>
                      <span className="text-sm">{topic.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(topic.count / (postsAnalytics?.topTopics?.[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground">{topic.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle column - Live demo and detailed analysis */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {/* Content analyzer live demo */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-4">Live Content Analysis</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Enter content to analyze
              </label>
              <textarea
                value={demoContent}
                onChange={(e) => setDemoContent(e.target.value)}
                placeholder="Enter a post, caption, or other content to analyze..."
                className="w-full min-h-[100px] p-3 border rounded-md bg-background"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Sample templates
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {contentTemplates.map((template, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectTemplate(template.content)}
                    className="p-3 border rounded-md text-left hover:bg-muted/50 text-sm"
                  >
                    <div className="font-medium mb-1">{template.title}</div>
                    <div className="text-muted-foreground truncate">
                      {template.content.substring(0, 60)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {demoContent && (
              <ContentAnalyzer 
                content={demoContent} 
                onAnalysisComplete={handleAnalysisComplete}
              />
            )}
            
            {demoAnalysis && (
              <div className="mt-4 space-y-4">
                <PostAnalysisDisplay
                  analysis={demoAnalysis}
                  tokenUsage={demoTokenUsage}
                  showAdvancedMetrics={true}
                />

                <AnalysisInsights
                  analysis={demoAnalysis}
                  className="mt-4"
                />
              </div>
            )}
          </div>
          
          {/* Sentiment trends */}
          <SentimentTrends
            timeframe={timeframe}
            height={350}
            showFilters={true}
          />
          
          {/* Recent posts with analysis */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-4">Recently Analyzed Posts</h3>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {(postsAnalytics?.recentPosts || []).map((post) => (
                  <div 
                    key={post.id}
                    className={`border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedPost === post.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedPost(post.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Image
                          src={post.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.name)}`}
                          alt={post.user.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <div>
                          <span className="font-medium">{post.user.name}</span>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>
                              {new Date(post.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            post.sentiment === "positive"
                              ? "bg-green-100 text-green-800"
                              : post.sentiment === "negative"
                              ? "bg-red-100 text-red-800"
                              : post.sentiment === "mixed"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {post.sentiment}
                        </span>
                        
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            post.engagement === "high"
                              ? "bg-green-100 text-green-800"
                              : post.engagement === "low"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {post.engagement} engagement
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-2 line-clamp-2">{post.content}</p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{post.topics.length} topics</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="w-4 h-4" />
                          <span>{post.shares} shares</span>
                        </div>
                      </div>
                      <Link 
                        href={`/posts/${post.id}`}
                        className="text-primary hover:underline text-xs"
                      >
                        View Post
                      </Link>
                    </div>
                    
                    {selectedPost === post.id && postAnalysis && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <PostAnalysisDisplay
                          analysis={postAnalysis}
                          hasSimilarAnalyses={true}
                          showAdvancedMetrics={true}
                        />

                        <AnalysisInsights
                          analysis={postAnalysis}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}