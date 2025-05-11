import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import {
  ContentType,
  RecommendationSource,
  UserBehaviorType,
  generatePersonalizedFeed,
  logUserBehavior,
  getUserInterestProfile,
  findSimilarUsers,
  generateCollaborativeRecommendations,
  generateContentBasedRecommendations,
  generateAIPersonalizedRecommendations,
  getTrendingRecommendations,
} from '@/lib/personalization';

export const personalizationRouter = router({
  // Log user behavior for personalization
  logBehavior: protectedProcedure
    .input(
      z.object({
        behaviorType: z.enum([
          'view',
          'like',
          'comment',
          'share',
          'save',
          'click',
          'follow',
          'dwell_time',
          'search',
        ]),
        contentId: z.string(),
        contentType: z.enum([
          'post',
          'reel',
          'group',
          'event',
          'user',
          'topic',
          'story',
        ]),
        duration: z.number().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        await logUserBehavior(
          userId,
          input.behaviorType as UserBehaviorType,
          input.contentId,
          input.contentType as ContentType,
          {
            ...input.metadata,
            duration: input.duration,
          }
        );
        
        return { success: true };
      } catch (error) {
        console.error('Error logging behavior:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to log user behavior',
        });
      }
    }),
  
  // Get user interest profile
  getUserInterests: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        const interestProfile = await getUserInterestProfile(userId);
        
        return interestProfile;
      } catch (error) {
        console.error('Error fetching user interests:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user interest profile',
        });
      }
    }),
  
  // Get personalized feed recommendations
  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        contentType: z.enum([
          'post',
          'reel',
          'group',
          'event',
          'user',
          'topic',
          'story',
        ]).default('post'),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        const recommendations = await generatePersonalizedFeed(
          userId,
          input.contentType as ContentType,
          input.limit
        );
        
        // If recommendations are empty, try to get trending content as fallback
        if (recommendations.length === 0) {
          const trending = await getTrendingRecommendations(
            userId,
            input.contentType as ContentType,
            input.limit
          );
          
          return trending;
        }
        
        return recommendations;
      } catch (error) {
        console.error('Error generating personalized feed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate personalized feed',
        });
      }
    }),
  
  // Get recommendations by source
  getRecommendationsBySource: protectedProcedure
    .input(
      z.object({
        contentType: z.enum([
          'post',
          'reel',
          'group',
          'event',
          'user',
          'topic',
          'story',
        ]).default('post'),
        source: z.enum([
          'collaborative_filtering',
          'content_based',
          'trending',
          'social_graph',
          'ai_personalized',
          'interest_based',
          'location_based',
        ]),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        switch (input.source) {
          case 'collaborative_filtering':
            return await generateCollaborativeRecommendations(
              userId,
              input.contentType as ContentType,
              input.limit
            );
          
          case 'content_based':
            return await generateContentBasedRecommendations(
              userId,
              input.contentType as ContentType,
              input.limit
            );
          
          case 'trending':
            return await getTrendingRecommendations(
              userId,
              input.contentType as ContentType,
              input.limit
            );
          
          case 'ai_personalized':
            return await generateAIPersonalizedRecommendations(
              userId,
              input.contentType as ContentType,
              input.limit
            );
          
          case 'interest_based':
            if (input.contentType === 'user') {
              return await findSimilarUsers(userId, input.limit);
            } else {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Interest-based recommendations only available for users',
              });
            }
          
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Unsupported recommendation source',
            });
        }
      } catch (error) {
        console.error('Error getting recommendations by source:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get recommendations',
        });
      }
    }),
  
  // Find similar users
  findSimilarUsers: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        const similarUsers = await findSimilarUsers(userId, input.limit);
        
        return similarUsers;
      } catch (error) {
        console.error('Error finding similar users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find similar users',
        });
      }
    }),
});