'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Calendar, 
  RefreshCw, 
  Download, 
  Users, 
  Brain, 
  Bot, 
  Layers,
  Zap,
  FileSpreadsheet,
  Settings2,
  Filter
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { MetricsDashboard, DataVisualization } from '@/app/components/common/data-visualization';
import {
  VisualizationType,
  ChartSize,
  ColorPalette,
  generateMetricsDashboard,
  generateTokenUsageChartData,
  generateTokenUsageTimeSeriesData,
  generateFeatureUsageData,
  generateTokenUsageGaugeData,
  generateBenchmarkData
} from '@/lib/data-visualization';

/**
 * AI Analytics Dashboard
 * Displays comprehensive analytics for AI usage across the platform
 */
export default function AIAnalyticsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [timeframe, setTimeframe] = useState(searchParams.get('timeframe') || 'month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch token usage stats data
  const { data: tokenStats, isLoading, refetch } = trpc.ai.getTokenUsageStats.useQuery(
    { timeframe: timeframe as 'day' | 'week' | 'month' | 'year' },
    { 
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchInterval: 300000, // 5 minutes
    }
  );

  // Fetch token limit data
  const { data: tokenLimit } = trpc.ai.getTokenLimit.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    const params = new URLSearchParams(searchParams);
    params.set('timeframe', newTimeframe);
    router.push(`?${params.toString()}`);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Generate dashboard data from token stats
  const dashboardData = tokenStats && tokenLimit ? 
    generateMetricsDashboard(
      tokenStats, 
      tokenLimit.limit,
      { 
        palette: ColorPalette.ANALYTICS,
        showLegend: true,
        responsive: true,
      }
    ) : null;

  // Generate additional metrics
  const generateAdditionalMetrics = () => {
    if (!tokenStats || !tokenLimit) return null;

    const averageTokensPerDay = tokenStats.totalTokens / (tokenStats.byDay.length || 1);
    const mostUsedModel = Object.entries(tokenStats.byModel).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
    const mostUsedFeature = Object.entries(tokenStats.byFeature).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
    const tokenUtilization = Math.round((tokenStats.totalTokens / tokenLimit.limit) * 100);

    return {
      // Usage by endpoint as a pie chart
      endpointUsage: generateTokenUsageChartData(
        {
          ...tokenStats,
          byModel: tokenStats.byEndpoint || {},
        },
        {
          title: 'Usage by Endpoint',
          subtitle: `Top ${Object.keys(tokenStats.byEndpoint || {}).length} endpoints`,
          palette: ColorPalette.CATEGORICAL,
          size: ChartSize.MEDIUM,
        }
      ),

      // Token usage efficiency comparison
      efficiencyMetric: generateBenchmarkData(
        tokenStats.avgResponseTime || 0,
        1000, // 1 second benchmark
        'Response Time',
        {
          title: 'AI Response Time',
          subtitle: 'Compared to 1 second benchmark',
        }
      ),
      
      // Success rate metric
      successRateMetric: generateBenchmarkData(
        (tokenStats.successRate || 0) * 100,
        99, // 99% benchmark
        'Success Rate',
        {
          title: 'API Success Rate',
          subtitle: 'Compared to 99% benchmark',
        }
      ),
    };
  };

  // Combined dashboard data
  const allDashboardData = dashboardData && {
    ...dashboardData,
    ...generateAdditionalMetrics(),
  };

  // Handle export data
  const handleExportData = () => {
    if (!tokenStats) return;
    
    const dataStr = JSON.stringify(tokenStats, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `ai_analytics_${timeframe}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          AI Analytics Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Comprehensive analytics for AI usage across the platform
        </p>
      </div>

      {/* Controls and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
            Timeframe:
          </span>
          
          {['day', 'week', 'month', 'year'].map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeframe === tf
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={isRefreshing}
          >
            <RefreshCw 
              size={16} 
              className={`${isRefreshing ? 'animate-spin' : ''}`} 
            />
            Refresh
          </button>
          
          <button
            onClick={handleExportData}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={!tokenStats}
          >
            <Download size={16} />
            Export
          </button>
          
          <button
            className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              <Zap size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tokens</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isLoading ? (
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  tokenStats?.totalTokens.toLocaleString() || '0'
                )}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
              <Brain size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Models Used</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isLoading ? (
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  Object.keys(tokenStats?.byModel || {}).length || '0'
                )}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              <Layers size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Features Used</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isLoading ? (
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  Object.keys(tokenStats?.byFeature || {}).length || '0'
                )}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
              <Users size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isLoading ? (
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  tokenStats?.activeUsers || '0'
                )}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && !tokenStats && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-6">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
            Unable to load analytics data
          </h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            There was an error retrieving analytics data. Please try refreshing or check back later.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            <RefreshCw size={14} className="mr-1.5" />
            Try Again
          </button>
        </div>
      )}

      {/* Dashboard */}
      {!isLoading && allDashboardData && (
        <>
          <MetricsDashboard metrics={allDashboardData} className="mb-8" />
          
          {/* Additional Analytics Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Detailed Analytics
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* User Activity */}
              {tokenStats?.userActivity && (
                <DataVisualization
                  type={VisualizationType.BAR_CHART}
                  data={{
                    data: tokenStats.userActivity.map((user, index) => ({
                      label: user.id || `User ${index + 1}`,
                      value: user.tokens,
                      color: `hsl(${210 + index * 30}, 70%, 60%)`,
                      tooltip: `${user.id || `User ${index + 1}`}: ${user.tokens.toLocaleString()} tokens`,
                    })),
                    options: {
                      title: 'Top Users by Token Usage',
                      subtitle: `Top ${tokenStats.userActivity.length} users`,
                      size: ChartSize.LARGE,
                    },
                  }}
                />
              )}
              
              {/* Operation Types */}
              {tokenStats?.byOperationType && (
                <DataVisualization
                  type={VisualizationType.PIE_CHART}
                  data={{
                    data: Object.entries(tokenStats.byOperationType).map(([type, count], index) => ({
                      label: type,
                      value: count,
                      color: `hsl(${120 + index * 40}, 60%, 50%)`,
                      tooltip: `${type}: ${count.toLocaleString()} tokens (${Math.round((count / tokenStats.totalTokens) * 100)}%)`,
                    })),
                    options: {
                      title: 'Token Usage by Operation Type',
                      subtitle: 'Distribution across different AI operations',
                      size: ChartSize.LARGE,
                    },
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Usage Over Time Table */}
          {tokenStats?.byDay && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Daily Usage Report
              </h2>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tokens Used
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          API Calls
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Avg. Response Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Success Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {tokenStats.byDay.map((day, index) => (
                        <tr key={day.date} className={index % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-900/30'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(day.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                            {day.tokens.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                            {day.calls?.toLocaleString() || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                            {day.avgResponseTime ? `${Math.round(day.avgResponseTime)}ms` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                            {day.successRate ? `${Math.round(day.successRate * 100)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}