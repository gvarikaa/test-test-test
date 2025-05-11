import { GeminiModel, createChatSession, getModelInstance, SafetyLevel, ContextSize } from './gemini';
import { estimateTokenCount } from './token-management';
import { db } from './db';

/**
 * User behavior tracking types
 */
export enum UserBehaviorType {
  VIEW = 'view',
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  SAVE = 'save',
  CLICK = 'click',
  FOLLOW = 'follow',
  DWELL_TIME = 'dwell_time',
  SEARCH = 'search',
}

/**
 * Content type enum for recommendations
 */
export enum ContentType {
  POST = 'post',
  REEL = 'reel',
  GROUP = 'group',
  EVENT = 'event',
  USER = 'user',
  TOPIC = 'topic',
  STORY = 'story',
}

/**
 * Recommendation source
 */
export enum RecommendationSource {
  COLLABORATIVE_FILTERING = 'collaborative_filtering',
  CONTENT_BASED = 'content_based',
  TRENDING = 'trending',
  SOCIAL_GRAPH = 'social_graph',
  AI_PERSONALIZED = 'ai_personalized',
  INTEREST_BASED = 'interest_based',
  LOCATION_BASED = 'location_based',
}

/**
 * Recommendation reason for transparency
 */
export enum RecommendationReason {
  SIMILAR_CONTENT = 'similar_content',
  FRIENDS_ENGAGED = 'friends_engaged',
  TRENDING_NOW = 'trending_now',
  BASED_ON_INTERESTS = 'based_on_interests',
  BASED_ON_HISTORY = 'based_on_history',
  BASED_ON_LOCATION = 'based_on_location',
  SIMILAR_USERS = 'similar_users',
  COMPLEMENTARY_CONTENT = 'complementary_content',
  NEW_BUT_RELEVANT = 'new_but_relevant',
}

/**
 * Recommendation item interface
 */
export interface RecommendationItem {
  id: string;
  contentType: ContentType;
  score: number;
  reason: RecommendationReason;
  source: RecommendationSource;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * User interest interface
 */
export interface UserInterestProfile {
  topics: Array<{
    id: string;
    name: string;
    weight: number; // 0-1 scale representing interest strength
    lastEngagement: Date;
  }>;
  creators: Array<{
    id: string;
    weight: number;
  }>;
  contentTypes: Record<ContentType, number>; // Preference weight for each content type
  engagementPatterns: Record<UserBehaviorType, number>; // Frequency/preference for each engagement type
  timePatterns: Record<string, number>; // Activity by time of day (hour: weight)
  locationPreferences?: Array<{
    location: string;
    weight: number;
  }>;
}

/**
 * User behavior log interface for tracking engagement
 */
export interface UserBehaviorLog {
  userId: string;
  behaviorType: UserBehaviorType;
  contentId: string;
  contentType: ContentType;
  timestamp: Date;
  duration?: number; // For dwell time
  metadata?: Record<string, any>; // Additional context
}

/**
 * Content similarity interface
 */
export interface ContentSimilarity {
  contentId1: string;
  contentId2: string;
  contentType: ContentType;
  similarityScore: number; // 0-1 scale
  features: string[]; // What features made them similar
  timestamp: Date;
}

/**
 * Collaborative filtering based recommendations
 */
export async function generateCollaborativeRecommendations(
  userId: string,
  contentType: ContentType = ContentType.POST,
  limit: number = 10
): Promise<RecommendationItem[]> {
  try {
    // Find similar users based on behavior patterns
    const userInteractions = await db.userBehaviorLog.findMany({
      where: {
        userId,
        contentType,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100, // Consider recent 100 interactions
    });

    if (userInteractions.length === 0) {
      return []; // No interaction data to base recommendations on
    }

    // Get content IDs user has interacted with
    const userContentIds = userInteractions.map(interaction => interaction.contentId);

    // Find users who interacted with the same content
    const similarUserInteractions = await db.userBehaviorLog.findMany({
      where: {
        userId: {
          not: userId, // Exclude current user
        },
        contentId: {
          in: userContentIds, // Users who interacted with the same content
        },
        contentType,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Count interactions per user to find most similar users
    const userSimilarityScores: Record<string, number> = {};
    similarUserInteractions.forEach(interaction => {
      userSimilarityScores[interaction.userId] = (userSimilarityScores[interaction.userId] || 0) + 1;
    });

    // Sort users by similarity score
    const similarUsers = Object.entries(userSimilarityScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, 20) // Top 20 similar users
      .map(([userId]) => userId);

    if (similarUsers.length === 0) {
      return []; // No similar users found
    }

    // Find content that similar users interacted with, but current user hasn't
    const similarUserContent = await db.userBehaviorLog.findMany({
      where: {
        userId: {
          in: similarUsers,
        },
        contentId: {
          notIn: userContentIds, // Content the current user hasn't interacted with
        },
        contentType,
      },
      orderBy: {
        timestamp: 'desc',
      },
      distinct: ['contentId'], // Deduplicate
    });

    // Group and score content by frequency and recency
    const contentScores: Record<string, { score: number, timestamp: Date }> = {};
    const now = new Date();

    similarUserContent.forEach(interaction => {
      const daysSinceInteraction = (now.getTime() - interaction.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const recencyFactor = Math.max(0, 1 - (daysSinceInteraction / 30)); // Decay over 30 days
      const similarityFactor = userSimilarityScores[interaction.userId] / 
                              Math.max(...Object.values(userSimilarityScores));

      const score = recencyFactor * similarityFactor * 
                   (interaction.behaviorType === UserBehaviorType.LIKE ? 1.5 : 1) * // Weight likes more heavily
                   (interaction.behaviorType === UserBehaviorType.SAVE ? 2 : 1);    // Weight saves even higher

      if (!contentScores[interaction.contentId] || contentScores[interaction.contentId].score < score) {
        contentScores[interaction.contentId] = { 
          score, 
          timestamp: interaction.timestamp 
        };
      }
    });

    // Convert to recommendation items
    const recommendations: RecommendationItem[] = Object.entries(contentScores)
      .map(([contentId, { score, timestamp }]) => ({
        id: contentId,
        contentType,
        score,
        reason: RecommendationReason.FRIENDS_ENGAGED,
        source: RecommendationSource.COLLABORATIVE_FILTERING,
        timestamp,
        metadata: {
          similarUserCount: similarUsers.filter(userId => 
            similarUserContent.some(content => 
              content.userId === userId && content.contentId === contentId
            )
          ).length,
        },
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  } catch (error) {
    console.error('Error generating collaborative recommendations:', error);
    return [];
  }
}

/**
 * Content-based recommendations using AI analysis
 */
export async function generateContentBasedRecommendations(
  userId: string,
  contentType: ContentType = ContentType.POST,
  limit: number = 10
): Promise<RecommendationItem[]> {
  try {
    // Get user's recently engaged content
    const userInteractions = await db.userBehaviorLog.findMany({
      where: {
        userId,
        contentType,
        behaviorType: {
          in: [UserBehaviorType.LIKE, UserBehaviorType.COMMENT, UserBehaviorType.SAVE]
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 20, // Most recent 20 positive interactions
    });

    if (userInteractions.length === 0) {
      return []; // No interaction data to base recommendations on
    }

    // Get content the user has interacted with
    const userContentIds = userInteractions.map(interaction => interaction.contentId);

    // Determine content type table
    let contentTable;
    switch (contentType) {
      case ContentType.POST:
        contentTable = db.post;
        break;
      case ContentType.REEL:
        contentTable = db.reel;
        break;
      case ContentType.GROUP:
        contentTable = db.group;
        break;
      default:
        return []; // Unsupported content type
    }

    // Get the content details
    const userContent = await contentTable.findMany({
      where: {
        id: {
          in: userContentIds,
        },
      },
      include: {
        aiAnalysis: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Use the 10 most recent interacted items
    });

    // Extract topics or relevant features
    const userTopics = new Set<string>();
    const topicWeights: Record<string, number> = {};

    userContent.forEach(content => {
      if (content.aiAnalysis?.topics) {
        const topics = content.aiAnalysis.topics.split(',').map(t => t.trim());
        topics.forEach(topic => {
          userTopics.add(topic);
          topicWeights[topic] = (topicWeights[topic] || 0) + 1;
        });
      }
    });

    if (userTopics.size === 0) {
      return []; // No topics to base recommendations on
    }

    // Find content with similar topics that user hasn't interacted with
    const relevantContent = await contentTable.findMany({
      where: {
        id: {
          notIn: userContentIds,
        },
        aiAnalysis: {
          topics: {
            not: null,
          },
        },
      },
      include: {
        aiAnalysis: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Consider the 100 most recent items
    });

    // Score content based on topic overlap
    const contentScores: Record<string, { 
      score: number, 
      timestamp: Date, 
      matchingTopics: string[] 
    }> = {};

    relevantContent.forEach(content => {
      if (!content.aiAnalysis?.topics) return;
      
      const contentTopics = content.aiAnalysis.topics.split(',').map(t => t.trim());
      const matchingTopics = contentTopics.filter(topic => userTopics.has(topic));
      
      if (matchingTopics.length > 0) {
        // Calculate score based on matching topics and their weights
        const score = matchingTopics.reduce((sum, topic) => sum + (topicWeights[topic] || 0), 0) / 
                    Object.values(topicWeights).reduce((sum, weight) => sum + weight, 0);
        
        contentScores[content.id] = {
          score,
          timestamp: content.createdAt,
          matchingTopics,
        };
      }
    });

    // Convert to recommendation items
    const recommendations: RecommendationItem[] = Object.entries(contentScores)
      .map(([contentId, { score, timestamp, matchingTopics }]) => ({
        id: contentId,
        contentType,
        score,
        reason: RecommendationReason.SIMILAR_CONTENT,
        source: RecommendationSource.CONTENT_BASED,
        timestamp,
        metadata: {
          matchingTopics,
        },
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  } catch (error) {
    console.error('Error generating content-based recommendations:', error);
    return [];
  }
}

/**
 * AI-powered personalized recommendations using Gemini
 */
export async function generateAIPersonalizedRecommendations(
  userId: string,
  contentType: ContentType = ContentType.POST,
  limit: number = 10,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<RecommendationItem[]> {
  try {
    // Get user preferences and behavior data
    const userInterests = await getUserInterestProfile(userId);
    
    // Get recent user activities
    const userActivities = await db.userBehaviorLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 50, // Most recent 50 activities
    });
    
    // Get user's explicitly stated interests
    const userTopics = await db.userInterest.findMany({
      where: {
        userId,
      },
      include: {
        topic: true,
      },
    });
    
    // Prepare user profile for AI analysis
    const userProfile = {
      interests: userTopics.map(t => t.topic.name),
      behaviors: userActivities.map(a => ({
        type: a.behaviorType,
        contentType: a.contentType,
        timestamp: a.timestamp.toISOString(),
      })),
      preferredContentTypes: Object.entries(userInterests.contentTypes)
        .sort(([, a], [, b]) => b - a)
        .map(([type]) => type),
      engagementPatterns: userInterests.engagementPatterns,
    };
    
    // Determine content type table
    let contentTable;
    let contentIncludes = {};
    
    switch (contentType) {
      case ContentType.POST:
        contentTable = db.post;
        contentIncludes = {
          user: true,
          aiAnalysis: true,
          hashtags: {
            include: {
              topic: true,
            },
          },
        };
        break;
      case ContentType.REEL:
        contentTable = db.reel;
        contentIncludes = {
          user: true,
          hashtags: {
            include: {
              topic: true,
            },
          },
        };
        break;
      default:
        return []; // Unsupported content type
    }
    
    // Get recent content for AI recommendation
    const recentContent = await contentTable.findMany({
      where: {
        userId: {
          not: userId, // Exclude user's own content
        },
      },
      include: contentIncludes,
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Consider the 50 most recent items
    });
    
    // Format content for AI analysis
    const formattedContent = recentContent.map(content => {
      let topics: string[] = [];
      let entityData = {};
      
      // Extract topics based on content type
      if (contentType === ContentType.POST && content.aiAnalysis?.topics) {
        topics = content.aiAnalysis.topics.split(',').map(t => t.trim());
        entityData = {
          sentiment: content.aiAnalysis.sentiment,
          entities: content.aiAnalysis.detectedEntities,
        };
      } else if (contentType === ContentType.REEL && content.hashtags) {
        // @ts-ignore - Type safety handled by the switch case
        topics = content.hashtags.map(h => h.topic.name);
      }
      
      return {
        id: content.id,
        type: contentType,
        // @ts-ignore - Safely accessing nested properties
        creator: content.user?.username || content.user?.name || 'Unknown',
        createdAt: content.createdAt.toISOString(),
        topics,
        // @ts-ignore - content.content only exists on Post
        textContent: content.content || content.caption || '',
        ...entityData,
      };
    });
    
    // Skip AI if no content available
    if (formattedContent.length === 0) {
      return [];
    }
    
    // Create AI prompt for personalized recommendations
    const aiPrompt = `
    You are an AI-powered recommendation system. Based on the user profile and available content, 
    recommend the most relevant content items for this user. 
    
    USER PROFILE:
    ${JSON.stringify(userProfile, null, 2)}
    
    AVAILABLE CONTENT:
    ${JSON.stringify(formattedContent, null, 2)}
    
    Generate personalized recommendations by matching content to the user's interests and behavior patterns.
    Explain why each item is recommended.
    
    Return your response as a JSON array with exactly ${limit} recommendations, each containing:
    - id (string): The content ID
    - score (number between 0-1): Relevance score
    - reason (string): One of: "similar_content", "based_on_interests", "based_on_history", "trending_now", "complementary_content", "new_but_relevant"
    - explanation (string): Brief explanation of why this content was recommended
    
    Example format:
    [
      {
        "id": "content123",
        "score": 0.92,
        "reason": "based_on_interests",
        "explanation": "This content discusses AI, which is one of your top interests."
      }
    ]
    `;
    
    // Use Gemini for AI-powered recommendations
    const gemini = getModelInstance(model);
    const response = await gemini.generateContent({
      contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
    });
    
    const aiResult = response.response.text();
    
    // Parse AI response
    const jsonMatch = aiResult.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const recommendationData = JSON.parse(jsonMatch[0]);
    
    // Convert to RecommendationItems
    const recommendations: RecommendationItem[] = recommendationData.map((item: any) => {
      // Map the reason from AI to our enum
      let reason: RecommendationReason;
      switch (item.reason) {
        case 'similar_content':
          reason = RecommendationReason.SIMILAR_CONTENT;
          break;
        case 'based_on_interests':
          reason = RecommendationReason.BASED_ON_INTERESTS;
          break;
        case 'based_on_history':
          reason = RecommendationReason.BASED_ON_HISTORY;
          break;
        case 'trending_now':
          reason = RecommendationReason.TRENDING_NOW;
          break;
        case 'complementary_content':
          reason = RecommendationReason.COMPLEMENTARY_CONTENT;
          break;
        case 'new_but_relevant':
          reason = RecommendationReason.NEW_BUT_RELEVANT;
          break;
        default:
          reason = RecommendationReason.SIMILAR_CONTENT;
      }
      
      return {
        id: item.id,
        contentType,
        score: item.score,
        reason,
        source: RecommendationSource.AI_PERSONALIZED,
        timestamp: new Date(),
        metadata: {
          explanation: item.explanation,
        },
      };
    });
    
    return recommendations;
  } catch (error) {
    console.error('Error generating AI-personalized recommendations:', error);
    return [];
  }
}

/**
 * Get trending content for recommendations
 */
export async function getTrendingRecommendations(
  userId: string,
  contentType: ContentType = ContentType.POST,
  limit: number = 10,
  timeframe: 'day' | 'week' = 'day'
): Promise<RecommendationItem[]> {
  try {
    // Set timeframe
    const startDate = new Date();
    if (timeframe === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    } else {
      startDate.setDate(startDate.getDate() - 7);
    }
    
    // Get content the user has already interacted with
    const userInteractions = await db.userBehaviorLog.findMany({
      where: {
        userId,
        contentType,
      },
      select: {
        contentId: true,
      },
    });
    
    const userContentIds = userInteractions.map(interaction => interaction.contentId);
    
    // Aggregated engagement metrics based on content type
    let trendingContent: Array<{ id: string, score: number, createdAt: Date }> = [];
    
    // Get trending posts
    if (contentType === ContentType.POST) {
      // Aggregate post engagements
      const postEngagements = await db.userBehaviorLog.groupBy({
        by: ['contentId'],
        where: {
          contentType: ContentType.POST,
          contentId: {
            notIn: userContentIds, // Exclude content user has already seen
          },
          timestamp: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit * 2, // Get more than needed to allow for filtering
      });
      
      // Get post details
      const postIds = postEngagements.map(p => p.contentId);
      const posts = await db.post.findMany({
        where: {
          id: {
            in: postIds,
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      });
      
      // Create trending content array
      trendingContent = postEngagements.map(eng => {
        const post = posts.find(p => p.id === eng.contentId);
        return {
          id: eng.contentId,
          score: eng._count.id / 10, // Normalize score between 0-1
          createdAt: post?.createdAt || new Date(),
        };
      });
    }
    // Get trending reels
    else if (contentType === ContentType.REEL) {
      const reels = await db.reel.findMany({
        where: {
          id: {
            notIn: userContentIds,
          },
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: [
          { viewCount: 'desc' },
          { likeCount: 'desc' },
        ],
        select: {
          id: true,
          viewCount: true,
          likeCount: true,
          createdAt: true,
        },
        take: limit * 2,
      });
      
      const maxViews = Math.max(...reels.map(r => r.viewCount));
      const maxLikes = Math.max(...reels.map(r => r.likeCount));
      
      trendingContent = reels.map(reel => ({
        id: reel.id,
        score: ((reel.viewCount / (maxViews || 1)) * 0.6) + 
               ((reel.likeCount / (maxLikes || 1)) * 0.4), // Weighted score
        createdAt: reel.createdAt,
      }));
    }
    // Get trending groups
    else if (contentType === ContentType.GROUP) {
      // For groups, we look at recent activity
      const groupActivity = await db.groupPost.groupBy({
        by: ['groupId'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit * 2,
      });
      
      // Get group details
      const groupIds = groupActivity.map(g => g.groupId);
      const groups = await db.group.findMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      });
      
      trendingContent = groupActivity.map(act => {
        const group = groups.find(g => g.id === act.groupId);
        return {
          id: act.groupId,
          score: Math.min(act._count.id / 20, 1), // Normalize score between 0-1
          createdAt: group?.createdAt || new Date(),
        };
      });
    }
    
    // Convert to recommendation items
    const recommendations: RecommendationItem[] = trendingContent
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(content => ({
        id: content.id,
        contentType,
        score: content.score,
        reason: RecommendationReason.TRENDING_NOW,
        source: RecommendationSource.TRENDING,
        timestamp: content.createdAt,
        metadata: {
          timeframe,
        },
      }));
    
    return recommendations;
  } catch (error) {
    console.error('Error generating trending recommendations:', error);
    return [];
  }
}

/**
 * Get or build user interest profile based on behavior
 */
export async function getUserInterestProfile(userId: string): Promise<UserInterestProfile> {
  try {
    // Check cache first
    const cacheKey = `user-interests:${userId}`;
    const cachedProfile = await db.keyValueStore?.findUnique({
      where: { key: cacheKey },
    });
    
    // Return cached profile if recent (under 24 hours)
    if (cachedProfile?.updatedAt && 
        (new Date().getTime() - cachedProfile.updatedAt.getTime()) < 24 * 60 * 60 * 1000) {
      return JSON.parse(cachedProfile.value);
    }
    
    // Build user interest profile from behavior data
    
    // 1. Get explicit interests
    const userTopics = await db.userInterest.findMany({
      where: { userId },
      include: { topic: true },
      orderBy: { createdAt: 'desc' },
    });
    
    // 2. Get behavior logs
    const userBehaviors = await db.userBehaviorLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 500, // Recent 500 behaviors
    });
    
    // 3. Process explicit topics
    const topics = userTopics.map(interest => ({
      id: interest.topicId,
      name: interest.topic.name,
      weight: 1.0, // Explicit interests start with max weight
      lastEngagement: interest.createdAt,
    }));
    
    // 4. Process content types preferences
    const contentTypeCount: Record<ContentType, number> = {
      [ContentType.POST]: 0,
      [ContentType.REEL]: 0,
      [ContentType.GROUP]: 0,
      [ContentType.EVENT]: 0,
      [ContentType.USER]: 0,
      [ContentType.TOPIC]: 0,
      [ContentType.STORY]: 0,
    };
    
    userBehaviors.forEach(behavior => {
      contentTypeCount[behavior.contentType as ContentType] = 
        (contentTypeCount[behavior.contentType as ContentType] || 0) + 1;
    });
    
    const totalContentCount = Object.values(contentTypeCount).reduce((sum, count) => sum + count, 0);
    
    const contentTypes: Record<ContentType, number> = Object.entries(contentTypeCount)
      .reduce((acc, [type, count]) => {
        acc[type as ContentType] = totalContentCount > 0 ? count / totalContentCount : 0;
        return acc;
      }, {} as Record<ContentType, number>);
    
    // 5. Process engagement patterns
    const behaviorTypeCount: Record<UserBehaviorType, number> = {
      [UserBehaviorType.VIEW]: 0,
      [UserBehaviorType.LIKE]: 0,
      [UserBehaviorType.COMMENT]: 0,
      [UserBehaviorType.SHARE]: 0,
      [UserBehaviorType.SAVE]: 0,
      [UserBehaviorType.CLICK]: 0,
      [UserBehaviorType.FOLLOW]: 0,
      [UserBehaviorType.DWELL_TIME]: 0,
      [UserBehaviorType.SEARCH]: 0,
    };
    
    userBehaviors.forEach(behavior => {
      behaviorTypeCount[behavior.behaviorType as UserBehaviorType] = 
        (behaviorTypeCount[behavior.behaviorType as UserBehaviorType] || 0) + 1;
    });
    
    const totalBehaviorCount = Object.values(behaviorTypeCount).reduce((sum, count) => sum + count, 0);
    
    const engagementPatterns: Record<UserBehaviorType, number> = Object.entries(behaviorTypeCount)
      .reduce((acc, [type, count]) => {
        acc[type as UserBehaviorType] = totalBehaviorCount > 0 ? count / totalBehaviorCount : 0;
        return acc;
      }, {} as Record<UserBehaviorType, number>);
    
    // 6. Process time patterns
    const hourCounts: Record<string, number> = {};
    
    userBehaviors.forEach(behavior => {
      const hour = behavior.timestamp.getHours().toString().padStart(2, '0');
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const totalHourCounts = Object.values(hourCounts).reduce((sum, count) => sum + count, 0);
    
    const timePatterns: Record<string, number> = Object.entries(hourCounts)
      .reduce((acc, [hour, count]) => {
        acc[hour] = totalHourCounts > 0 ? count / totalHourCounts : 0;
        return acc;
      }, {} as Record<string, number>);
    
    // 7. Process creator preferences
    const creatorCounts: Record<string, number> = {};
    
    // Get content creators from user's interactions
    for (const behavior of userBehaviors) {
      // Skip if not relevant for creator analysis
      if (![UserBehaviorType.LIKE, UserBehaviorType.SAVE, UserBehaviorType.FOLLOW]
          .includes(behavior.behaviorType as UserBehaviorType)) {
        continue;
      }
      
      let creatorId: string | null = null;
      
      // Get creator based on content type
      if (behavior.contentType === ContentType.POST) {
        const post = await db.post.findUnique({
          where: { id: behavior.contentId },
          select: { userId: true },
        });
        creatorId = post?.userId || null;
      } else if (behavior.contentType === ContentType.REEL) {
        const reel = await db.reel.findUnique({
          where: { id: behavior.contentId },
          select: { userId: true },
        });
        creatorId = reel?.userId || null;
      } else if (behavior.contentType === ContentType.USER) {
        creatorId = behavior.contentId; // Direct user reference
      }
      
      if (creatorId) {
        creatorCounts[creatorId] = (creatorCounts[creatorId] || 0) + 1;
      }
    }
    
    // Convert to weighted creator list
    const totalCreatorInteractions = Object.values(creatorCounts).reduce((sum, count) => sum + count, 0);
    
    const creators = Object.entries(creatorCounts)
      .map(([id, count]) => ({
        id,
        weight: totalCreatorInteractions > 0 ? count / totalCreatorInteractions : 0,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 50); // Top 50 creators
    
    // 8. Assemble complete profile
    const interestProfile: UserInterestProfile = {
      topics,
      creators,
      contentTypes,
      engagementPatterns,
      timePatterns,
    };
    
    // Cache the profile
    if (db.keyValueStore) {
      await db.keyValueStore.upsert({
        where: { key: cacheKey },
        update: {
          value: JSON.stringify(interestProfile),
          updatedAt: new Date(),
        },
        create: {
          key: cacheKey,
          value: JSON.stringify(interestProfile),
        },
      });
    }
    
    return interestProfile;
  } catch (error) {
    console.error('Error building user interest profile:', error);
    
    // Return default empty profile on error
    return {
      topics: [],
      creators: [],
      contentTypes: {
        [ContentType.POST]: 0.5,
        [ContentType.REEL]: 0.3,
        [ContentType.GROUP]: 0.1,
        [ContentType.EVENT]: 0.05,
        [ContentType.USER]: 0.02,
        [ContentType.TOPIC]: 0.02,
        [ContentType.STORY]: 0.01,
      },
      engagementPatterns: {
        [UserBehaviorType.VIEW]: 0.7,
        [UserBehaviorType.LIKE]: 0.2,
        [UserBehaviorType.COMMENT]: 0.05,
        [UserBehaviorType.SHARE]: 0.02,
        [UserBehaviorType.SAVE]: 0.01,
        [UserBehaviorType.CLICK]: 0.01,
        [UserBehaviorType.FOLLOW]: 0.005,
        [UserBehaviorType.DWELL_TIME]: 0,
        [UserBehaviorType.SEARCH]: 0.005,
      },
      timePatterns: {},
    };
  }
}

/**
 * Log user behavior for personalization
 */
export async function logUserBehavior(
  userId: string,
  behaviorType: UserBehaviorType,
  contentId: string,
  contentType: ContentType,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await db.userBehaviorLog.create({
      data: {
        userId,
        behaviorType,
        contentId,
        contentType,
        timestamp: new Date(),
        metadata,
      },
    });
    
    // If this is a significant behavior, invalidate the interest profile cache
    if ([
      UserBehaviorType.LIKE,
      UserBehaviorType.SAVE,
      UserBehaviorType.FOLLOW,
      UserBehaviorType.SHARE
    ].includes(behaviorType)) {
      const cacheKey = `user-interests:${userId}`;
      await db.keyValueStore?.delete({
        where: { key: cacheKey },
      }).catch(() => {}); // Ignore if doesn't exist
    }
  } catch (error) {
    console.error('Error logging user behavior:', error);
  }
}

/**
 * Generate diversified content feed with multiple recommendation sources
 */
export async function generatePersonalizedFeed(
  userId: string,
  contentType: ContentType = ContentType.POST,
  limit: number = 20
): Promise<RecommendationItem[]> {
  try {
    // Get recommendations from different sources
    const [collaborative, contentBased, trending, aiPersonalized] = await Promise.all([
      generateCollaborativeRecommendations(userId, contentType, limit),
      generateContentBasedRecommendations(userId, contentType, limit),
      getTrendingRecommendations(userId, contentType, limit),
      generateAIPersonalizedRecommendations(userId, contentType, limit),
    ]);
    
    // Allocate slots for each recommendation source
    const totalItems = Math.min(limit, 20);
    
    // Calculate how many items to take from each source
    const aiPersonalizedCount = Math.floor(totalItems * 0.35); // 35% AI personalized
    const collaborativeCount = Math.floor(totalItems * 0.25);  // 25% collaborative
    const contentBasedCount = Math.floor(totalItems * 0.2);    // 20% content-based
    const trendingCount = Math.floor(totalItems * 0.2);        // 20% trending
    
    // Fill any remaining slots from the highest scoring remaining items
    let remainingSlots = totalItems - (
      aiPersonalizedCount + collaborativeCount + contentBasedCount + trendingCount
    );
    
    // Select the top items from each source
    const selectedAI = aiPersonalized.slice(0, aiPersonalizedCount);
    const selectedCollaborative = collaborative.slice(0, collaborativeCount);
    const selectedContentBased = contentBased.slice(0, contentBasedCount);
    const selectedTrending = trending.slice(0, trendingCount);
    
    // Combine all remaining items
    const allRemainingItems = [
      ...aiPersonalized.slice(aiPersonalizedCount),
      ...collaborative.slice(collaborativeCount),
      ...contentBased.slice(contentBasedCount),
      ...trending.slice(trendingCount),
    ];
    
    // Sort by score and select top remaining items
    const selectedRemaining = allRemainingItems
      .sort((a, b) => b.score - a.score)
      .slice(0, remainingSlots);
    
    // Combine all selected items
    const allRecommendations = [
      ...selectedAI,
      ...selectedCollaborative,
      ...selectedContentBased,
      ...selectedTrending,
      ...selectedRemaining,
    ];
    
    // Add some randomness to prevent filter bubbles
    const shuffle = (array: RecommendationItem[]) => {
      // Fisher-Yates shuffle with slight weighting by score
      for (let i = array.length - 1; i > 0; i--) {
        // Add some randomness but still respect scores somewhat
        const scoreA = array[i].score;
        const j = Math.floor(Math.random() * (i + 1) * (1 - scoreA * 0.5));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    // Return shuffled recommendations with diversity
    return shuffle(allRecommendations);
  } catch (error) {
    console.error('Error generating personalized feed:', error);
    return [];
  }
}

/**
 * Find similar users for social recommendations
 */
export async function findSimilarUsers(
  userId: string,
  limit: number = 10
): Promise<RecommendationItem[]> {
  try {
    // Get user's topics and interests
    const userInterests = await db.userInterest.findMany({
      where: { userId },
      select: { topicId: true },
    });
    
    const userTopicIds = userInterests.map(interest => interest.topicId);
    
    if (userTopicIds.length === 0) {
      return [];
    }
    
    // Find users with similar interests
    const similarUsers = await db.userInterest.findMany({
      where: {
        topicId: { in: userTopicIds },
        userId: { not: userId },
      },
      select: {
        userId: true,
        topicId: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });
    
    // Group by user and count matching topics
    const userMatchCounts: Record<string, { 
      count: number, 
      user: any, 
      matchingTopics: Set<string> 
    }> = {};
    
    similarUsers.forEach(interest => {
      if (!userMatchCounts[interest.userId]) {
        userMatchCounts[interest.userId] = { 
          count: 0, 
          user: interest.user, 
          matchingTopics: new Set() 
        };
      }
      
      userMatchCounts[interest.userId].count += 1;
      userMatchCounts[interest.userId].matchingTopics.add(interest.topicId);
    });
    
    // Convert to array and sort by match count
    const recommendedUsers = Object.entries(userMatchCounts)
      .map(([id, { count, user, matchingTopics }]) => ({
        id,
        user,
        matchCount: count,
        matchScore: count / userTopicIds.length,
        matchingTopics: Array.from(matchingTopics),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
    
    // Convert to recommendation items
    return recommendedUsers.map(match => ({
      id: match.id,
      contentType: ContentType.USER,
      score: match.matchScore,
      reason: RecommendationReason.SIMILAR_USERS,
      source: RecommendationSource.INTEREST_BASED,
      timestamp: match.user.createdAt,
      metadata: {
        username: match.user.username,
        name: match.user.name,
        matchingTopicCount: match.matchCount,
        matchingTopics: match.matchingTopics,
      },
    }));
  } catch (error) {
    console.error('Error finding similar users:', error);
    return [];
  }
}

/**
 * Update database schema to support personalization
 * Note: Call this once during setup
 */
export async function setupPersonalizationSchema(): Promise<void> {
  try {
    // This would actually use database migrations in a real system
    console.log('Setting up personalization schema...');
    
    // Since we're using Prisma, we'd update the schema.prisma file and run migrations
    // For this example, we assume the schema already contains the required tables
    
    // Here's what the schema looks like (for reference):
    /*
    model UserBehaviorLog {
      id          String   @id @default(cuid())
      userId      String
      behaviorType String
      contentId   String
      contentType String
      timestamp   DateTime @default(now())
      duration    Int?
      metadata    Json?
      user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
      
      @@index([userId])
      @@index([contentId])
      @@index([contentType])
      @@index([behaviorType])
      @@index([timestamp])
    }
    
    model KeyValueStore {
      key       String   @id
      value     String   @db.Text
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
    }
    
    model UserRecommendation {
      id           String   @id @default(cuid())
      userId       String
      contentId    String
      contentType  String
      score        Float
      reason       String
      source       String
      isViewed     Boolean  @default(false)
      isClicked    Boolean  @default(false)
      createdAt    DateTime @default(now())
      viewedAt     DateTime?
      clickedAt    DateTime?
      metadata     Json?
      user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
      
      @@index([userId])
      @@index([contentId])
      @@index([contentType])
      @@index([source])
      @@index([createdAt])
    }
    */
  } catch (error) {
    console.error('Error setting up personalization schema:', error);
  }
}