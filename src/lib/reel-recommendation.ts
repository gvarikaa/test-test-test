import { db } from "@/lib/db";
import { analyzeContent, GeminiModel, ModelPreset, SafetyLevel, getModelPreset } from "@/lib/gemini";
import { Prisma } from "@prisma/client";

// Types
export interface ReelRecommendationOptions {
  limit?: number;
  includeFollowing?: boolean;
  includeTopics?: boolean;
  includeTrending?: boolean;
  includeSimilarContent?: boolean;
  includeExplore?: boolean;
  diversityFactor?: number; // 0-1, higher means more diverse recommendations
}

export interface ReelRecommendationResult {
  reelId: string;
  score: number;
  reason: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface UserInterestProfile {
  explicitInterests: { topicId: string; weight: number }[];
  implicitInterests: { topicId: string; weight: number }[];
  viewingPatterns: {
    averageDuration: number;
    completionRate: number;
    timeOfDay: Record<string, number>;
    categories: Record<string, number>;
  };
  engagementMetrics: {
    likeRatio: number;
    commentRatio: number;
    shareRatio: number;
  };
}

const DEFAULT_OPTIONS: ReelRecommendationOptions = {
  limit: 20,
  includeFollowing: true,
  includeTopics: true,
  includeTrending: true,
  includeSimilarContent: true,
  includeExplore: true,
  diversityFactor: 0.3,
};

/**
 * Get personalized reel recommendations for a user
 */
export async function getReelRecommendations(
  userId: string,
  options: ReelRecommendationOptions = {}
): Promise<ReelRecommendationResult[]> {
  // Merge options with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // 1. Check if user has recent recommendations
    const existingRecommendations = await db.userRecommendation.findMany({
      where: {
        userId,
        contentType: "REEL",
        isViewed: false,
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) }, // last 24 hours
      },
      orderBy: { score: "desc" },
      take: opts.limit,
    });

    // Return existing recommendations if enough fresh ones exist
    if (existingRecommendations.length >= opts.limit) {
      return existingRecommendations.map(rec => ({
        reelId: rec.contentId,
        score: rec.score,
        reason: rec.reason,
        source: rec.source,
        metadata: rec.metadata as Record<string, any> || {},
      }));
    }

    // 2. Generate fresh recommendations
    const recommendations = await generateRecommendations(userId, opts);
    
    // 3. Store recommendations for future use
    if (recommendations.length > 0) {
      await db.userRecommendation.createMany({
        data: recommendations.map(rec => ({
          userId,
          contentId: rec.reelId,
          contentType: "REEL",
          score: rec.score,
          reason: rec.reason,
          source: rec.source,
          isViewed: false,
          isClicked: false,
          metadata: rec.metadata || {},
        })),
        skipDuplicates: true,
      });
    }

    return recommendations;
  } catch (error) {
    console.error("Error generating reel recommendations:", error);
    return [];
  }
}

/**
 * Generate personalized reel recommendations
 */
async function generateRecommendations(
  userId: string,
  options: ReelRecommendationOptions
): Promise<ReelRecommendationResult[]> {
  // Collect all recommendation candidates with scores
  const allCandidates: ReelRecommendationResult[] = [];

  // 1. Get user profile and interests
  const userProfile = await getUserInterestProfile(userId);
  
  // Get reels the user has already seen to exclude them
  const viewedReelIds = await getViewedReelIds(userId);
  
  // 2. Get recommendations from different sources in parallel
  const [followingRecs, topicRecs, trendingRecs, similarRecs, exploreRecs] = await Promise.all([
    options.includeFollowing ? getFollowingRecommendations(userId, viewedReelIds) : Promise.resolve([]),
    options.includeTopics ? getTopicBasedRecommendations(userId, userProfile, viewedReelIds) : Promise.resolve([]),
    options.includeTrending ? getTrendingRecommendations(userId, viewedReelIds) : Promise.resolve([]),
    options.includeSimilarContent ? getSimilarContentRecommendations(userId, userProfile, viewedReelIds) : Promise.resolve([]),
    options.includeExplore ? getExploreRecommendations(userId, userProfile, viewedReelIds) : Promise.resolve([]),
  ]);

  // 3. Combine all recommendations
  allCandidates.push(...followingRecs, ...topicRecs, ...trendingRecs, ...similarRecs, ...exploreRecs);

  // 4. Remove duplicates (keep the highest scored one)
  const uniqueCandidates = allCandidates.reduce((acc, current) => {
    const existing = acc.find(item => item.reelId === current.reelId);
    if (!existing || existing.score < current.score) {
      if (existing) {
        // Remove the lower scored duplicate
        acc = acc.filter(item => item.reelId !== current.reelId);
      }
      // Add the current item
      acc.push(current);
    }
    return acc;
  }, [] as ReelRecommendationResult[]);
  
  // 5. Apply diversity boosting if needed
  const finalCandidates = options.diversityFactor && options.diversityFactor > 0
    ? applyDiversityBoosting(uniqueCandidates, userProfile, options.diversityFactor)
    : uniqueCandidates;

  // 6. Sort by score and limit results
  return finalCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit || 20);
}

/**
 * Get reels from people the user follows
 */
async function getFollowingRecommendations(
  userId: string,
  excludeReelIds: string[]
): Promise<ReelRecommendationResult[]> {
  // Get users that this user follows
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  
  const followingIds = following.map(f => f.followingId);
  
  if (followingIds.length === 0) {
    return [];
  }
  
  // Get recent reels from followed users
  const reels = await db.reel.findMany({
    where: {
      userId: { in: followingIds },
      id: { notIn: excludeReelIds },
      isPublished: true,
    },
    include: {
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
    ],
    take: 50,
  });
  
  // Score based on recency and engagement metrics
  return reels.map(reel => {
    // Base score is mostly recency-based for following feed
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - reel.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const recencyScore = 1 / daysSinceCreation;
    
    // Engagement adds a smaller boost
    const engagementScore = (reel.likeCount * 0.01) + (reel.commentCount * 0.05) + (reel.shareCount * 0.02);
    
    // Following reels get a high base score
    const score = 90 + (recencyScore * 10) + (engagementScore);
    
    const userName = reel.user.username || reel.user.name || "someone you follow";
    
    return {
      reelId: reel.id,
      score,
      reason: `New from ${userName}`,
      source: "following",
      metadata: {
        userId: reel.userId,
        daysSinceCreation,
        recencyScore,
        engagementScore,
      },
    };
  });
}

/**
 * Get reels based on user's explicit and implicit topic interests
 */
async function getTopicBasedRecommendations(
  userId: string,
  userProfile: UserInterestProfile,
  excludeReelIds: string[]
): Promise<ReelRecommendationResult[]> {
  // Combine explicit and implicit interests
  const allInterests = [
    ...userProfile.explicitInterests,
    ...userProfile.implicitInterests,
  ];
  
  if (allInterests.length === 0) {
    return [];
  }
  
  // Get unique topic IDs with their combined weights
  const topicWeights = allInterests.reduce((acc, interest) => {
    const currentWeight = acc[interest.topicId] || 0;
    acc[interest.topicId] = currentWeight + interest.weight;
    return acc;
  }, {} as Record<string, number>);
  
  const topicIds = Object.keys(topicWeights);
  
  // Get reels with these topics
  const reels = await db.reel.findMany({
    where: {
      id: { notIn: excludeReelIds },
      isPublished: true,
      hashtags: {
        some: {
          topicId: { in: topicIds },
        },
      },
    },
    include: {
      hashtags: {
        include: {
          topic: true,
        },
      },
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
    orderBy: [
      { likeCount: "desc" },
      { createdAt: "desc" },
    ],
    take: 100,
  });
  
  // Calculate weighted scores based on topic matches and engagement
  return reels.map(reel => {
    // Calculate topic match score
    let topicMatchScore = 0;
    let matchedTopics: string[] = [];
    
    reel.hashtags.forEach(hashtag => {
      const weight = topicWeights[hashtag.topicId] || 0;
      if (weight > 0) {
        topicMatchScore += weight;
        matchedTopics.push(hashtag.topic.name);
      }
    });
    
    // Normalize topic match score (0-50)
    topicMatchScore = Math.min(50, topicMatchScore * 10);
    
    // Engagement score (0-30)
    const engagementScore = Math.min(30, (reel.likeCount * 0.1) + (reel.viewCount * 0.01) + (reel.commentCount * 0.2) + (reel.shareCount * 0.3));
    
    // Recency score (0-20)
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - reel.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const recencyScore = Math.min(20, 20 / daysSinceCreation);
    
    // Total score
    const score = topicMatchScore + engagementScore + recencyScore;
    
    // Create reason based on matched topics
    let reason = "Based on your interests";
    if (matchedTopics.length > 0) {
      // Get up to 2 topics for the reason
      const displayTopics = matchedTopics.slice(0, 2);
      reason = `Based on your interest in ${displayTopics.join(" and ")}`;
    }
    
    return {
      reelId: reel.id,
      score,
      reason,
      source: "topics",
      metadata: {
        matchedTopics,
        topicMatchScore,
        engagementScore,
        recencyScore,
      },
    };
  });
}

/**
 * Get trending reels across the platform
 */
async function getTrendingRecommendations(
  userId: string,
  excludeReelIds: string[]
): Promise<ReelRecommendationResult[]> {
  // Get trending reels based on recent engagement
  const reels = await db.reel.findMany({
    where: {
      id: { notIn: excludeReelIds },
      userId: { not: userId }, // Don't recommend user's own reels
      isPublished: true,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    },
    orderBy: [
      {
        likeCount: "desc",
      },
      {
        viewCount: "desc",
      },
    ],
    take: 50,
  });
  
  // Calculate trending score - emphasize virality
  return reels.map(reel => {
    // Calculate age in hours to emphasize recent content
    const hoursOld = Math.max(1, (Date.now() - reel.createdAt.getTime()) / (1000 * 60 * 60));
    
    // Trending algorithm - engagement per hour with emphasis on likes and shares
    const engagementPerHour = (
      (reel.likeCount * 1.5) + 
      (reel.commentCount * 2) + 
      (reel.shareCount * 3) + 
      (reel.viewCount * 0.1)
    ) / hoursOld;
    
    // Cap at 100 to prevent outliers from dominating
    const score = Math.min(85, 40 + (engagementPerHour * 0.5));
    
    return {
      reelId: reel.id,
      score,
      reason: "Trending on DapDip",
      source: "trending",
      metadata: {
        engagementPerHour,
        hoursOld,
      },
    };
  });
}

/**
 * Get reels similar to content the user has engaged with
 */
async function getSimilarContentRecommendations(
  userId: string,
  userProfile: UserInterestProfile,
  excludeReelIds: string[]
): Promise<ReelRecommendationResult[]> {
  // Get reels user has engaged with positively (liked, commented, shared, watched >70%)
  const reelEngagements = await db.reelView.findMany({
    where: {
      userId,
      completionRate: { gte: 0.7 },
    },
    include: {
      reel: {
        include: {
          hashtags: {
            include: {
              topic: true,
            },
          },
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });
  
  if (reelEngagements.length === 0) {
    return [];
  }
  
  // Extract key attributes from engaged reels to find similar content
  const engagedReelTopicIds = new Set<string>();
  const engagedReelCreatorIds = new Set<string>();
  
  reelEngagements.forEach(engagement => {
    // Add topics
    engagement.reel.hashtags.forEach(hashtag => {
      engagedReelTopicIds.add(hashtag.topicId);
    });
    
    // Add creator
    engagedReelCreatorIds.add(engagement.reel.userId);
  });
  
  // Find similar reels by topic and creator
  const similarReels = await db.reel.findMany({
    where: {
      id: { notIn: excludeReelIds },
      isPublished: true,
      OR: [
        {
          hashtags: {
            some: {
              topicId: {
                in: Array.from(engagedReelTopicIds),
              },
            },
          },
        },
        {
          userId: {
            in: Array.from(engagedReelCreatorIds),
          },
        },
      ],
    },
    include: {
      hashtags: {
        include: {
          topic: true,
        },
      },
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { likeCount: "desc" },
    ],
    take: 50,
  });
  
  // Score similar reels based on similarity and engagement
  return similarReels.map(reel => {
    // Calculate topic overlap
    const overlappingTopics = reel.hashtags.filter(ht => 
      engagedReelTopicIds.has(ht.topicId)
    );
    
    const topicOverlapScore = Math.min(40, overlappingTopics.length * 10);
    
    // Check if from same creator as engaged content
    const creatorOverlapScore = engagedReelCreatorIds.has(reel.userId) ? 20 : 0;
    
    // Base quality score
    const qualityScore = Math.min(20, (reel.likeCount * 0.1) + (reel.viewCount * 0.01));
    
    // Recency score
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - reel.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const recencyScore = Math.min(20, 20 / daysSinceCreation);
    
    // Total score
    const score = topicOverlapScore + creatorOverlapScore + qualityScore + recencyScore;
    
    // Create reason
    let reason = "Similar to content you've enjoyed";
    if (creatorOverlapScore > 0) {
      reason = `More from ${reel.user.username || reel.user.name || "a creator you've watched"}`;
    } else if (overlappingTopics.length > 0) {
      const topicNames = overlappingTopics.slice(0, 2).map(ht => ht.topic.name);
      reason = `Similar content about ${topicNames.join(" and ")}`;
    }
    
    return {
      reelId: reel.id,
      score,
      reason,
      source: "similar_content",
      metadata: {
        overlappingTopics: overlappingTopics.map(ht => ht.topic.name),
        topicOverlapScore,
        creatorOverlapScore,
        qualityScore,
        recencyScore,
      },
    };
  });
}

/**
 * Get diverse reels for exploration
 */
async function getExploreRecommendations(
  userId: string,
  userProfile: UserInterestProfile,
  excludeReelIds: string[]
): Promise<ReelRecommendationResult[]> {
  // Use AI to recommend diverse content based on user profile
  try {
    const userInterestTopicIds = [
      ...userProfile.explicitInterests,
      ...userProfile.implicitInterests,
    ].map(interest => interest.topicId);
    
    // Get topics not in user's current interests (for diversity)
    const diverseTopics = await db.topic.findMany({
      where: {
        id: {
          notIn: userInterestTopicIds,
        },
        // Only get topics that have some engagement
        reelHashtags: {
          some: {},
        },
      },
      orderBy: {
        reelHashtags: {
          _count: "desc",
        },
      },
      take: 10,
    });
    
    if (diverseTopics.length === 0) {
      return [];
    }
    
    // Get popular reels from these diverse topics
    const diverseReels = await db.reel.findMany({
      where: {
        id: { notIn: excludeReelIds },
        isPublished: true,
        hashtags: {
          some: {
            topicId: {
              in: diverseTopics.map(t => t.id),
            },
          },
        },
      },
      include: {
        hashtags: {
          include: {
            topic: true,
          },
        },
        user: {
          select: {
            name: true,
            username: true,
          },
        },
      },
      orderBy: [
        { likeCount: "desc" },
        { viewCount: "desc" },
      ],
      take: 30,
    });
    
    // Use AI to match the best diverse reels for this user
    const aiRecommendations = await getAIDiverseRecommendations(
      userProfile,
      diverseReels
    );
    
    return aiRecommendations.map(rec => ({
      reelId: rec.reelId,
      score: 55 + (rec.score * 20), // Exploration scores capped lower than primary recommendations
      reason: rec.reason || "Explore something different",
      source: "ai_explore",
      metadata: rec.metadata || {},
    }));
  } catch (error) {
    console.error("Error generating explore recommendations:", error);
    return [];
  }
}

/**
 * Use AI to recommend diverse content
 */
async function getAIDiverseRecommendations(
  userProfile: UserInterestProfile,
  candidateReels: Array<any>
): Promise<ReelRecommendationResult[]> {
  // Create a summary of user interests
  const userInterestSummary = {
    explicitInterests: userProfile.explicitInterests.map(i => ({ topicId: i.topicId, weight: i.weight })),
    implicitInterests: userProfile.implicitInterests.map(i => ({ topicId: i.topicId, weight: i.weight })),
    viewingPatterns: userProfile.viewingPatterns,
    engagementMetrics: userProfile.engagementMetrics,
  };
  
  // Create summaries of candidate reels
  const reelSummaries = candidateReels.map(reel => ({
    id: reel.id,
    topics: reel.hashtags.map((h: any) => h.topic.name),
    likeCount: reel.likeCount,
    viewCount: reel.viewCount,
    commentCount: reel.commentCount,
    shareCount: reel.shareCount,
    createdAt: reel.createdAt,
  }));
  
  // If there are no reels to analyze, return empty array
  if (reelSummaries.length === 0) {
    return [];
  }
  
  try {
    // Use Gemini to analyze which reels would be most interesting for the user to explore
    const aiPrompt = `
      Based on the following user profile, recommend 5-10 reels from the candidate list that would be most interesting for the user to explore.
      These should be diverse content that expands the user's interests while still being potentially engaging.

      User Interest Profile:
      ${JSON.stringify(userInterestSummary, null, 2)}

      Candidate Reels:
      ${JSON.stringify(reelSummaries, null, 2)}

      For each recommended reel, provide:
      1. The reel ID
      2. A score between 0-1 indicating how strongly you recommend it
      3. A brief, natural-sounding reason why the user might enjoy this content (without mentioning AI or recommendations)
      4. A category or theme that this recommendation represents

      Format your response as a JSON array of objects with fields: reelId, score, reason, and metadata.
      The metadata should include the category/theme.
    `;
    
    // Use a balanced preset for recommendations
    const result = await analyzeContent(
      aiPrompt,
      GeminiModel.PRO_1_5,
      'standard',
      getModelPreset(ModelPreset.BALANCED),
      SafetyLevel.STANDARD
    );
    
    // Parse the AI response to get recommendations
    let aiRecommendations: ReelRecommendationResult[] = [];
    
    if (result && typeof result === 'object') {
      // Try to extract recommendations from various possible formats
      if (Array.isArray(result)) {
        aiRecommendations = result as ReelRecommendationResult[];
      } else if (result.recommendations && Array.isArray(result.recommendations)) {
        aiRecommendations = result.recommendations as ReelRecommendationResult[];
      }
    }
    
    // Validate and clean up recommendations
    return aiRecommendations
      .filter(rec => rec.reelId && rec.score !== undefined && rec.reason)
      .map(rec => ({
        reelId: rec.reelId,
        score: Math.max(0, Math.min(1, rec.score)), // Ensure score is between 0-1
        reason: rec.reason,
        source: "ai_explore",
        metadata: {
          ...rec.metadata,
          aiGenerated: true,
        },
      }));
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    
    // Fallback to simple diversity-based scoring
    return candidateReels.slice(0, 10).map((reel, index) => {
      const score = 0.8 - (index * 0.05); // Simple decreasing score
      const topicNames = reel.hashtags.slice(0, 2).map((h: any) => h.topic.name);
      
      return {
        reelId: reel.id,
        score,
        reason: topicNames.length > 0 
          ? `Discover content about ${topicNames.join(" and ")}`
          : "Explore something new",
        source: "explore_fallback",
        metadata: {
          topics: reel.hashtags.map((h: any) => h.topic.name),
          fallback: true,
        },
      };
    });
  }
}

/**
 * Apply diversity boosting to recommendations
 */
function applyDiversityBoosting(
  candidates: ReelRecommendationResult[],
  userProfile: UserInterestProfile,
  diversityFactor: number
): ReelRecommendationResult[] {
  // No boosting needed if diversity factor is 0 or no candidates
  if (diversityFactor === 0 || candidates.length <= 1) {
    return candidates;
  }
  
  // Clone candidates to avoid mutation
  const boostedCandidates = [...candidates];
  
  // Extract creator IDs and topics from metadata where available
  const seenCreators = new Set<string>();
  const seenTopics = new Set<string>();
  
  // Apply diversity boosting
  return boostedCandidates.map((candidate, index) => {
    // Skip diversity boosting for the first few items
    if (index < 3) {
      return candidate;
    }
    
    const metadata = candidate.metadata || {};
    const creatorId = metadata.userId;
    const topics = Array.isArray(metadata.matchedTopics) ? metadata.matchedTopics : 
                   Array.isArray(metadata.topics) ? metadata.topics : 
                   Array.isArray(metadata.overlappingTopics) ? metadata.overlappingTopics : [];
    
    // Check if we've seen this creator or topics before
    let diversityBoost = 0;
    
    if (creatorId && seenCreators.has(creatorId)) {
      // Penalize for duplicate creator
      diversityBoost -= diversityFactor * 10;
    } else if (creatorId) {
      seenCreators.add(creatorId);
    }
    
    // Check for topic overlap
    const topicOverlap = topics.filter(topic => seenTopics.has(topic)).length;
    if (topics.length > 0 && topicOverlap > 0) {
      // Penalize based on proportion of overlapping topics
      diversityBoost -= (topicOverlap / topics.length) * diversityFactor * 15;
    }
    
    // Add all topics to seen set
    topics.forEach(topic => seenTopics.add(topic));
    
    // Small boost for explore recommendations to improve discovery
    if (candidate.source === "ai_explore" || candidate.source === "explore_fallback") {
      diversityBoost += diversityFactor * 5;
    }
    
    // Apply boost (may be negative)
    return {
      ...candidate,
      score: candidate.score + diversityBoost,
      metadata: {
        ...metadata,
        diversityBoost,
      },
    };
  });
}

/**
 * Build a profile of user interests from explicit and implicit data
 */
async function getUserInterestProfile(userId: string): Promise<UserInterestProfile> {
  try {
    // 1. Get explicit interests
    const userInterests = await db.userInterest.findMany({
      where: { userId },
    });
    
    // 2. Get recent views for implicit interests
    const recentViews = await db.reelView.findMany({
      where: { 
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      include: {
        reel: {
          include: {
            hashtags: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    
    // 3. Get engagement metrics
    const engagementCounts = await db.userBehaviorLog.groupBy({
      by: ["behaviorType"],
      where: {
        userId,
        contentType: "REEL",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      _count: {
        behaviorType: true,
      },
    });
    
    // 4. Calculate implicit interests based on viewing history
    const topicWeights: Record<string, number> = {};
    let totalInteractions = 0;
    
    recentViews.forEach(view => {
      // Higher weights for videos watched longer
      const weight = view.completionRate >= 0.9 ? 3 : 
                    view.completionRate >= 0.7 ? 2 : 
                    view.completionRate >= 0.4 ? 1 : 0.5;
      
      view.reel.hashtags.forEach(hashtag => {
        topicWeights[hashtag.topicId] = (topicWeights[hashtag.topicId] || 0) + weight;
        totalInteractions += weight;
      });
    });
    
    // Normalize weights
    const implicitInterests = Object.entries(topicWeights).map(([topicId, weight]) => ({
      topicId,
      weight: totalInteractions > 0 ? weight / totalInteractions : 0,
    }));
    
    // 5. Calculate viewing patterns
    const timeOfDayDistribution: Record<string, number> = {
      "morning": 0,
      "afternoon": 0,
      "evening": 0,
      "night": 0,
    };
    
    const categoryEngagement: Record<string, number> = {};
    
    let totalDuration = 0;
    let totalViews = 0;
    let totalCompletionRate = 0;
    
    recentViews.forEach(view => {
      // Time of day
      const hour = view.createdAt.getHours();
      if (hour >= 5 && hour < 12) timeOfDayDistribution.morning++;
      else if (hour >= 12 && hour < 17) timeOfDayDistribution.afternoon++;
      else if (hour >= 17 && hour < 22) timeOfDayDistribution.evening++;
      else timeOfDayDistribution.night++;
      
      // Category engagement
      view.reel.hashtags.forEach(hashtag => {
        categoryEngagement[hashtag.topicId] = (categoryEngagement[hashtag.topicId] || 0) + 1;
      });
      
      // Viewing statistics
      if (view.watchDuration) {
        totalDuration += view.watchDuration;
        totalViews++;
      }
      
      if (view.completionRate) {
        totalCompletionRate += view.completionRate;
      }
    });
    
    // 6. Calculate engagement metrics
    const viewCount = engagementCounts.find(e => e.behaviorType === "VIEW")?._count?.behaviorType || 0;
    const likeCount = engagementCounts.find(e => e.behaviorType === "LIKE")?._count?.behaviorType || 0;
    const commentCount = engagementCounts.find(e => e.behaviorType === "COMMENT")?._count?.behaviorType || 0;
    const shareCount = engagementCounts.find(e => e.behaviorType === "SHARE")?._count?.behaviorType || 0;
    
    // 7. Build complete profile
    return {
      explicitInterests: userInterests.map(interest => ({
        topicId: interest.topicId,
        weight: interest.weight,
      })),
      implicitInterests: implicitInterests.sort((a, b) => b.weight - a.weight).slice(0, 20),
      viewingPatterns: {
        averageDuration: totalViews > 0 ? totalDuration / totalViews : 0,
        completionRate: totalViews > 0 ? totalCompletionRate / totalViews : 0,
        timeOfDay: timeOfDayDistribution,
        categories: categoryEngagement,
      },
      engagementMetrics: {
        likeRatio: viewCount > 0 ? likeCount / viewCount : 0,
        commentRatio: viewCount > 0 ? commentCount / viewCount : 0,
        shareRatio: viewCount > 0 ? shareCount / viewCount : 0,
      },
    };
  } catch (error) {
    console.error("Error building user interest profile:", error);
    
    // Return empty profile
    return {
      explicitInterests: [],
      implicitInterests: [],
      viewingPatterns: {
        averageDuration: 0,
        completionRate: 0,
        timeOfDay: {},
        categories: {},
      },
      engagementMetrics: {
        likeRatio: 0,
        commentRatio: 0,
        shareRatio: 0,
      },
    };
  }
}

/**
 * Get list of reel IDs the user has already viewed
 */
async function getViewedReelIds(userId: string): Promise<string[]> {
  try {
    const recentViews = await db.reelView.findMany({
      where: { 
        userId,
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, // Last 2 weeks
      },
      select: {
        reelId: true,
      },
    });
    
    return recentViews.map(view => view.reelId);
  } catch (error) {
    console.error("Error fetching viewed reel IDs:", error);
    return [];
  }
}

/**
 * Logs a user view of a reel for recommendation tracking
 */
export async function logReelView(
  userId: string,
  reelId: string,
  completionRate: number,
  watchDuration: number
): Promise<void> {
  try {
    // Check if this view came from a recommendation
    const recommendation = await db.userRecommendation.findFirst({
      where: {
        userId,
        contentId: reelId,
        contentType: "REEL",
        isViewed: true,
        isClicked: false,
      },
    });
    
    // If from a recommendation, update it
    if (recommendation) {
      await db.userRecommendation.update({
        where: { id: recommendation.id },
        data: {
          isClicked: true,
          clickedAt: new Date(),
          metadata: {
            ...recommendation.metadata as any,
            completionRate,
            watchDuration,
          },
        },
      });
    }
    
    // Always log to behavioral logs for future recommendation improvement
    await db.userBehaviorLog.create({
      data: {
        userId,
        behaviorType: "VIEW",
        contentId: reelId,
        contentType: "REEL",
        duration: Math.round(watchDuration),
        metadata: {
          completionRate,
          fromRecommendation: !!recommendation,
        },
      },
    });
  } catch (error) {
    console.error("Error logging reel view:", error);
  }
}

/**
 * Mark recommendations as viewed (without clicking)
 */
export async function markRecommendationsViewed(
  userId: string,
  reelIds: string[]
): Promise<void> {
  if (!reelIds.length) return;
  
  try {
    await db.userRecommendation.updateMany({
      where: {
        userId,
        contentId: { in: reelIds },
        contentType: "REEL",
        isViewed: false,
      },
      data: {
        isViewed: true,
        viewedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error marking recommendations as viewed:", error);
  }
}