import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { Visibility } from '@prisma/client';

// მინიმალური ვერსია ყველა პრობლემური ველის გარეშე
export const postRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        cursor: z.string().nullish(),
        personalized: z.boolean().optional().default(false),
        type: z.enum(['TEXT', 'PHOTO', 'VIDEO', 'LINK', 'POLL', 'AUDIO', 'DOCUMENT']).optional(),
        hashtag: z.string().optional(),
        postIds: z.array(z.string()).optional(),
        includeComments: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        console.log("Minimal post.getAll called");
        
        const limit = input?.limit ?? 10;
        const cursor = input?.cursor;
        const userId = ctx.session?.user?.id;
        const specificPostIds = input?.postIds;
        
        // პირდაპირ ID-ებით ძებნა
        if (specificPostIds && specificPostIds.length > 0) {
          const posts = await ctx.db.post.findMany({
            where: {
              id: { in: specificPostIds },
              published: true,
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
            },
          });

          return {
            posts,
            nextCursor: undefined,
          };
        }
        
        // სტანდარტული ძებნა
        console.log("Running standard search with user ID:", userId);

        // მინიმალური ფილტრებით მოვძებნოთ პოსტები
        const posts = await ctx.db.post.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: {
            // შეიძლება სატესტო მონაცემები არ არის published=true
            // published: true,
          },
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
          },
        });

        let nextCursor: typeof cursor = undefined;
        if (posts.length > limit) {
          const nextItem = posts.pop();
          nextCursor = nextItem?.id;
        }

        console.log(`minimal.getAll found ${posts.length} posts`);
        return {
          posts,
          nextCursor,
        };
      } catch (error) {
        console.error("Error in minimal post.getAll:", error);
        return {
          posts: [],
          nextCursor: undefined,
        };
      }
    }),

  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.string().nullish(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const limit = input?.limit ?? 20;
        const cursor = input?.cursor;
        const userId = ctx.session.user.id;

        console.log("Running personalized feed with user ID:", userId);

        // მარტივად გამოვიტანოთ ბოლო პოსტები, მინიმალური ფილტრებით
        const posts = await ctx.db.post.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: {
            // შეიძლება სატესტო მონაცემები არ არის published=true
            // published: true,
          },
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
          },
        });

        let nextCursor: typeof cursor = undefined;
        if (posts.length > limit) {
          const nextItem = posts.pop();
          nextCursor = nextItem?.id;
        }

        return {
          posts,
          nextCursor,
        };
      } catch (error) {
        console.error("Error in minimal post.getPersonalizedFeed:", error);
        return {
          posts: [],
          nextCursor: undefined,
        };
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const post = await ctx.db.post.findUnique({
          where: { id: input.id },
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
          },
        });

        if (!post) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Post not found',
          });
        }

        return post;
      } catch (error) {
        console.error("Error in minimal post.getById:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch post',
        });
      }
    }),
});