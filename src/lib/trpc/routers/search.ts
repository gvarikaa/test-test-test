import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';

export const searchRouter = router({
  // გლობალური ძიების პროცედურა, რომელიც მოძებნის მომხმარებლებს, პოსტებს და ჰეშთეგებს
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(10),
        includeUsers: z.boolean().default(true),
        includePosts: z.boolean().default(true),
        includeHashtags: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit, includeUsers, includePosts, includeHashtags } = input;

      // ძიების შედეგების საწყისი მდგომარეობა
      const results: {
        users: any[];
        posts: any[];
        hashtags: any[];
      } = {
        users: [],
        posts: [],
        hashtags: [],
      };

      try {
        // ძიება მომხმარებლებში
        if (includeUsers) {
          const users = await ctx.db.user.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
            },
            take: limit,
          });
          results.users = users;
        }

        // ძიება პოსტებში
        if (includePosts) {
          const posts = await ctx.db.post.findMany({
            where: {
              OR: [
                { content: { contains: query, mode: 'insensitive' } },
                { 
                  hashtags: {
                    some: {
                      topic: {
                        name: { contains: query, mode: 'insensitive' },
                      },
                    },
                  },
                },
              ],
              published: true,
              visibility: 'PUBLIC',
            },
            select: {
              id: true,
              content: true,
              createdAt: true,
              media: {
                select: {
                  id: true,
                  url: true,
                  type: true,
                },
              },
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
            take: limit,
            orderBy: {
              createdAt: 'desc',
            },
          });
          results.posts = posts;
        }

        // ძიება ჰეშთეგებში
        if (includeHashtags) {
          const hashtags = await ctx.db.topic.findMany({
            where: {
              name: { contains: query, mode: 'insensitive' },
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  postHashtags: true,
                },
              },
            },
            take: limit,
          });
          results.hashtags = hashtags;
        }

        return results;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ძიებისას მოხდა შეცდომა',
          cause: error,
        });
      }
    }),

  // მომხმარებლების ძიება
  users: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;

      try {
        const users = await ctx.db.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
          take: limit,
        });

        return users;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'მომხმარებლების ძიებისას მოხდა შეცდომა',
          cause: error,
        });
      }
    }),

  // პოსტების ძიება
  posts: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;

      try {
        const posts = await ctx.db.post.findMany({
          where: {
            OR: [
              { content: { contains: query, mode: 'insensitive' } },
              { 
                hashtags: {
                  some: {
                    topic: {
                      name: { contains: query, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
            published: true,
            visibility: 'PUBLIC',
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        });

        return posts;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'პოსტების ძიებისას მოხდა შეცდომა',
          cause: error,
        });
      }
    }),

  // სწრაფი ძიება (autocompletion-ისთვის)
  quickSearch: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;

      try {
        // მოძებნე ყველაზე პოპულარული შედეგები სწრაფად
        const users = await ctx.db.user.findMany({
          where: {
            OR: [
              { name: { startsWith: query, mode: 'insensitive' } },
              { username: { startsWith: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
          take: limit,
        });

        const hashtags = await ctx.db.topic.findMany({
          where: {
            name: { startsWith: query, mode: 'insensitive' },
          },
          select: {
            id: true,
            name: true,
          },
          take: limit,
        });

        return {
          users,
          hashtags,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'სწრაფი ძიებისას მოხდა შეცდომა',
          cause: error,
        });
      }
    }),
});