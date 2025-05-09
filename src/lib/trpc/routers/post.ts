import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { Visibility } from '@prisma/client';

export const postRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const userId = ctx.session?.user?.id;

      // Build the where clause
      const whereClause: {
        published: boolean;
        OR: Array<object>;
        id?: { lt: string };
      } = {
        published: true,
        OR: [
          { visibility: 'PUBLIC' },
          userId ? {
            visibility: 'FRIENDS',
            user: {
              friends: {
                some: {
                  friendId: userId,
                  status: 'ACCEPTED',
                },
              },
            },
          } : {},
          userId ? { userId } : {},
        ],
      };

      // If a cursor is provided, only fetch posts created after the cursor
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
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
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

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
          comments: {
            where: {
              parentId: null,
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
              _count: {
                select: {
                  reactions: true,
                  replies: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          reactions: userId ? {
            where: {
              userId,
            },
            select: {
              type: true,
            },
            take: 1,
          } : undefined,
          _count: {
            select: {
              reactions: true,
              comments: true,
              savedBy: true,
            },
          },
          aiAnalysis: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // Check visibility permissions
      if (post.visibility !== Visibility.PUBLIC) {
        if (!userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this post',
          });
        }

        if (post.visibility === Visibility.PRIVATE && post.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this post',
          });
        }

        if (post.visibility === Visibility.FRIENDS && post.userId !== userId) {
          // Check if the user is a friend
          const friendship = await ctx.db.friendship.findFirst({
            where: {
              OR: [
                {
                  userId: post.userId,
                  friendId: userId,
                  status: 'ACCEPTED',
                },
                {
                  userId: userId,
                  friendId: post.userId,
                  status: 'ACCEPTED',
                },
              ],
            },
          });

          if (!friendship) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to view this post',
            });
          }
        }
      }

      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(5000),
        visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).default('PUBLIC'),
        mediaUrls: z.array(
          z.object({
            url: z.string().url(),
            type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']),
            thumbnailUrl: z.string().url().optional(),
          })
        ).optional(),
        hashtags: z.array(z.string()).optional(),
        runAiAnalysis: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { content, visibility, mediaUrls, hashtags, runAiAnalysis } = input;

      const post = await ctx.db.post.create({
        data: {
          content,
          visibility,
          userId: ctx.session.user.id,
          media: mediaUrls ? {
            createMany: {
              data: mediaUrls.map(({ url, type, thumbnailUrl }) => ({
                url,
                type,
                thumbnailUrl,
              })),
            },
          } : undefined,
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
        },
      });

      // Handle hashtags
      if (hashtags && hashtags.length > 0) {
        // Process each hashtag
        for (const tag of hashtags) {
          // Find or create the topic
          const topic = await ctx.db.topic.upsert({
            where: { name: tag.toLowerCase() },
            update: {},
            create: { name: tag.toLowerCase() },
          });

          // Link the topic to the post
          await ctx.db.postHashtag.create({
            data: {
              postId: post.id,
              topicId: topic.id,
            },
          });
        }
      }

      // Perform AI analysis if requested
      if (runAiAnalysis) {
        // For now, create an empty AI analysis record
        // The actual analysis will be implemented with Gemini later
        await ctx.db.aIAnalysis.create({
          data: {
            postId: post.id,
            sentiment: 'PENDING',
            modelVersion: 'PENDING',
          },
        });
      }

      return post;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1).max(5000).optional(),
        visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const post = await ctx.db.post.findUnique({
        where: { id },
        select: {
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      if (post.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not allowed to update this post',
        });
      }

      return await ctx.db.post.update({
        where: { id },
        data,
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
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        select: {
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      if (post.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not allowed to delete this post',
        });
      }

      await ctx.db.post.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  react: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        type: z.enum(['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, type } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // Check if the user already reacted to this post
      const existingReaction = await ctx.db.reaction.findUnique({
        where: {
          userId_postId_commentId: {
            userId: ctx.session.user.id,
            postId,
            commentId: null,
          },
        },
      });

      if (existingReaction) {
        // Update existing reaction if the type is different
        if (existingReaction.type !== type) {
          await ctx.db.reaction.update({
            where: { id: existingReaction.id },
            data: { type },
          });
        }
      } else {
        // Create new reaction
        await ctx.db.reaction.create({
          data: {
            type,
            userId: ctx.session.user.id,
            postId,
          },
        });

        // Create notification if the reaction is not from the post author
        if (post.userId !== ctx.session.user.id) {
          await ctx.db.notification.create({
            data: {
              type: 'LIKE',
              recipientId: post.userId,
              senderId: ctx.session.user.id,
              postId,
            },
          });
        }
      }

      return { success: true };
    }),

  removeReaction: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const existingReaction = await ctx.db.reaction.findUnique({
        where: {
          userId_postId_commentId: {
            userId: ctx.session.user.id,
            postId,
            commentId: null,
          },
        },
      });

      if (!existingReaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reaction not found',
        });
      }

      await ctx.db.reaction.delete({
        where: { id: existingReaction.id },
      });

      return { success: true };
    }),

  savePost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      const existingSave = await ctx.db.savedPost.findUnique({
        where: {
          userId_postId: {
            userId: ctx.session.user.id,
            postId,
          },
        },
      });

      if (existingSave) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Post already saved',
        });
      }

      await ctx.db.savedPost.create({
        data: {
          userId: ctx.session.user.id,
          postId,
        },
      });

      return { success: true };
    }),

  unsavePost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const existingSave = await ctx.db.savedPost.findUnique({
        where: {
          userId_postId: {
            userId: ctx.session.user.id,
            postId,
          },
        },
      });

      if (!existingSave) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Saved post not found',
        });
      }

      await ctx.db.savedPost.delete({
        where: {
          userId_postId: {
            userId: ctx.session.user.id,
            postId,
          },
        },
      });

      return { success: true };
    }),

  getSavedPosts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      // Build the where clause
      const whereClause: {
        userId: string;
        id?: { lt: string };
      } = {
        userId: ctx.session.user.id,
      };

      // If a cursor is provided, only fetch saved posts created after the cursor
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      const savedPosts = await ctx.db.savedPost.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          post: {
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
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (savedPosts.length > limit) {
        const nextItem = savedPosts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        savedPosts: savedPosts.map((savedPost) => savedPost.post),
        nextCursor,
      };
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1).max(1000),
        parentId: z.string().optional(),
        mediaUrls: z.array(
          z.object({
            url: z.string().url(),
            type: z.enum(['IMAGE', 'VIDEO', 'AUDIO']),
            thumbnailUrl: z.string().url().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, content, parentId, mediaUrls } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // If a parentId is provided, verify it exists and belongs to the post
      if (parentId) {
        const parentComment = await ctx.db.comment.findUnique({
          where: { id: parentId },
          select: {
            id: true,
            postId: true,
            userId: true,
          },
        });

        if (!parentComment || parentComment.postId !== postId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid parent comment',
          });
        }
      }

      const comment = await ctx.db.comment.create({
        data: {
          content,
          userId: ctx.session.user.id,
          postId,
          parentId,
          media: mediaUrls ? {
            createMany: {
              data: mediaUrls.map(({ url, type, thumbnailUrl }) => ({
                url,
                type,
                thumbnailUrl,
              })),
            },
          } : undefined,
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
        },
      });

      // Create notification for the post author (if it's not their own comment)
      if (post.userId !== ctx.session.user.id) {
        await ctx.db.notification.create({
          data: {
            type: 'COMMENT',
            recipientId: post.userId,
            senderId: ctx.session.user.id,
            postId,
            commentId: comment.id,
          },
        });
      }

      // If it's a reply, also notify the parent comment author
      if (parentId) {
        const parentComment = await ctx.db.comment.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });

        if (parentComment && parentComment.userId !== ctx.session.user.id && parentComment.userId !== post.userId) {
          await ctx.db.notification.create({
            data: {
              type: 'COMMENT',
              recipientId: parentComment.userId,
              senderId: ctx.session.user.id,
              postId,
              commentId: comment.id,
            },
          });
        }
      }

      return comment;
    }),
});