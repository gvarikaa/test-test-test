"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';
import {
  BarChart,
  PieChart,
  LineChart,
  Hourglass,
  BadgeDollarSign,
  Sparkles,
  Check,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TokenUsageDisplayProps {
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface TokenTier {
  name: string;
  limit: number;
  price: string;
  features: string[];
}

export default function TokenUsageDisplay({
  compact = false,
  showDetails = false,
  className = ''
}: TokenUsageDisplayProps) {
  const { data: session } = useSession();
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [showingDetails, setShowingDetails] = useState(showDetails);
  const [activeTab, setActiveTab] = useState<'usage' | 'models' | 'features' | 'recommendations'>('usage');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Get token limit data
  const { data: tokenLimit, isLoading: isLoadingLimit, refetch } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: !!session?.user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Get token usage stats for visualization
  const { data: tokenStats, isLoading: isLoadingStats } = api.ai.getTokenUsageStats.useQuery(
    { timeframe },
    {
      enabled: !!session?.user?.id && showingDetails,
      refetchInterval: 300000, // Refetch every 5 minutes
    }
  );

  // Mutation to upgrade token tier
  const { mutate: upgradeTier } = api.ai.upgradeTokenTier.useMutation({
    onSuccess: () => {
      setIsUpgrading(false);
      refetch();
    },
  });

  const tiers: Record<string, TokenTier> = {
    FREE: {
      name: "Free",
      limit: 150,
      price: "Free",
      features: [
        "150 tokens daily",
        "Basic content analysis",
        "Limited chat interactions",
        "Basic health recommendations",
      ],
    },
    BASIC: {
      name: "Basic",
      limit: 1000,
      price: "$4.99/month",
      features: [
        "1,000 tokens daily",
        "Full content analysis",
        "Standard chat interactions",
        "Detailed health recommendations",
        "Priority response time",
      ],
    },
    PRO: {
      name: "Pro",
      limit: 5000,
      price: "$9.99/month",
      features: [
        "5,000 tokens daily",
        "Advanced content analysis with trends",
        "Premium chat with context memory",
        "Comprehensive health plans",
        "Access to Gemini 2.5 model",
      ],
    },
    ENTERPRISE: {
      name: "Enterprise",
      limit: 10000,
      price: "$24.99/month",
      features: [
        "10,000 tokens daily",
        "Unlimited content analysis",
        "Advanced AI features",
        "Dedicated AI support",
        "Custom integrations",
        "Team sharing features",
      ],
    },
  };

  const handleUpgrade = (tier: string) => {
    setSelectedTier(tier);
    setIsUpgrading(true);

    // In a real app, this would redirect to a payment page
    // For this demo, we'll just simulate an upgrade after a delay
    setTimeout(() => {
      upgradeTier({ tier: tier as "BASIC" | "PRO" | "ENTERPRISE" });
    }, 1500);
  };

  // Download token usage stats as CSV
  const handleDownloadStats = () => {
    if (!tokenStats) return;

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";

    // Add headers
    csvContent += "Date,Tokens Used\n";

    // Add daily usage data
    tokenStats.dailyUsage.forEach(({ date, tokens }) => {
      csvContent += `${date},${tokens}\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `token-usage-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    document.body.removeChild(link);
  };

  if (isLoadingLimit) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span>Loading token information...</span>
      </div>
    );
  }

  if (!tokenLimit) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <span className="text-muted-foreground text-sm">Token data unavailable</span>
      </div>
    );
  }

  const { tier, limit, usage, resetAt } = tokenLimit;
  const currentTier = tiers[tier];
  const remainingTokens = limit - usage;
  const percentUsed = Math.min(100, Math.round((usage / limit) * 100));
  const timeToReset = resetAt ? formatDistanceToNow(new Date(resetAt)) : "unknown";

  // Determine color based on percentage used
  const getUsageColor = () => {
    if (percentUsed < 50) return 'bg-green-500';
    if (percentUsed < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Compact version for headers and small UI areas
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${getUsageColor()}`}
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>
        <span className="text-xs">
          {usage.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
    );
  }

  // Full version with details
  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-medium">AI Token Usage</h3>
        </div>
        <button
          onClick={() => setShowingDetails(!showingDetails)}
          className="text-muted-foreground hover:text-foreground"
        >
          {showingDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Token Usage Bar */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">
            {tier} Tier
          </span>
          <span className="text-sm">
            {usage.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${getUsageColor()} transition-all duration-500`}
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">
            {percentUsed}% used
          </span>
          {resetAt && (
            <span className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Resets in: {timeToReset}
            </span>
          )}
        </div>
      </div>

      {/* Stats and Visualizations */}
      {showingDetails && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === 'usage'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('usage')}
            >
              <BarChart className="h-4 w-4 mx-auto mb-1" />
              Usage
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === 'models'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('models')}
            >
              <PieChart className="h-4 w-4 mx-auto mb-1" />
              Models
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === 'features'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('features')}
            >
              <LineChart className="h-4 w-4 mx-auto mb-1" />
              Features
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === 'recommendations'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('recommendations')}
            >
              <Sparkles className="h-4 w-4 mx-auto mb-1" />
              Tips
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-border">
            <div className="text-sm text-muted-foreground">Timeframe:</div>
            <div className="flex space-x-1">
              {(['day', 'week', 'month', 'year'] as const).map((t) => (
                <button
                  key={t}
                  className={`px-2 py-1 text-xs rounded-md ${
                    timeframe === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                  onClick={() => setTimeframe(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content based on active tab */}
          <div className="p-4">
            {isLoadingStats ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                <span className="text-sm text-muted-foreground">Loading statistics...</span>
              </div>
            ) : !tokenStats ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No usage data available</p>
              </div>
            ) : (
              <>
                {activeTab === 'usage' && (
                  <div>
                    <div className="flex justify-between mb-4">
                      <h4 className="text-sm font-medium">Usage Over Time</h4>
                      <button
                        onClick={handleDownloadStats}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download CSV
                      </button>
                    </div>

                    {/* Simple bar chart visualization */}
                    <div className="h-32 flex items-end space-x-1">
                      {tokenStats.dailyUsage.slice(-14).map(({ date, tokens }, i) => {
                        const maxTokens = Math.max(...tokenStats.dailyUsage.slice(-14).map(d => d.tokens));
                        const height = maxTokens > 0 ? (tokens / maxTokens * 100) : 0;
                        return (
                          <div key={date} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all"
                              style={{ height: `${height}%` }}
                              title={`${date}: ${tokens} tokens`}
                            ></div>
                            {i % 2 === 0 && (
                              <span className="text-[9px] text-muted-foreground mt-1 rotate-90 md:rotate-0">
                                {new Date(date).getDate()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Stats summary */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-muted/40 p-2 rounded">
                        <div className="text-xs text-muted-foreground">Peak usage time</div>
                        <div className="text-sm font-medium">{tokenStats.peakUsageTime}</div>
                      </div>
                      {tokenStats.predictedDepletion && (
                        <div className="bg-muted/40 p-2 rounded">
                          <div className="text-xs text-muted-foreground">Estimated depletion</div>
                          <div className="text-sm font-medium">{tokenStats.predictedDepletion}</div>
                        </div>
                      )}
                      <div className="bg-muted/40 p-2 rounded">
                        <div className="text-xs text-muted-foreground">Response time</div>
                        <div className="text-sm font-medium">{tokenStats.averageResponseTime}ms</div>
                      </div>
                      <div className="bg-muted/40 p-2 rounded">
                        <div className="text-xs text-muted-foreground">Success rate</div>
                        <div className="text-sm font-medium">{tokenStats.successRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'models' && (
                  <div>
                    <h4 className="text-sm font-medium mb-4">Model Usage Breakdown</h4>

                    {/* Simple model usage visualization */}
                    {Object.entries(tokenStats.modelBreakdown).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(tokenStats.modelBreakdown)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([model, tokens]) => {
                            const totalTokens = Object.values(tokenStats.modelBreakdown).reduce((a, b) => (a as number) + (b as number), 0);
                            const percentage = totalTokens > 0 ? ((tokens as number) / totalTokens) * 100 : 0;

                            return (
                              <div key={model} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="truncate mr-2">{model}</span>
                                  <span>{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No model usage data available
                      </div>
                    )}

                    {/* Model comparison */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">Model Comparison</h4>
                      <div className="bg-muted/40 rounded overflow-hidden">
                        <div className="grid grid-cols-3 text-xs border-b border-border">
                          <div className="p-2 font-medium">Model</div>
                          <div className="p-2 font-medium">Speed</div>
                          <div className="p-2 font-medium">Quality</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs border-b border-border/50">
                          <div className="p-2">gemini-pro</div>
                          <div className="p-2 text-green-500">Fast</div>
                          <div className="p-2 text-amber-500">Good</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs border-b border-border/50">
                          <div className="p-2">gemini-1.5-pro</div>
                          <div className="p-2 text-amber-500">Medium</div>
                          <div className="p-2 text-green-500">Excellent</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs">
                          <div className="p-2">gemini-2.5-flash</div>
                          <div className="p-2 text-green-500">Very Fast</div>
                          <div className="p-2 text-amber-500">Good</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'features' && (
                  <div>
                    <h4 className="text-sm font-medium mb-4">Feature Area Usage</h4>

                    {/* Feature usage visualization */}
                    {Object.entries(tokenStats.featureAreaBreakdown).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(tokenStats.featureAreaBreakdown)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([feature, tokens]) => {
                            const totalTokens = Object.values(tokenStats.featureAreaBreakdown).reduce((a, b) => (a as number) + (b as number), 0);
                            const percentage = totalTokens > 0 ? ((tokens as number) / totalTokens) * 100 : 0;

                            return (
                              <div key={feature} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="capitalize">{feature.toLowerCase().replace('_', ' ')}</span>
                                  <span>{tokens} tokens</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No feature usage data available
                      </div>
                    )}

                    {/* Operation breakdown */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">Operations</h4>
                      {Object.entries(tokenStats.operationBreakdown).length > 0 ? (
                        <div className="bg-muted/40 rounded overflow-hidden">
                          <div className="grid grid-cols-2 text-xs border-b border-border">
                            <div className="p-2 font-medium">Operation</div>
                            <div className="p-2 font-medium text-right">Tokens</div>
                          </div>
                          {Object.entries(tokenStats.operationBreakdown)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 5)
                            .map(([operation, tokens]) => (
                              <div key={operation} className="grid grid-cols-2 text-xs border-b border-border/50">
                                <div className="p-2 truncate">{operation}</div>
                                <div className="p-2 text-right">{(tokens as number).toLocaleString()}</div>
                              </div>
                            ))
                          }
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No operation data available
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'recommendations' && (
                  <div>
                    <h4 className="text-sm font-medium mb-4">Token Saving Tips</h4>

                    {tokenStats.savingRecommendations && tokenStats.savingRecommendations.length > 0 ? (
                      <ul className="space-y-2">
                        {tokenStats.savingRecommendations.map((tip, i) => (
                          <li key={i} className="flex items-start text-sm">
                            <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No recommendations available
                      </div>
                    )}

                    {/* Current plan features */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">{`Your ${currentTier.name} Plan`}</h4>
                      <ul className="space-y-1">
                        {currentTier.features.map((feature, index) => (
                          <li key={index} className="text-sm flex items-start">
                            <Check className="h-3 w-3 text-primary mr-2 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Upgrade prompt */}
                    {tier !== "ENTERPRISE" && (
                      <div className="mt-6 bg-primary/10 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <BadgeDollarSign className="h-5 w-5 text-primary mr-2" />
                          <h4 className="font-medium">Upgrade Your Tier</h4>
                        </div>

                        <div className="space-y-2 mt-3">
                          {Object.entries(tiers)
                            .filter(([key]) => {
                              // Show only higher tiers than the current one
                              const tierOrder = ["FREE", "BASIC", "PRO", "ENTERPRISE"];
                              return tierOrder.indexOf(key) > tierOrder.indexOf(tier);
                            })
                            .map(([key, tierData]) => (
                              <div key={key} className="border rounded-md p-2 bg-background">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-sm">{tierData.name}</span>
                                  <span className="text-xs">{tierData.price}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{`${tierData.limit} tokens daily`}</p>
                                {isUpgrading && selectedTier === key ? (
                                  <button
                                    disabled
                                    className="w-full py-1 px-2 bg-primary/50 text-primary-foreground rounded-md text-xs flex items-center justify-center"
                                  >
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    Processing...
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpgrade(key)}
                                    className="w-full py-1 px-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-xs"
                                  >
                                    Upgrade
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>

                        <p className="text-xs text-muted-foreground mt-2">
                          * For demonstration purposes only
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}