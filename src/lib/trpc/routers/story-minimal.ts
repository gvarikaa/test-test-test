import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../server';
import { TRPCError } from '@trpc/server';
import { MediaType } from '@prisma/client';

/**
 * Minimal version of the story router with simplified queries
 * to avoid database schema issues
 */
export const storyRouter = router({
  getStories: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        includeExpired: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const now = new Date();
      const { userId, includeExpired = false } = input || {};

      console.log(`[Story-Minimal] Getting stories for userId: ${userId || 'all'}, includeExpired: ${includeExpired}`);

      try {
        // Simplified query that avoids complex relationships
        const storiesQuery = {
          where: {
            ...(userId ? { userId } : {}),
            // Only include non-expired stories unless includeExpired is true
            ...(includeExpired ? {} : { expiresAt: { gt: now } }),
          },
          orderBy: [
            { createdAt: 'desc' },
          ],
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            media: true,
            // Simplified views - just count them instead of including details
            _count: {
              select: {
                views: true,
              }
            }
          },
        };

        // Execute the simplified query
        const stories = await db.story.findMany(storiesQuery);
        console.log(`[Story-Minimal] Found ${stories.length} stories`);

        // Group stories by user with minimal processing
        const storiesByUser = stories.reduce((acc, story) => {
          const userId = story.userId;
          if (!acc[userId]) {
            acc[userId] = {
              user: story.user,
              stories: [],
            };
          }
          
          // Simplified view status - don't check if viewed by current user
          const isViewed = false; // Default to not viewed to avoid complex query
            
          acc[userId].stories.push({
            ...story,
            viewCount: story._count.views,
            isViewed, // Simplified - assume not viewed
          });
          
          return acc;
        }, {} as Record<string, { user: any, stories: any[] }>);

        return Object.values(storiesByUser);
      } catch (error) {
        console.error('[Story-Minimal] Error fetching stories:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch stories',
          cause: error,
        });
      }
    }),

  getStoryById: publicProcedure
    .input(z.object({ storyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { storyId } = input;
      const { db, session } = ctx;
      console.log(`[Story-Minimal] Getting story by ID: ${storyId}`);

      try {
        // Simplified query for a single story
        const story = await db.story.findUnique({
          where: { id: storyId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            media: true,
            _count: {
              select: {
                views: true,
              }
            }
          },
        });

        if (!story) {
          console.error(`[Story-Minimal] Story not found: ${storyId}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Story not found',
          });
        }

        // Check if expired
        const now = new Date();
        const isExpired = story.expiresAt < now;

        // Simplified view logic - don't mark as viewed to avoid extra DB operations
        console.log(`[Story-Minimal] Retrieved story ${storyId}, expired: ${isExpired}`);

        return {
          ...story,
          isViewed: false, // Simplified - assume not viewed
          isExpired,
          viewCount: story._count.views,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('[Story-Minimal] Error fetching story by ID:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch story',
          cause: error,
        });
      }
    }),

  createStory: protectedProcedure
    .input(
      z.object({
        media: z.array(
          z.object({
            url: z.string(),
            type: z.nativeEnum(MediaType),
            width: z.number().optional(),
            height: z.number().optional(),
            duration: z.number().optional(),
            thumbnailUrl: z.string().optional(),
          })
        ),
        expiresInHours: z.number().min(1).max(48).default(24),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { media, expiresInHours } = input;
      console.log(`[Story-Minimal] Creating story with ${media.length} media items, expires in ${expiresInHours} hours`);
      
      // Calculate expiration date (default: 24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      try {
        // Create the story with minimal fields
        const story = await db.story.create({
          data: {
            expiresAt,
            user: {
              connect: {
                id: session.user.id,
              },
            },
            media: {
              create: media.map(m => ({
                url: m.url,
                type: m.type,
                width: m.width,
                height: m.height,
                duration: m.duration,
                thumbnailUrl: m.thumbnailUrl,
              })),
            },
          },
          include: {
            media: true,
          },
        });

        console.log(`[Story-Minimal] Created story ${story.id}`);
        return story;
      } catch (error) {
        console.error('[Story-Minimal] Error creating story:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create story',
          cause: error,
        });
      }
    }),

  viewStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { storyId } = input;
      const { db, session } = ctx;
      console.log(`[Story-Minimal] Marking story as viewed: ${storyId}`);
      
      try {
        // Check if story exists and is not expired
        const story = await db.story.findUnique({
          where: { id: storyId },
        });
        
        if (!story) {
          console.error(`[Story-Minimal] Story not found for view: ${storyId}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Story not found',
          });
        }
        
        const now = new Date();
        if (story.expiresAt < now) {
          console.error(`[Story-Minimal] Story expired for view: ${storyId}`);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Story has expired',
          });
        }
        
        // Prevent self-viewing notification
        if (story.userId === session.user.id) {
          return { success: true };
        }

        // Simplified view creation with error handling
        try {
          // Create a view record but ignore unique constraint errors
          await db.storyView.create({
            data: {
              storyId,
              viewerId: session.user.id,
            },
          });
          console.log(`[Story-Minimal] Successfully marked story ${storyId} as viewed`);
        } catch (viewError) {
          // Log the error but don't fail the operation
          console.log(`[Story-Minimal] Error marking story as viewed (may be already viewed): ${viewError}`);
        }
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('[Story-Minimal] Error recording story view:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record story view',
          cause: error,
        });
      }
    }),

  deleteStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { storyId } = input;
      const { db, session } = ctx;
      console.log(`[Story-Minimal] Deleting story: ${storyId}`);
      
      try {
        // Check if story exists and belongs to the user
        const story = await db.story.findUnique({
          where: { id: storyId },
        });
        
        if (!story) {
          console.error(`[Story-Minimal] Story not found for deletion: ${storyId}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Story not found',
          });
        }
        
        if (story.userId !== session.user.id) {
          console.error(`[Story-Minimal] Unauthorized deletion attempt for story: ${storyId}`);
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete your own stories',
          });
        }
        
        // Delete the story (cascade will delete media and views)
        await db.story.delete({
          where: { id: storyId },
        });
        
        console.log(`[Story-Minimal] Successfully deleted story: ${storyId}`);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('[Story-Minimal] Error deleting story:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete story',
          cause: error,
        });
      }
    }),
    
  getViewers: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { storyId } = input;
      const { db, session } = ctx;
      console.log(`[Story-Minimal] Getting viewers for story: ${storyId}`);
      
      try {
        // Check if story exists and belongs to the user
        const story = await db.story.findUnique({
          where: { id: storyId },
        });
        
        if (!story) {
          console.error(`[Story-Minimal] Story not found for viewers: ${storyId}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Story not found',
          });
        }
        
        // Only the story creator can view the list of viewers
        if (story.userId !== session.user.id) {
          console.error(`[Story-Minimal] Unauthorized viewers request for story: ${storyId}`);
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view analytics for your own stories',
          });
        }
        
        // Simplified viewer query with fewer relations
        const views = await db.storyView.findMany({
          where: { storyId },
          orderBy: { createdAt: 'desc' },
          include: {
            viewer: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        });
        
        console.log(`[Story-Minimal] Found ${views.length} viewers for story: ${storyId}`);
        return views;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('[Story-Minimal] Error fetching story viewers:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch story viewers',
          cause: error,
        });
      }
    }),
});