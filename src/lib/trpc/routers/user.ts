import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          coverImage: true,
          createdAt: true,
          location: true,
          website: true,
          occupation: true,
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          coverImage: true,
          createdAt: true,
          location: true,
          website: true,
          occupation: true,
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        coverImage: true,
        createdAt: true,
        location: true,
        website: true,
        occupation: true,
        theme: true,
        language: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        bio: z.string().max(500).optional(),
        image: z.string().url().optional(),
        coverImage: z.string().url().optional(),
        location: z.string().max(100).optional(),
        website: z.string().url().optional().nullable(),
        occupation: z.string().max(100).optional(),
        theme: z.string().optional(),
        language: z.string().optional(),
        phoneNumber: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });

      return user;
    }),

  follow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id === input.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot follow yourself',
        });
      }

      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const existingFollow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.session.user.id,
            followingId: input.userId,
          },
        },
      });

      if (existingFollow) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already following this user',
        });
      }

      await ctx.db.follow.create({
        data: {
          followerId: ctx.session.user.id,
          followingId: input.userId,
        },
      });

      // Create notification
      await ctx.db.notification.create({
        data: {
          type: 'FOLLOW',
          recipientId: input.userId,
          senderId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingFollow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.session.user.id,
            followingId: input.userId,
          },
        },
      });

      if (!existingFollow) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are not following this user',
        });
      }

      await ctx.db.follow.delete({
        where: {
          followerId_followingId: {
            followerId: ctx.session.user.id,
            followingId: input.userId,
          },
        },
      });

      return { success: true };
    }),

  getFollowers: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const followers = await ctx.db.follow.findMany({
        where: {
          followingId: input.userId,
        },
        select: {
          follower: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return followers.map((follow) => follow.follower);
    }),

  getFollowing: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const following = await ctx.db.follow.findMany({
        where: {
          followerId: input.userId,
        },
        select: {
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return following.map((follow) => follow.following);
    }),
});