import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { Visibility } from '@prisma/client';

// Simple file-level memory cache for frequently accessed posts to improve performance
type CacheEntry<T> = { data: T; expiresAt: number };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const postCache = new Map<string, CacheEntry<any>>();

// Helper to handle cache operations
const cache = {
  get: <T>(key: string): T | null => {
    const entry = postCache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (entry.expiresAt < Date.now()) {
      postCache.delete(key);
      return null;
    }

    return entry.data as T;
  },

  set: <T>(key: string, data: T, ttl: number = CACHE_TTL): void => {
    // Don't cache null or undefined values
    if (data === null || data === undefined) return;

    const expiresAt = Date.now() + ttl;
    postCache.set(key, { data, expiresAt });

    // Prevent cache from growing too large (max 1000 entries)
    if (postCache.size > 1000) {
      // Delete oldest entry (or expired entries)
      const oldestKey = [...postCache.entries()]
        .filter(([key, entry]) => entry.expiresAt < Date.now())
        .sort(([keyA, a], [keyB, b]) => a.expiresAt - b.expiresAt)[0]?.[0];

      if (oldestKey) {
        postCache.delete(oldestKey);
      }
    }
  },

  invalidate: (key: string): void => {
    postCache.delete(key);
  }
};

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
        // New options for performance optimizations
        minimalData: z.boolean().optional().default(false), // Return minimal data to improve performance
        excludeMedia: z.boolean().optional().default(false), // Don't include media to improve performance
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

        // მინიმალური ფილტრებით მოვძებნოთ პოსტები, მაგრამ დავამატოთ მოქნილი ფილტრაცია
        // Define dynamic include based on optimization options
        const includeOptions = {
          user: {
            select: input?.minimalData ? {
              id: true,
              name: true,
              image: true,
            } : {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          // Only include media if not excluded
          ...(!input?.excludeMedia ? { media: true } : {}),
          // Count is lightweight so include it by default
          _count: {
            select: {
              reactions: true,
              comments: true,
              ...(input?.includeComments ? { comments: true } : {}),
            },
          },
        };

        // Define dynamic where conditions
        const whereConditions = {
          OR: [
            // რეალური, გამოქვეყნებული პოსტები
            { published: true },
            // სატესტო მონაცემებისთვის დამატებითი პირობები
            { content: { not: null, not: "" } },
            // პოსტები მედიით (if we're not excluding media)
            ...(!input?.excludeMedia ? [{ media: { some: {} } }] : []),
          ],
          // Add type filter if specified
          ...(input?.type ? { type: input.type } : {}),
        };

        // Perform query with optimized options
        const posts = await ctx.db.post.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: whereConditions,
          orderBy: {
            createdAt: 'desc',
          },
          include: includeOptions,
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

        // Define dynamic include based on personalization needs - more data for personalized feeds
        const includeOptions = {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              ...(userId ? { interests: true } : {}), // Include interests if we have a userId
            },
          },
          media: true, // Always include media for personalized feed
          _count: {
            select: {
              reactions: true,
              comments: true,
            },
          },
          // No categories relation in Post model
          // ...(userId ? { categories: { select: { id: true, name: true } } } : {}),
        };

        // Define dynamic where conditions - more targeted for personalized feeds
        const whereConditions = {
          OR: [
            // რეალური, გამოქვეყნებული პოსტები
            { published: true },
            // სატესტო მონაცემებისთვის დამატებითი პირობები
            { content: { not: null, not: "" } },
            // პოსტები მედიით
            { media: { some: {} } },
          ],
          // If user has interests, we could add more targeting later here
        };

        // For personalized feeds, optimize ordering with relevance scores
        const orderByOptions = userId
          ? [
              // This is where we'd add custom scoring in a more advanced implementation
              { createdAt: 'desc' }, // For now, still use recency
            ]
          : { createdAt: 'desc' };

        // მარტივად გამოვიტანოთ ბოლო პოსტები, დამატებული ფილტრებით
        const posts = await ctx.db.post.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: whereConditions,
          orderBy: orderByOptions,
          include: includeOptions,
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
        const cacheKey = `post-${input.id}`;

        // Check cache first
        const cachedPost = cache.get(cacheKey);
        if (cachedPost) {
          console.log(`Cache hit for post ${input.id}`);

          // Even for cached posts, try to record view analytics asynchronously
          if (ctx.session?.user?.id) {
            // Use a fire-and-forget pattern to avoid delaying the response
            ctx.db.postView.create({
              data: {
                userId: ctx.session.user.id,
                postId: input.id,
                timestamp: new Date(),
                source: 'post_page_cached',
              },
            }).catch(e => console.warn("Failed to record cached post view:", e));
          }

          return cachedPost;
        }

        // Get the post with additional error handling
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
            // No categories relation in Post model
            // categories: {
            //   select: {
            //     id: true,
            //     name: true,
            //   }
            // },
            _count: {
              select: {
                reactions: true,
                comments: true,
                views: true,
              },
            },
          },
        });

        // Add analytics event for post view
        try {
          if (post && ctx.session?.user?.id) {
            await ctx.db.postView.create({
              data: {
                userId: ctx.session.user.id,
                postId: post.id,
                timestamp: new Date(),
                source: 'post_page',
              },
            });
          }
        } catch (analyticError) {
          // Don't fail the request if analytics fails
          console.error("Failed to record post view analytics:", analyticError);
        }

        if (!post) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Post not found',
          });
        }

        // Cache the post for future requests
        cache.set(cacheKey, post);

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