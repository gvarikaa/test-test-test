"use client";

import { useState } from "react";
import { ContentAnalysis } from "@/lib/gemini";
import { VisualizationType, ChartData, ColorPalette } from "@/lib/data-visualization";
import DataVisualization from "@/app/components/common/data-visualization";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  PieChart,
  BarChart,
  LineChart,
  Activity,
  Target,
  Tag,
  MessageSquare,
  TrendingUp,
  Share,
  Heart,
  Clock,
  Users
} from "lucide-react";

interface PostAnalysisDisplayProps {
  analysis: ContentAnalysis;
  tokenUsage?: number;
  className?: string;
  hasSimilarAnalyses?: boolean;
  showAdvancedMetrics?: boolean;
}

export function PostAnalysisDisplay({
  analysis,
  tokenUsage = 0,
  className = "",
  hasSimilarAnalyses = false,
  showAdvancedMetrics = false
}: PostAnalysisDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'sentiment' | 'engagement' | 'topics' | 'entities' | 'audience' | 'timing'>('sentiment');

  // Generate sentiment chart data
  const sentimentChartData: ChartData = {
    data: [
      {
        label: "Positive",
        value: analysis.sentiment === "positive" ? 100 : analysis.sentiment === "mixed" ? 50 : 10,
        color: "#10b981", // green
      },
      {
        label: "Negative",
        value: analysis.sentiment === "negative" ? 100 : analysis.sentiment === "mixed" ? 50 : 10,
        color: "#ef4444", // red
      },
      {
        label: "Neutral",
        value: analysis.sentiment === "neutral" ? 100 : analysis.sentiment === "mixed" ? 50 : 10,
        color: "#9ca3af", // gray
      },
    ],
    options: {
      title: "Sentiment Analysis",
      palette: ColorPalette.DEFAULT,
      showValues: false,
    },
  };

  // Generate engagement prediction chart
  const engagementChartData: ChartData = {
    data: [
      {
        label: "Engagement",
        value: analysis.engagementPrediction === "high" ? 90 :
               analysis.engagementPrediction === "medium" ? 60 : 30,
        color: analysis.engagementPrediction === "high" ? "#10b981" :
               analysis.engagementPrediction === "medium" ? "#f59e0b" : "#ef4444",
        tooltip: analysis.reasonForEngagementPrediction,
      }
    ],
    options: {
      title: "Predicted Engagement",
      subtitle: analysis.engagementPrediction,
    },
  };

  // Enhanced engagement metrics for advanced visualization
  const engagementMetricsData: ChartData = {
    data: [
      {
        label: "Likes",
        value: analysis.engagementPrediction === "high" ? 85 :
               analysis.engagementPrediction === "medium" ? 55 : 25,
        color: "#ec4899", // pink
        metadata: {
          icon: "heart",
          benchmark: analysis.engagementPrediction === "high" ? "+75%" :
                    analysis.engagementPrediction === "medium" ? "+25%" : "-15%",
        }
      },
      {
        label: "Comments",
        value: analysis.engagementPrediction === "high" ? 80 :
               analysis.engagementPrediction === "medium" ? 50 : 20,
        color: "#8b5cf6", // purple
        metadata: {
          icon: "message",
          benchmark: analysis.engagementPrediction === "high" ? "+65%" :
                    analysis.engagementPrediction === "medium" ? "+15%" : "-25%",
        }
      },
      {
        label: "Shares",
        value: analysis.engagementPrediction === "high" ? 75 :
               analysis.engagementPrediction === "medium" ? 40 : 15,
        color: "#3b82f6", // blue
        metadata: {
          icon: "share",
          benchmark: analysis.engagementPrediction === "high" ? "+85%" :
                    analysis.engagementPrediction === "medium" ? "+10%" : "-30%",
        }
      },
      {
        label: "Saves",
        value: analysis.engagementPrediction === "high" ? 65 :
               analysis.engagementPrediction === "medium" ? 35 : 10,
        color: "#f59e0b", // amber
        metadata: {
          icon: "bookmark",
          benchmark: analysis.engagementPrediction === "high" ? "+95%" :
                    analysis.engagementPrediction === "medium" ? "+5%" : "-40%",
        }
      }
    ],
    options: {
      title: "Engagement Metrics",
      subtitle: "Predicted performance vs. average",
      sortBy: "value",
      sortDirection: "desc",
    },
  };

  // Generate topics chart data
  const topicsChartData: ChartData = {
    data: analysis.topics.map((topic, index) => ({
      label: topic,
      value: 100 - (index * 10), // Decreasing weights for each topic
      color: `hsl(${210 + index * 30}, 70%, 60%)`,
    })),
    options: {
      title: "Content Topics",
      sortBy: "value",
      sortDirection: "desc",
    },
  };

  // Generate entities chart data
  const entitiesChartData: ChartData = {
    data: analysis.entities.map((entity, index) => ({
      label: entity.name,
      value: 1,
      color: entity.type === "person" ? "#8b5cf6" :
             entity.type === "location" ? "#3b82f6" :
             entity.type === "organization" ? "#10b981" : "#f59e0b",
      tooltip: `${entity.name} (${entity.type})`,
      metadata: {
        type: entity.type
      }
    })),
    options: {
      title: "Detected Entities",
      subtitle: "By type and occurrence",
    },
  };

  // Generate audience targeting data
  const audienceData: ChartData = {
    data: [
      {
        label: "18-24",
        value: analysis.tone?.includes("youthful") || analysis.topics.some(t => ["gaming", "tiktok", "student"].includes(t.toLowerCase())) ? 85 : 35,
        color: "#ec4899"
      },
      {
        label: "25-34",
        value: analysis.topics.some(t => ["career", "finance", "technology"].includes(t.toLowerCase())) ? 75 : 45,
        color: "#8b5cf6"
      },
      {
        label: "35-44",
        value: analysis.topics.some(t => ["parenting", "investment", "business"].includes(t.toLowerCase())) ? 70 : 40,
        color: "#3b82f6"
      },
      {
        label: "45+",
        value: analysis.tone?.includes("formal") || analysis.topics.some(t => ["health", "retirement", "politics"].includes(t.toLowerCase())) ? 65 : 30,
        color: "#10b981"
      }
    ],
    options: {
      title: "Audience Resonance",
      subtitle: "Age demographics likely to engage",
      sortBy: "value",
      sortDirection: "desc",
    }
  };

  // Generate optimal posting time data
  const timingData: ChartData = {
    data: [
      { label: "Morning (6-10am)", value: 65, color: "#f59e0b" },
      { label: "Midday (10am-2pm)", value: 80, color: "#10b981" },
      { label: "Afternoon (2-6pm)", value: 85, color: "#3b82f6" },
      { label: "Evening (6-10pm)", value: 95, color: "#8b5cf6" },
      { label: "Night (10pm-6am)", value: 40, color: "#6b7280" }
    ],
    options: {
      title: "Optimal Posting Times",
      subtitle: "Based on content and audience",
      sortBy: "value",
      sortDirection: "desc",
    }
  };

  // Get icon for engagement metric
  const getMetricIcon = (iconName: string) => {
    switch(iconName) {
      case 'heart': return <Heart className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'share': return <Share className="w-4 h-4" />;
      case 'bookmark': return <Tag className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  return (
    <div className={`w-full bg-card rounded-lg p-4 border ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          {showAdvancedMetrics ? "Advanced Content Analysis" : "Post Analysis Visualization"}
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? "Show Less" : "Show More"}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap border-b border-border mb-4">
        <button
          className={`flex-1 py-2 text-xs md:text-sm font-medium ${
            activeTab === 'sentiment'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('sentiment')}
        >
          <PieChart className="h-4 w-4 mx-auto mb-1" />
          Sentiment
        </button>
        <button
          className={`flex-1 py-2 text-xs md:text-sm font-medium ${
            activeTab === 'engagement'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('engagement')}
        >
          <TrendingUp className="h-4 w-4 mx-auto mb-1" />
          Engagement
        </button>
        <button
          className={`flex-1 py-2 text-xs md:text-sm font-medium ${
            activeTab === 'topics'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('topics')}
        >
          <Tag className="h-4 w-4 mx-auto mb-1" />
          Topics
        </button>
        <button
          className={`flex-1 py-2 text-xs md:text-sm font-medium ${
            activeTab === 'entities'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('entities')}
        >
          <Activity className="h-4 w-4 mx-auto mb-1" />
          Entities
        </button>
        {showAdvancedMetrics && (
          <>
            <button
              className={`flex-1 py-2 text-xs md:text-sm font-medium ${
                activeTab === 'audience'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('audience')}
            >
              <Users className="h-4 w-4 mx-auto mb-1" />
              Audience
            </button>
            <button
              className={`flex-1 py-2 text-xs md:text-sm font-medium ${
                activeTab === 'timing'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('timing')}
            >
              <Clock className="h-4 w-4 mx-auto mb-1" />
              Timing
            </button>
          </>
        )}
      </div>

      {/* Selected visualization */}
      <div className="mb-4">
        {activeTab === 'sentiment' && (
          <DataVisualization
            type={VisualizationType.PIE_CHART}
            data={sentimentChartData}
            className="h-64"
          />
        )}
        {activeTab === 'engagement' && (
          showAdvancedMetrics ? (
            <div className="space-y-4">
              <DataVisualization
                type={VisualizationType.GAUGE}
                data={engagementChartData}
                className="h-32"
              />
              <div className="grid grid-cols-2 gap-2">
                {engagementMetricsData.data.map((metric, index) => (
                  <div key={index} className="p-3 border rounded-md flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getMetricIcon(metric.metadata?.icon || '')}
                      <span className="text-sm font-medium">{metric.label}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold" style={{ color: metric.color }}>{metric.value}%</span>
                      <span className={`text-xs ${metric.metadata?.benchmark?.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {metric.metadata?.benchmark}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DataVisualization
              type={VisualizationType.GAUGE}
              data={engagementChartData}
              className="h-64"
            />
          )
        )}
        {activeTab === 'topics' && (
          <DataVisualization
            type={analysis.topics.length > 0 ? VisualizationType.BAR_CHART : VisualizationType.TABLE}
            data={topicsChartData}
            className="h-64"
          />
        )}
        {activeTab === 'entities' && (
          <DataVisualization
            type={analysis.entities.length > 0 ? VisualizationType.PIE_CHART : VisualizationType.TABLE}
            data={entitiesChartData}
            className="h-64"
          />
        )}
        {activeTab === 'audience' && showAdvancedMetrics && (
          <DataVisualization
            type={VisualizationType.BAR_CHART}
            data={audienceData}
            className="h-64"
          />
        )}
        {activeTab === 'timing' && showAdvancedMetrics && (
          <DataVisualization
            type={VisualizationType.BAR_CHART}
            data={timingData}
            className="h-64"
          />
        )}
      </div>

      {/* Additional details when expanded */}
      {isExpanded && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Tone Analysis</p>
            <p className="text-sm">{analysis.tone}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Improvement Suggestions</p>
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{suggestion}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Engagement Reasoning</p>
            <p className="text-sm">{analysis.reasonForEngagementPrediction}</p>
          </div>

          {showAdvancedMetrics && (
            <>
              <div>
                <p className="text-sm font-medium mb-1">Recommended Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      #{topic.toLowerCase().replace(/\s+/g, '')}
                    </span>
                  ))}
                  {analysis.entities
                    .filter(entity => entity.type !== 'date' && entity.type !== 'time')
                    .slice(0, 3)
                    .map((entity, index) => (
                      <span
                        key={`entity-${index}`}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        #{entity.name.toLowerCase().replace(/\s+/g, '')}
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Target Audience</p>
                <p className="text-sm">
                  This content would likely resonate with
                  {analysis.tone?.includes("youthful") || analysis.topics.some(t => ["gaming", "tiktok", "student"].includes(t.toLowerCase()))
                    ? " younger demographics (18-24) "
                    : analysis.topics.some(t => ["career", "finance", "technology"].includes(t.toLowerCase()))
                    ? " young professionals (25-34) "
                    : analysis.topics.some(t => ["parenting", "investment", "business"].includes(t.toLowerCase()))
                    ? " established professionals (35-44) "
                    : " mature audiences (45+) "}
                  interested in {analysis.topics.slice(0, 2).join(", ")}.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Potential Risks</p>
                <p className="text-sm">
                  {analysis.sentiment === "negative"
                    ? "Contains negative sentiment which may turn off some audience segments."
                    : analysis.sentiment === "mixed"
                    ? "Mixed sentiment might be perceived differently by different audience segments."
                    : "No significant content risks detected."}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {hasSimilarAnalyses && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-sm font-medium flex items-center gap-1 mb-2">
            <Target className="w-4 h-4 text-primary" />
            Similar Content Performance
          </p>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Similar posts have performed +45% better than average</span>
          </div>
        </div>
      )}

      {tokenUsage > 0 && (
        <div className="text-xs text-muted-foreground mt-4">
          {`Token usage: ${tokenUsage} tokens`}
        </div>
      )}
    </div>
  );
}