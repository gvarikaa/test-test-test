/**
 * This is a fallback router for posts that doesn't rely on AI personalization
 * It should be used as a drop-in replacement when the personalization system is unavailable or over quota
 */

import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Visibility } from '@prisma/client';

export const postFallbackRouter = router({
  // Get all posts without personalization
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        cursor: z.string().nullish(),
        personalized: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Use safe defaults if input is undefined
      const limit = input?.limit ?? 10;
      const cursor = input?.cursor;
      const userId = ctx.session?.user?.id;

      // Basic query for public posts
      const whereClause: any = {
        published: true,
        OR: [
          { visibility: 'PUBLIC' },
        ],
      };

      // Add friend posts if user is logged in
      if (userId) {
        whereClause.OR.push(
          {
            visibility: 'FRIENDS',
            user: {
              friends: {
                some: {
                  friendId: userId,
                  status: 'ACCEPTED',
                },
              },
            },
          },
          { userId } // User's own posts
        );
      }

      // Add cursor-based pagination
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      // Query the database
      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
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
              reactions: true,
              comments: true,
            },
          },
          aiAnalysis: {
            select: {
              id: true,
              sentiment: true,
              topics: true,
            },
          },
        },
      });

      // Handle pagination
      let nextCursor: typeof cursor = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      // Return results without personalization metadata
      return {
        posts,
        nextCursor,
      };
    }),

  // Simplified personalized feed that just returns regular posts
  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.string().nullish(),
        includeReasons: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Just reuse the getAll endpoint since we can't do personalization
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;
      const userId = ctx.session.user.id;

      const whereClause: any = {
        published: true,
        OR: [
          { visibility: 'PUBLIC' },
          {
            visibility: 'FRIENDS',
            user: {
              friends: {
                some: {
                  friendId: userId,
                  status: 'ACCEPTED',
                },
              },
            },
          },
          { userId },
        ],
      };

      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
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
              reactions: true,
              comments: true,
            },
          },
          aiAnalysis: {
            select: {
              id: true,
              sentiment: true,
              topics: true,
              suggestions: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts: posts.map(post => ({
          ...post,
          // Add dummy recommendation data if requested
          ...(input?.includeReasons ? {
            recommendationMetadata: {
              reason: "Recent post from followed topic",
              source: "recency",
              score: 0.9,
            }
          } : {})
        })),
        nextCursor,
      };
    }),
});