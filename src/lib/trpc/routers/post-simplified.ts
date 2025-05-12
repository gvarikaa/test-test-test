import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';

/**
 * Simplified post router with minimal dependencies and no poll references
 * This should help isolate any configuration or database issues
 */
export const postSimplifiedRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        cursor: z.string().nullable().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        console.log("Simplified post.getAll called");
        const limit = input?.limit ?? 10;
        const cursor = input?.cursor;
        const userId = ctx.session?.user?.id;

        // Simplified query with no poll relations and minimal includes
        const posts = await ctx.db.post.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
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

        console.log(`Simplified post.getAll returning ${posts.length} posts`);
        return {
          posts,
          nextCursor,
        };
      } catch (error) {
        console.error("Error in simplified post.getAll:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch posts',
          cause: error,
        });
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        console.log(`Simplified post.getById called for post ${input.id}`);
        
        const post = await ctx.db.post.findUnique({
          where: { id: input.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
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
            message: `No post with id '${input.id}'`,
          });
        }
        
        console.log("Simplified post.getById returning result");
        return post;
      } catch (error) {
        console.error(`Error in simplified post.getById:`, error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch post',
          cause: error,
        });
      }
    }),
});