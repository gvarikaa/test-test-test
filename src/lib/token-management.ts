import { db } from '@/lib/db';
import { GeminiModel } from '@/lib/gemini';

// Define token tier limits
export enum TokenTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

// Define token limits per tier
export const TOKEN_TIER_LIMITS = {
  [TokenTier.FREE]: 150,
  [TokenTier.BASIC]: 1000,
  [TokenTier.PRO]: 5000,
  [TokenTier.ENTERPRISE]: 10000,
};

// Define monthly allocations per tier
export const MONTHLY_ALLOCATIONS = {
  [TokenTier.FREE]: 5000,
  [TokenTier.BASIC]: 30000,
  [TokenTier.PRO]: 150000,
  [TokenTier.ENTERPRISE]: 500000,
};

// Define token refresh schedules (cron expressions)
export const TOKEN_REFRESH_SCHEDULES = {
  [TokenTier.FREE]: '0 0 * * *',       // Daily at midnight
  [TokenTier.BASIC]: '0 0 * * *',      // Daily at midnight
  [TokenTier.PRO]: '0 0 * * *',        // Daily at midnight
  [TokenTier.ENTERPRISE]: '0 0 * * *', // Daily at midnight
};

// Define token costs for different operations
export const TOKEN_COSTS = {
  CONTENT_ANALYSIS: {
    standard: 50,
    detailed: 100,
    sentiment: 30,
    moderation: 40,
  },
  HEALTH_RECOMMENDATIONS: {
    basic: 75,
    standard: 100,
    detailed: 200,
  },
  CHAT_MESSAGE: {
    short: 20,
    medium: 30,
    long: 50,
  },
  IMAGE_ANALYSIS: {
    description: 60,
    detailed: 120,
    moderation: 80,
  },
  MEAL_PLAN_GENERATION: 150,
  WORKOUT_PLAN_GENERATION: 150,
  TRANSLATION: {
    detection: 20,
    standard: 40,
    precise: 60,
  },
  LANGUAGE_ANALYSIS: {
    standard: 50,
    detailed: 80,
  },
  MULTILINGUAL_GENERATION: {
    standard: 60,
    creative: 80,
  },
  SEO_OPTIMIZATION: 80,
  FEED_PERSONALIZATION: 40,
};

// Token usage tracking with analytics
export interface TokenUsageData {
  userId: string;
  operationType: string;
  tokensUsed: number;
  model: string;
  endpoint?: string;
  featureArea?: string;
  prompt?: string;
  promptTokens?: number;
  completionTokens?: number;
  success?: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
  responseTime?: number;
}

// Token tier upgrade options
export interface TierUpgradeOptions {
  tier: TokenTier;
  resetType?: 'none' | 'immediate' | 'next-cycle';
  bonusTokens?: number;
  prorated?: boolean;
}

// Token usage stats for visualization
// Base interface for day-based data
interface DayData {
  date: string;
  tokens: number;
}

// Enhanced day data with additional metrics
interface EnhancedDayData extends DayData {
  calls?: number;
  avgResponseTime?: number;
  successRate?: number;
}

// User activity data
interface UserActivityData {
  id: string;
  tokens: number;
  calls?: number;
}

// Base token usage stats
export interface TokenUsageStats {
  totalTokens: number;
  byModel: Record<string, number>;
  byFeature: Record<string, number>;
  byEndpoint: Record<string, number>;
  byOperationType: Record<string, number>;
  byDay: EnhancedDayData[];
  avgResponseTime?: number;
  successRate?: number;
  activeUsers?: number;
  userActivity?: UserActivityData[];
  dailyUsage?: DayData[];
  weeklyUsage?: Array<{ week: string; tokens: number }>;
  monthlyUsage?: Array<{ month: string; tokens: number }>;
  operationBreakdown?: Record<string, number>;
  modelBreakdown?: Record<string, number>;
  featureAreaBreakdown?: Record<string, number>;
  peakUsageTime?: string;
  predictedDepletion?: string;
  savingRecommendations?: string[];
}

/**
 * Initialize token limit for a user
 */
export const initializeTokenLimit = async (userId: string, tier: TokenTier = TokenTier.FREE) => {
  try {
    const existing = await db.aITokenLimit.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    // Create new token limit record
    return await db.aITokenLimit.create({
      data: {
        userId,
        tier,
        limit: TOKEN_TIER_LIMITS[tier],
        usage: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
        monthlyAllocation: MONTHLY_ALLOCATIONS[tier],
        tokenRefreshSchedule: TOKEN_REFRESH_SCHEDULES[tier],
      },
    });
  } catch (error) {
    console.error('Error initializing token limit:', error);
    // Add structured error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing token limit';
    throw new Error(`Token limit initialization failed: ${errorMessage}`);
  }
};

/**
 * Check if user has enough tokens for an operation
 */
export const checkTokenAvailability = async (userId: string, operation: string, variation: string = 'standard'): Promise<boolean> => {
  try {
    // Get user's token limit
    const tokenLimit = await getOrCreateTokenLimit(userId);
    
    // Determine token cost for the operation
    const operationCost = getOperationCost(operation, variation);
    
    // Check if user has enough tokens
    return tokenLimit.usage + operationCost <= tokenLimit.limit;
  } catch (error) {
    console.error('Error checking token availability:', error);
    // Log more context about the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to check tokens for user ${userId} and operation ${operation}: ${errorMessage}`);
    return false;
  }
};

/**
 * Record token usage for an operation
 */
export const recordTokenUsage = async (data: TokenUsageData): Promise<void> => {
  try {
    // Get user's token limit
    const tokenLimit = await getOrCreateTokenLimit(data.userId);
    
    // Calculate total tokens used
    const totalTokens = data.tokensUsed || 
      (data.promptTokens || 0) + (data.completionTokens || 0);
    
    // Update token usage
    await db.aITokenLimit.update({
      where: { userId: data.userId },
      data: {
        usage: tokenLimit.usage + totalTokens,
        lifetimeUsage: tokenLimit.lifetimeUsage + totalTokens,
        lastActivity: new Date(),
        tokenUsageStats: {
          create: {
            operationType: data.operationType,
            tokensUsed: totalTokens,
            model: data.model,
            endpoint: data.endpoint,
            featureArea: data.featureArea,
            prompt: data.prompt,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            success: data.success ?? true,
            errorCode: data.errorCode,
            metadata: data.metadata || {},
            responseTime: data.responseTime,
          }
        }
      },
    });
  } catch (error) {
    console.error('Error recording token usage:', error);
    throw error;
  }
};

/**
 * Reset token usage (scheduled or manual)
 */
export const resetTokenUsage = async (userId: string): Promise<void> => {
  try {
    // Get current token limit
    const tokenLimit = await getOrCreateTokenLimit(userId);

    // Calculate carrying over tokens if applicable (10% for paying tiers)
    const carryOverTokens = tokenLimit.tier !== TokenTier.FREE
      ? Math.floor((tokenLimit.limit - tokenLimit.usage) * 0.1)
      : 0;

    // Update token limit
    await db.aITokenLimit.update({
      where: { userId },
      data: {
        usage: 0,
        previousMonthCarry: carryOverTokens,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
      },
    });

    // Log this reset for analytics
    try {
      // Check if the aiTokenUsageStat model exists before attempting to use it
      if (db.aiTokenUsageStat) {
        await db.aiTokenUsageStat.create({
          data: {
            tokenLimitId: tokenLimit.id,
            operationType: 'TOKEN_RESET',
            tokensUsed: -tokenLimit.usage, // Negative to indicate token reset
            model: 'system',
            endpoint: 'token-management.resetTokenUsage',
            featureArea: 'system',
            metadata: {
              previousUsage: tokenLimit.usage,
              carryOver: carryOverTokens,
              tier: tokenLimit.tier
            }
          }
        });
      } else {
        console.log('aiTokenUsageStat model not available, skipping log');
      }
    } catch (statsError) {
      // Don't fail the reset operation if just the stats logging fails
      console.warn('Failed to log token reset statistics:', statsError);
    }
  } catch (error) {
    console.error('Error resetting token usage:', error);
    throw error;
  }
};

/**
 * Clean up expired bonus tokens for all users
 * This should be run on a schedule (e.g., daily or weekly)
 */
export const cleanupExpiredBonusTokens = async (): Promise<{
  cleaned: number;
  errors: number;
  affectedUsers: string[];
}> => {
  const now = new Date();
  const affectedUsers: string[] = [];
  let cleaned = 0;
  let errors = 0;

  try {
    // First, find all users with bonus token history records that have expired
    // Note: This assumes we have a bonusTokenHistory table, if not this will throw and be caught
    const expiredTokens = await db.bonusTokenHistory.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            tokenLimit: true
          }
        }
      }
    });

    // Process each expired bonus token record
    for (const record of expiredTokens) {
      try {
        const userId = record.userId;
        affectedUsers.push(userId);

        // Get current token limit
        const tokenLimit = await db.aITokenLimit.findUnique({
          where: { userId }
        });

        if (!tokenLimit) {
          console.warn(`Token limit not found for user ${userId} when cleaning expired bonus tokens`);
          errors++;
          continue;
        }

        // Update the token limit - deduct expired bonus tokens
        await db.aITokenLimit.update({
          where: { userId },
          data: {
            bonusTokens: Math.max(0, tokenLimit.bonusTokens - record.amount),
            limit: Math.max(
              TOKEN_TIER_LIMITS[tokenLimit.tier as TokenTier],
              tokenLimit.limit - record.amount
            ),
          }
        });

        // Mark the bonus token record as expired
        await db.bonusTokenHistory.update({
          where: { id: record.id },
          data: {
            status: 'EXPIRED'
          }
        });

        cleaned++;
      } catch (userError) {
        console.error(`Error cleaning expired bonus tokens for user ${record.userId}:`, userError);
        errors++;
      }
    }

    return { cleaned, errors, affectedUsers };
  } catch (error) {
    // Return with whatever we managed to clean up so far
    console.error('Error in bulk bonus token cleanup:', error);
    return { cleaned, errors, affectedUsers };
  }
};

/**
 * Upgrade user to a new tier
 */
export const upgradeTier = async (userId: string, options: TierUpgradeOptions): Promise<void> => {
  try {
    // Get current token limit
    const tokenLimit = await getOrCreateTokenLimit(userId);
    
    // Prepare update data
    const updateData: any = {
      tier: options.tier,
      limit: TOKEN_TIER_LIMITS[options.tier],
      monthlyAllocation: MONTHLY_ALLOCATIONS[options.tier],
      tokenRefreshSchedule: TOKEN_REFRESH_SCHEDULES[options.tier],
    };
    
    // Add bonus tokens if provided
    if (options.bonusTokens) {
      updateData.bonusTokens = tokenLimit.bonusTokens + options.bonusTokens;
      updateData.limit = updateData.limit + options.bonusTokens;
    }
    
    // Handle reset type
    if (options.resetType === 'immediate') {
      updateData.usage = 0;
      updateData.resetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (options.resetType === 'next-cycle') {
      // Keep current usage, just update the tier details
    }
    
    // Update token limit
    await db.aITokenLimit.update({
      where: { userId },
      data: updateData,
    });
  } catch (error) {
    console.error('Error upgrading tier:', error);
    throw error;
  }
};

/**
 * Get token usage statistics for a user
 */
export async function getTokenUsageStats(
  userId: string,
  timeframe: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<TokenUsageStats> {
  try {
    // Use imported database instance that was imported at the top of the file
    // No need for getDb() function as we already have access to the db instance

    // Calculate the start date based on timeframe
    const now = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get all token usage records for the user within the timeframe
    let tokenUsage = [];
    try {
      if (db.aiTokenUsage) {
        tokenUsage = await db.aiTokenUsage.findMany({
          where: {
            userId,
            createdAt: {
              gte: startDate,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      } else {
        console.log('aiTokenUsage model not available, using empty array');
      }
    } catch (error) {
      console.warn('Error fetching token usage, using empty array:', error);
    }

    // For admin users, also get platform-wide statistics
    let allTokenUsage = tokenUsage;
    let activeUsers = 1;
    let userActivity: { id: string; tokens: number; calls?: number }[] = [];

    // Check if the user is an admin to provide platform-wide stats
    let isAdmin = false;
    try {
      const adminUser = await db.user.findFirst({
        where: {
          id: userId,
          role: 'ADMIN',
        },
      });
      isAdmin = !!adminUser;
    } catch (error) {
      console.warn('Error checking if user is admin:', error);
    }

    if (isAdmin) {
      // Get all usage data
      try {
        if (db.aiTokenUsage) {
          allTokenUsage = await db.aiTokenUsage.findMany({
            where: {
              createdAt: {
                gte: startDate,
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          });
        } else {
          console.log('aiTokenUsage model not available for admin stats');
        }
      } catch (error) {
        console.warn('Error fetching all token usage:', error);
      }

      // Count active users
      const userIds = new Set(allTokenUsage.map(record => record.userId));
      activeUsers = userIds.size;

      // Get user activity data
      const userTokens: Record<string, { tokens: number; calls: number }> = {};

      allTokenUsage.forEach(record => {
        if (!userTokens[record.userId]) {
          userTokens[record.userId] = { tokens: 0, calls: 0 };
        }
        userTokens[record.userId].tokens += record.tokensUsed;
        userTokens[record.userId].calls += 1;
      });

      userActivity = Object.entries(userTokens)
        .map(([id, { tokens, calls }]) => ({ id, tokens, calls }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10); // Top 10 users
    }

    // Group usage by different categories
    const totalTokens = allTokenUsage.reduce((sum, record) => sum + record.tokensUsed, 0);

    // Group by model
    const byModel: Record<string, number> = {};
    allTokenUsage.forEach(record => {
      byModel[record.model] = (byModel[record.model] || 0) + record.tokensUsed;
    });

    // Group by feature
    const byFeature: Record<string, number> = {};
    allTokenUsage.forEach(record => {
      const feature = record.featureArea || 'unknown';
      byFeature[feature] = (byFeature[feature] || 0) + record.tokensUsed;
    });

    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    allTokenUsage.forEach(record => {
      const endpoint = record.endpoint || 'unknown';
      byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + record.tokensUsed;
    });

    // Group by operation type
    const byOperationType: Record<string, number> = {};
    allTokenUsage.forEach(record => {
      byOperationType[record.operationType] = (byOperationType[record.operationType] || 0) + record.tokensUsed;
    });

    // Group by day with additional metrics
    const byDay: {
      date: string;
      tokens: number;
      calls: number;
      avgResponseTime: number;
      successRate: number;
    }[] = [];

    // Create a map to store daily data
    const dailyMap = new Map<string, {
      tokens: number;
      calls: number;
      responseTimes: number[];
      success: number;
      total: number;
    }>();

    allTokenUsage.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          tokens: 0,
          calls: 0,
          responseTimes: [],
          success: 0,
          total: 0,
        });
      }

      const day = dailyMap.get(date)!;
      day.tokens += record.tokensUsed;
      day.calls += 1;

      if (record.responseTime) {
        day.responseTimes.push(record.responseTime);
      }

      day.total += 1;
      if (record.success) {
        day.success += 1;
      }
    });

    // Convert the map to an array of objects with calculated metrics
    dailyMap.forEach((day, date) => {
      byDay.push({
        date,
        tokens: day.tokens,
        calls: day.calls,
        avgResponseTime: day.responseTimes.length > 0
          ? day.responseTimes.reduce((sum, time) => sum + time, 0) / day.responseTimes.length
          : 0,
        successRate: day.total > 0 ? day.success / day.total : 1,
      });
    });

    // Sort by date
    byDay.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate average response time across all records
    const responseTimes = allTokenUsage
      .filter(record => record.responseTime !== undefined && record.responseTime !== null)
      .map(record => record.responseTime!);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : undefined;

    // Calculate overall success rate
    const successRate = allTokenUsage.length > 0
      ? allTokenUsage.filter(record => record.success).length / allTokenUsage.length
      : undefined;

    // Process stats for legacy visualization
    let dailyUsage: Record<string, number> = {};
    let weeklyUsage: Record<string, number> = {};
    let monthlyUsage: Record<string, number> = {};
    let peakUsageTimes: Record<string, number> = {};

    // Process each usage record for legacy data
    allTokenUsage.forEach(record => {
      // Daily usage
      const dateStr = record.createdAt.toISOString().split('T')[0];
      dailyUsage[dateStr] = (dailyUsage[dateStr] || 0) + record.tokensUsed;

      // Weekly usage
      const weekStart = new Date(record.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStr = weekStart.toISOString().split('T')[0];
      weeklyUsage[weekStr] = (weeklyUsage[weekStr] || 0) + record.tokensUsed;

      // Monthly usage
      const monthStr = `${record.createdAt.getFullYear()}-${String(record.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyUsage[monthStr] = (monthlyUsage[monthStr] || 0) + record.tokensUsed;

      // Peak usage time tracking
      const hour = record.createdAt.getHours();
      peakUsageTimes[hour] = (peakUsageTimes[hour] || 0) + record.tokensUsed;
    });

    // Calculate peak usage time
    let peakHour = 0;
    let peakUsage = 0;
    Object.entries(peakUsageTimes).forEach(([hour, tokens]) => {
      if (tokens > peakUsage) {
        peakUsage = tokens;
        peakHour = parseInt(hour);
      }
    });

    // Format peak usage time
    const peakTimeFormatted = `${peakHour}:00 - ${(peakHour + 1) % 24}:00`;

    // Calculate predicted depletion
    const tokenLimit = await getOrCreateTokenLimit(userId);
    const predictedDepletion = calculatePredictedDepletion(tokenLimit, allTokenUsage);

    // Generate savings recommendations
    const savingRecommendations = generateSavingRecommendations(tokenLimit, allTokenUsage);

    return {
      totalTokens,
      byModel,
      byFeature,
      byEndpoint,
      byOperationType,
      byDay,
      avgResponseTime,
      successRate,
      activeUsers,
      userActivity,
      // Legacy data for backwards compatibility
      dailyUsage: Object.entries(dailyUsage).map(([date, tokens]) => ({ date, tokens })),
      weeklyUsage: Object.entries(weeklyUsage).map(([week, tokens]) => ({ week, tokens })),
      monthlyUsage: Object.entries(monthlyUsage).map(([month, tokens]) => ({ month, tokens })),
      operationBreakdown: byOperationType,
      modelBreakdown: byModel,
      featureAreaBreakdown: byFeature,
      peakUsageTime: peakTimeFormatted,
      predictedDepletion,
      savingRecommendations,
    };
  } catch (error) {
    console.error('Error in getTokenUsageStats:', error);

    // Return empty stats in case of error
    return {
      totalTokens: 0,
      byModel: {},
      byFeature: {},
      byEndpoint: {},
      byOperationType: {},
      byDay: [],
    };
  }
};

/**
 * Get or create token limit for a user
 * Helper function
 */
const getOrCreateTokenLimit = async (userId: string) => {
  const tokenLimit = await db.aITokenLimit.findUnique({
    where: { userId },
  });
  
  if (tokenLimit) {
    return tokenLimit;
  }
  
  return initializeTokenLimit(userId);
};

/**
 * Get operation cost for token tracking
 * Helper function
 */
const getOperationCost = (operation: string, variation: string = 'standard'): number => {
  const costs = TOKEN_COSTS[operation as keyof typeof TOKEN_COSTS];
  
  if (typeof costs === 'object') {
    return costs[variation as keyof typeof costs] || costs.standard || 50;
  }
  
  return costs as number || 50;
};

/**
 * Calculate predicted token depletion date
 * Helper function
 */
const calculatePredictedDepletion = (tokenLimit: any, usageStats: any[]): string | undefined => {
  if (usageStats.length === 0) {
    return undefined;
  }
  
  // Calculate daily average usage
  const totalTokens = usageStats.reduce((sum, stat) => sum + stat.tokensUsed, 0);
  const uniqueDays = new Set(usageStats.map(stat => stat.createdAt.toISOString().split('T')[0])).size;
  const dailyAverage = uniqueDays > 0 ? totalTokens / uniqueDays : totalTokens;
  
  if (dailyAverage <= 0) {
    return undefined;
  }
  
  // Calculate days until depletion
  const remainingTokens = tokenLimit.limit - tokenLimit.usage;
  const daysUntilDepletion = Math.floor(remainingTokens / dailyAverage);
  
  if (daysUntilDepletion <= 0) {
    return 'Today';
  }
  
  // Calculate depletion date
  const depletionDate = new Date();
  depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);
  
  return depletionDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * Generate token saving recommendations
 * Helper function
 */
const generateSavingRecommendations = (tokenLimit: any, usageStats: any[]): string[] => {
  if (usageStats.length === 0) {
    return [
      'Start using the AI features to get personalized recommendations',
      'Explore the different AI capabilities to make the most of your tokens',
    ];
  }
  
  const recommendations: string[] = [];
  
  // Find most token-intensive operations
  const operationCosts: Record<string, number> = {};
  usageStats.forEach(stat => {
    operationCosts[stat.operationType] = (operationCosts[stat.operationType] || 0) + stat.tokensUsed;
  });
  
  // Sort operations by token usage
  const sortedOperations = Object.entries(operationCosts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([op]) => op);
  
  // Find most expensive model used
  const modelCosts: Record<string, number> = {};
  usageStats.forEach(stat => {
    modelCosts[stat.model] = (modelCosts[stat.model] || 0) + stat.tokensUsed;
  });
  
  const mostExpensiveModel = Object.entries(modelCosts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([model]) => model)[0];
  
  // Generate recommendations based on usage patterns
  if (sortedOperations.length > 0) {
    const highestOperation = sortedOperations[0];
    recommendations.push(
      `Consider using the '${highestOperation}' feature more efficiently to reduce token consumption`,
    );
  }
  
  if (mostExpensiveModel && mostExpensiveModel.includes('1.5-pro')) {
    recommendations.push(
      'For less complex tasks, consider switching to smaller models like gemini-pro instead of gemini-1.5-pro',
    );
  }
  
  // Add general recommendations
  recommendations.push(
    'Use more concise prompts to reduce token consumption',
    'Consider upgrading to a higher tier for more monthly tokens',
    'Use cached results for repeated operations when possible',
  );
  
  // Add tier-specific recommendations
  if (tokenLimit.tier === TokenTier.FREE) {
    recommendations.push(
      'Upgrade to BASIC tier for more daily tokens and monthly allocation',
      'Free tier users can earn bonus tokens by completing profile information'
    );
  }
  
  return recommendations;
};

/**
 * Estimate token count for prompt (approximation only)
 * Helper function with improved estimation logic for different languages
 */
export const estimateTokenCount = (text: string): number => {
  if (!text) return 0;

  // Check if text is primarily non-Latin (e.g., Georgian, Chinese, Japanese, Korean, etc.)
  // These languages typically use more tokens per character
  const nonLatinRegex = /[^\u0000-\u007F]/g;
  const nonLatinCharCount = (text.match(nonLatinRegex) || []).length;
  const nonLatinRatio = nonLatinCharCount / text.length;

  if (nonLatinRatio > 0.5) {
    // For primarily non-Latin text, estimate 2-3 characters per token
    return Math.ceil(text.length / 2.5);
  }

  // Check for code-like content (tends to be more efficient in tokens)
  const codeIndicators = ['{', '}', '()', ';', '===', '=>', 'function', 'class', 'import ', 'export '];
  const hasCodeIndicators = codeIndicators.some(indicator => text.includes(indicator));

  if (hasCodeIndicators) {
    // Code tends to compress better into tokens
    return Math.ceil(text.length / 5);
  }

  // Default approximation for Latin-based text: ~4 characters ≈ 1 token
  return Math.ceil(text.length / 4);
};

/**
 * Grant bonus tokens to a user with enhanced tracking and validation
 */
export const grantBonusTokens = async (
  userId: string,
  amount: number,
  reason?: string,
  expiration?: Date
): Promise<boolean> => {
  // Validate the input
  if (amount <= 0) {
    console.error('Cannot grant non-positive token amount:', amount);
    return false;
  }

  if (!userId) {
    console.error('Cannot grant tokens without a valid user ID');
    return false;
  }

  try {
    // Get current token limit
    const tokenLimit = await getOrCreateTokenLimit(userId);

    // Set default expiration date if not provided (30 days from now)
    const tokenExpiration = expiration || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update token limit
    await db.aITokenLimit.update({
      where: { userId },
      data: {
        bonusTokens: tokenLimit.bonusTokens + amount,
        limit: tokenLimit.limit + amount,
        // Log the token grant as a transaction
        tokenUsageStats: {
          create: {
            operationType: 'BONUS_TOKENS',
            tokensUsed: -amount, // Negative to indicate tokens added
            model: 'system',
            featureArea: 'rewards',
            metadata: {
              reason,
              expiresAt: tokenExpiration.toISOString(),
              previousBalance: tokenLimit.bonusTokens,
              newBalance: tokenLimit.bonusTokens + amount
            },
          }
        }
      },
    });

    // Attempt to record bonus token history if the schema supports it
    try {
      await db.bonusTokenHistory.create({
        data: {
          userId,
          amount,
          reason: reason || 'System bonus',
          grantedAt: new Date(),
          expiresAt: tokenExpiration,
          status: 'ACTIVE',
        }
      });
    } catch (historyError) {
      // Ignore if schema doesn't support this table yet
      console.warn('Could not record bonus token history, table may not exist:', historyError);
    }

    // Try to notify user about bonus tokens if notifications table exists
    try {
      await db.notification.create({
        data: {
          userId,
          type: 'TOKEN_BONUS',
          title: 'Bonus Tokens Received',
          content: `You received ${amount} bonus tokens. ${reason ? `Reason: ${reason}` : ''}`,
          read: false,
          data: {
            amount,
            reason,
            expiresAt: tokenExpiration.toISOString()
          }
        }
      });
    } catch (notifyError) {
      // Don't fail if notification table doesn't exist
      console.warn('Failed to create notification for bonus tokens:', notifyError);
    }

    return true;
  } catch (error) {
    console.error('Error granting bonus tokens:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to grant ${amount} bonus tokens to user ${userId}: ${errorMessage}`);
    return false;
  }
};