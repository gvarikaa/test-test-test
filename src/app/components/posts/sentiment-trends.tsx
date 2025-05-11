"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/api";
import { useSession } from "next-auth/react";
import { AlertTriangle, Calendar, Loader2, TrendingUp, LineChart, Filter, RefreshCw } from "lucide-react";
import DataVisualization from "@/app/components/common/data-visualization";
import { VisualizationType, ChartData, ColorPalette } from "@/lib/data-visualization";

interface SentimentTrendsProps {
  timeframe?: "week" | "month" | "all";
  className?: string;
  showFilters?: boolean;
  height?: number;
  showTitle?: boolean;
}

export function SentimentTrends({
  timeframe = "month",
  className = "",
  showFilters = true,
  height = 300,
  showTitle = true
}: SentimentTrendsProps) {
  const { data: session } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "all">(timeframe);
  const [groupBy, setGroupBy] = useState<"day" | "week">(timeframe === "week" ? "day" : "week");
  
  // Fetch sentiment data from API
  const { data: postsAnalytics, isLoading, refetch } = api.post.getPostAnalytics.useQuery(
    { timeframe: selectedTimeframe },
    {
      enabled: !!session?.user.id,
    }
  );
  
  // Generate mock sentiment trend data (would be replaced with real data from API)
  const generateSentimentTrends = (): ChartData => {
    // If we have real data, generate from it
    if (postsAnalytics) {
      // Create mock data based on the timeframe
      const data = [];
      const now = new Date();
      const totalDays = selectedTimeframe === "week" ? 7 : selectedTimeframe === "month" ? 30 : 90;
      
      // Generate points for each day/week
      for (let i = 0; i < totalDays; i += groupBy === "day" ? 1 : 7) {
        const date = new Date(now);
        date.setDate(date.getDate() - totalDays + i);
        
        // Randomize sentiment values but weight them toward the actual sentiment stats
        const positiveWeight = postsAnalytics.sentimentStats.positive || 1;
        const negativeWeight = postsAnalytics.sentimentStats.negative || 1;
        const neutralWeight = postsAnalytics.sentimentStats.neutral || 1;
        const mixedWeight = postsAnalytics.sentimentStats.mixed || 1;
        
        const totalWeight = positiveWeight + negativeWeight + neutralWeight + mixedWeight;
        
        // Calculate a weighted sentiment score (0-100, higher means more positive)
        let baseScore = Math.round(
          ((positiveWeight * 100) + (neutralWeight * 50) + (mixedWeight * 50)) / totalWeight
        );
        
        // Add some random variation (±15%)
        const variation = Math.floor(Math.random() * 30) - 15;
        const sentimentScore = Math.max(0, Math.min(100, baseScore + variation));
        
        // Determine color based on sentiment score
        let color = "#ef4444"; // Red for negative
        if (sentimentScore >= 70) color = "#10b981"; // Green for positive
        else if (sentimentScore >= 40) color = "#f59e0b"; // Yellow/amber for neutral/mixed
        
        data.push({
          label: groupBy === "day" 
            ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            : `Week ${Math.floor(i / 7) + 1}`,
          timestamp: date.toISOString(),
          value: sentimentScore,
          color,
          tooltip: `Sentiment Score: ${sentimentScore}%`,
        });
      }
      
      return {
        data,
        options: {
          title: "Sentiment Analysis Trends",
          subtitle: `Average sentiment over time (${selectedTimeframe})`,
          showGrid: true,
          showLegend: false,
        },
      };
    }
    
    // Fallback mock data if no real data available
    return {
      data: [
        { label: "Week 1", value: 65, timestamp: "2025-04-01", color: "#10b981" },
        { label: "Week 2", value: 72, timestamp: "2025-04-08", color: "#10b981" },
        { label: "Week 3", value: 58, timestamp: "2025-04-15", color: "#f59e0b" },
        { label: "Week 4", value: 83, timestamp: "2025-04-22", color: "#10b981" },
        { label: "Week 5", value: 45, timestamp: "2025-04-29", color: "#ef4444" },
      ],
      options: {
        title: "Sentiment Analysis Trends",
        subtitle: "Positive sentiment scores over time",
        showGrid: true,
      },
    };
  };
  
  // Get chart data
  const sentimentTrendData = generateSentimentTrends();
  
  const handleRefresh = () => {
    refetch();
  };
  
  // Update groupBy when timeframe changes
  useEffect(() => {
    setGroupBy(selectedTimeframe === "week" ? "day" : "week");
  }, [selectedTimeframe]);
  
  return (
    <div className={`bg-card rounded-lg border p-4 ${className}`}>
      {showTitle && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <LineChart className="w-5 h-5 text-primary" />
            Sentiment Analysis Trends
          </h3>
          
          <button
            onClick={handleRefresh}
            className="p-1 rounded-full hover:bg-muted/50"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {showFilters && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Timeframe:
            </span>
            <div className="flex rounded-md overflow-hidden">
              {(["week", "month", "all"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedTimeframe(period)}
                  className={`px-3 py-1 text-xs font-medium ${
                    selectedTimeframe === period
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Filter className="w-4 h-4" />
              Group by:
            </span>
            <div className="flex rounded-md overflow-hidden">
              {(["day", "week"] as const).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setGroupBy(interval)}
                  disabled={selectedTimeframe === "week" && interval === "week"}
                  className={`px-3 py-1 text-xs font-medium ${
                    groupBy === interval
                      ? "bg-primary text-primary-foreground"
                      : selectedTimeframe === "week" && interval === "week"
                      ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  {interval.charAt(0).toUpperCase() + interval.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div style={{ height: `${height}px` }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !postsAnalytics || postsAnalytics.totalAnalyzed === 0 ? (
          <div className="flex flex-col justify-center items-center h-full">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No sentiment data available</p>
          </div>
        ) : (
          <DataVisualization
            type={VisualizationType.LINE_CHART}
            data={sentimentTrendData}
            className="h-full"
          />
        )}
      </div>
      
      {postsAnalytics && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="text-xs text-muted-foreground mb-1">Positive</div>
            <div className="font-medium">{postsAnalytics.sentimentStats.positive}</div>
          </div>
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <div className="text-xs text-muted-foreground mb-1">Negative</div>
            <div className="font-medium">{postsAnalytics.sentimentStats.negative}</div>
          </div>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
            <div className="text-xs text-muted-foreground mb-1">Neutral</div>
            <div className="font-medium">{postsAnalytics.sentimentStats.neutral}</div>
          </div>
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <div className="text-xs text-muted-foreground mb-1">Mixed</div>
            <div className="font-medium">{postsAnalytics.sentimentStats.mixed}</div>
          </div>
        </div>
      )}
    </div>
  );
}