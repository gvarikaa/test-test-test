import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../server';
import { TRPCError } from '@trpc/server';
import { MediaType } from '@prisma/client';

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

      try {
        // Get stories from followed users or specific user
        const storiesQuery = {
          where: {
            ...(userId 
              ? { userId }
              : session?.user?.id 
                ? {
                    user: {
                      OR: [
                        // User's own stories
                        { id: session.user.id },
                        // Stories from users they follow
                        {
                          followers: {
                            some: {
                              followerId: session.user.id,
                            },
                          },
                        },
                      ],
                    },
                  }
                : {}),
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
            views: {
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
            },
            _count: {
              select: {
                views: true,
              }
            }
          },
        };

        // Execute the query
        const stories = await db.story.findMany(storiesQuery);

        // Group stories by user
        const storiesByUser = stories.reduce((acc, story) => {
          const userId = story.userId;
          if (!acc[userId]) {
            acc[userId] = {
              user: story.user,
              stories: [],
            };
          }
          
          // Check if story was viewed by current user
          const isViewed = session?.user?.id 
            ? story.views.some(view => view.viewerId === session.user.id)
            : false;
            
          acc[userId].stories.push({
            ...story,
            viewCount: story._count.views,
            isViewed,
          });
          
          return acc;
        }, {} as Record<string, { user: any, stories: any[] }>);

        return Object.values(storiesByUser);
      } catch (error) {
        console.error('Error fetching stories:', error);
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
          views: {
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
          },
        },
      });

      if (!story) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Story not found',
        });
      }

      // Check if expired
      const now = new Date();
      const isExpired = story.expiresAt < now;

      // Check if the story was viewed by the current user
      let isViewed = false;
      if (session?.user) {
        isViewed = story.views.some(view => view.viewerId === session.user.id);
        
        // Mark story as viewed if not already viewed and not expired
        if (!isViewed && !isExpired) {
          try {
            await db.storyView.create({
              data: {
                storyId,
                viewerId: session.user.id,
              },
            });
            
            isViewed = true;
          } catch (error) {
            // Ignore unique constraint violations (already viewed)
            if (!(error instanceof Error && error.message.includes('Unique constraint'))) {
              console.error('Error marking story as viewed:', error);
            }
          }
        }
      }

      return {
        ...story,
        isViewed,
        isExpired,
        viewCount: story.views.length,
      };
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
      
      // Calculate expiration date (default: 24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      try {
        // Create the story
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

        return story;
      } catch (error) {
        console.error('Error creating story:', error);
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
      
      // Check if story exists and is not expired
      const story = await db.story.findUnique({
        where: { id: storyId },
      });
      
      if (!story) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Story not found',
        });
      }
      
      const now = new Date();
      if (story.expiresAt < now) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Story has expired',
        });
      }
      
      // Prevent self-viewing notification
      if (story.userId === session.user.id) {
        return { success: true };
      }

      try {
        // Create view record if it doesn't exist
        await db.storyView.upsert({
          where: {
            storyId_viewerId: {
              storyId,
              viewerId: session.user.id,
            },
          },
          update: {}, // No updates needed, just using upsert to avoid duplicates
          create: {
            storyId,
            viewerId: session.user.id,
          },
        });
        
        return { success: true };
      } catch (error) {
        console.error('Error recording story view:', error);
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
      
      // Check if story exists and belongs to the user
      const story = await db.story.findUnique({
        where: { id: storyId },
      });
      
      if (!story) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Story not found',
        });
      }
      
      if (story.userId !== session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own stories',
        });
      }
      
      try {
        // Delete the story (cascade will delete media and views)
        await db.story.delete({
          where: { id: storyId },
        });
        
        return { success: true };
      } catch (error) {
        console.error('Error deleting story:', error);
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
      
      // Check if story exists and belongs to the user
      const story = await db.story.findUnique({
        where: { id: storyId },
      });
      
      if (!story) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Story not found',
        });
      }
      
      // Only the story creator can view the list of viewers
      if (story.userId !== session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view analytics for your own stories',
        });
      }
      
      try {
        // Get all views with viewer information
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
        
        return views;
      } catch (error) {
        console.error('Error fetching story viewers:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch story viewers',
          cause: error,
        });
      }
    }),
});