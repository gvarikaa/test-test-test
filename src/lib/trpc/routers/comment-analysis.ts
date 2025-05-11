import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../server';
import { 
  analyzeComment, 
  analyzeDiscussion, 
  batchAnalyzeComments,
  analyzeEngagementTrends,
  identifyDiscussionsNeedingModeration,
  analyzeUserDiscussionBehavior,
  DiscussionTone,
  EngagementLevel,
  DiscussionQuality
} from '@/lib/discussion-analysis';
import { db } from '@/lib/db';

export const commentAnalysisRouter = router({
  // Get analysis for a single comment
  getCommentAnalysis: protectedProcedure
    .input(z.object({
      commentId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { commentId } = input;
      
      // Check if we already have the analysis
      const existingAnalysis = await db.commentAnalysis.findUnique({
        where: { commentId },
      });
      
      if (existingAnalysis) {
        return existingAnalysis.data;
      }
      
      // If not, fetch the comment and analyze it
      const comment = await db.comment.findUnique({
        where: { id: commentId },
        include: {
          post: true,
        },
      });
      
      if (!comment) {
        throw new Error('Comment not found');
      }
      
      // Analyze the comment
      const analysis = await analyzeComment(
        commentId,
        comment.content,
        {
          parentContent: comment.post?.content,
          includeEntities: true,
        }
      );
      
      return analysis;
    }),
  
  // Analyze a comment
  analyzeComment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
      content: z.string(),
      parentContent: z.string().optional(),
      includeToxicity: z.boolean().optional(),
      includeEntities: z.boolean().optional(),
      includeTopics: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { 
        commentId, 
        content, 
        parentContent,
        includeToxicity,
        includeEntities,
        includeTopics
      } = input;
      
      const analysis = await analyzeComment(
        commentId,
        content,
        {
          parentContent,
          includeToxicity,
          includeEntities,
          includeTopics,
        }
      );
      
      return analysis;
    }),
  
  // Batch analyze multiple comments
  batchAnalyzeComments: protectedProcedure
    .input(z.object({
      comments: z.array(
        z.object({
          id: z.string(),
          content: z.string(),
        })
      ),
      parentContent: z.string().optional(),
      includeToxicity: z.boolean().optional(),
      includeEntities: z.boolean().optional(),
      includeTopics: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { 
        comments, 
        parentContent,
        includeToxicity,
        includeEntities,
        includeTopics
      } = input;
      
      const analyses = await batchAnalyzeComments(
        comments,
        parentContent,
        {
          includeToxicity,
          includeEntities,
          includeTopics,
        }
      );
      
      return analyses;
    }),
  
  // Analyze a discussion thread (post + comments)
  analyzeDiscussion: protectedProcedure
    .input(z.object({
      discussionId: z.string(),
      postId: z.string(),
      includeSummary: z.boolean().optional(),
      includeTimeline: z.boolean().optional(),
      includeRecommendedActions: z.boolean().optional(),
      includeLanguageDistribution: z.boolean().optional(),
      includeMostDiscussedEntities: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { 
        discussionId, 
        postId,
        includeSummary,
        includeTimeline,
        includeRecommendedActions,
        includeLanguageDistribution,
        includeMostDiscussedEntities,
      } = input;
      
      // Fetch the post and its comments
      const post = await db.post.findUnique({
        where: { id: postId },
      });
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      const comments = await db.comment.findMany({
        where: { postId },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
      
      // Format the comments for analysis
      const formattedComments = comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        userId: comment.userId,
        createdAt: comment.createdAt,
      }));
      
      // Analyze the discussion
      const analysis = await analyzeDiscussion(
        discussionId,
        formattedComments,
        post.content,
        {
          includeSummary,
          includeTimeline,
          includeRecommendedActions,
          includeLanguageDistribution,
          includeMostDiscussedEntities,
        }
      );
      
      return analysis;
    }),
  
  // Get discussion engagement trends over time
  getEngagementTrends: protectedProcedure
    .input(z.object({
      contentId: z.string(),
      timeframe: z.enum(['hourly', 'daily', 'weekly']).optional(),
    }))
    .query(async ({ input }) => {
      const { contentId, timeframe } = input;
      
      // Determine if this is a post or reel
      const post = await db.post.findUnique({
        where: { id: contentId },
      });
      
      if (!post) {
        throw new Error('Content not found');
      }
      
      // Fetch the comments
      const comments = await db.comment.findMany({
        where: { postId: contentId },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
      
      // Format the comments for analysis
      const formattedComments = comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        userId: comment.userId,
        createdAt: comment.createdAt,
        discussionId: contentId,
      }));
      
      // Analyze engagement trends
      const trends = await analyzeEngagementTrends(
        contentId,
        formattedComments,
        timeframe || 'daily'
      );
      
      return trends;
    }),
  
  // Get discussions that may need moderation
  getDiscussionsNeedingModeration: protectedProcedure
    .input(z.object({
      threshold: z.number().min(0).max(1).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { threshold } = input;
      
      // Ensure user has appropriate permissions
      const user = await db.user.findUnique({
        where: { id: ctx.session.user.id },
      });
      
      if (!user || !['admin', 'moderator'].includes(user.role || '')) {
        throw new Error('Insufficient permissions');
      }
      
      // Fetch recent discussion analyses
      const recentAnalyses = await db.discussionAnalysis.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
      
      // Format analyses
      const formattedAnalyses = recentAnalyses.map(analysis => 
        analysis.data as any
      );
      
      // Identify discussions needing moderation
      const needingModeration = await identifyDiscussionsNeedingModeration(
        formattedAnalyses,
        { threshold }
      );
      
      return needingModeration;
    }),
  
  // Analyze a user's behavior in discussions
  analyzeUserBehavior: protectedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { userId } = input;
      
      // Ensure proper permissions (self or admin)
      if (ctx.session.user.id !== userId) {
        const user = await db.user.findUnique({
          where: { id: ctx.session.user.id },
        });
        
        if (!user || !['admin', 'moderator'].includes(user.role || '')) {
          throw new Error('Insufficient permissions');
        }
      }
      
      // Fetch the user's recent comments
      const comments = await db.comment.findMany({
        where: { userId },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
      
      // Format the comments for analysis
      const formattedComments = comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        discussionId: comment.postId,
        createdAt: comment.createdAt,
      }));
      
      // Analyze user behavior
      const behavior = await analyzeUserDiscussionBehavior(
        userId,
        formattedComments
      );
      
      return behavior;
    }),
    
  // Get discussion analysis statistics
  getDiscussionStats: publicProcedure
    .input(z.object({
      timeframe: z.enum(['day', 'week', 'month', 'year']).optional(),
    }))
    .query(async ({ input }) => {
      const { timeframe = 'week' } = input;
      
      // Calculate the date range based on timeframe
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
      
      // Get discussions in the timeframe
      const discussions = await db.discussionAnalysis.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      });
      
      if (discussions.length === 0) {
        return {
          totalDiscussions: 0,
          totalComments: 0,
          averageSentiment: 0,
          toneDistribution: {},
          topTopics: [],
        };
      }
      
      // Extract data from discussions
      const discussionsData = discussions.map(d => d.data as any);
      
      // Calculate statistics
      const totalDiscussions = discussions.length;
      const totalComments = discussionsData.reduce((sum, d) => sum + d.commentCount, 0);
      
      // Calculate average sentiment
      const sentimentSum = discussionsData.reduce((sum, d) => {
        const positive = d.sentimentBreakdown?.positive || 0;
        const negative = d.sentimentBreakdown?.negative || 0;
        const neutral = d.sentimentBreakdown?.neutral || 0;
        
        // Calculate a weighted sentiment score (-1 to 1)
        return sum + (positive * 1 + neutral * 0 + negative * -1) / 100;
      }, 0);
      
      const averageSentiment = sentimentSum / totalDiscussions;
      
      // Get tone distribution
      const toneDistribution: Record<string, number> = {};
      discussionsData.forEach(d => {
        const tone = d.overallTone || DiscussionTone.NEUTRAL;
        toneDistribution[tone] = (toneDistribution[tone] || 0) + 1;
      });
      
      // Convert to percentages
      Object.keys(toneDistribution).forEach(key => {
        toneDistribution[key] = Math.round((toneDistribution[key] / totalDiscussions) * 100);
      });
      
      // Get top topics
      const topicsMap: Record<string, number> = {};
      discussionsData.forEach(d => {
        if (Array.isArray(d.topTopics)) {
          d.topTopics.forEach((topic: string) => {
            topicsMap[topic] = (topicsMap[topic] || 0) + 1;
          });
        }
      });
      
      const topTopics = Object.entries(topicsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({
          topic,
          count,
          percentage: Math.round((count / totalDiscussions) * 100),
        }));
      
      return {
        totalDiscussions,
        totalComments,
        averageSentiment,
        toneDistribution,
        topTopics,
      };
    }),
});