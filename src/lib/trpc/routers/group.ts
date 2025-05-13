import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { GroupPrivacy, GroupRole, GroupContentStatus } from '@prisma/client';

export const groupRouter = router({
  // Group Post Endpoints

  // Create a post in a group
  createPost: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        content: z.string().min(1),
        mediaIds: z.array(z.string()).optional(),
        isPinned: z.boolean().optional().default(false),
        isAnnouncement: z.boolean().optional().default(false),
        topicId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, content, mediaIds, isPinned, isAnnouncement, topicId } = input;
      const userId = ctx.session.user.id;

      // Check if the user is a member of the group
      const membership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
        include: {
          group: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a member of the group to post',
        });
      }

      // Check if the group requires post approval and the user is not an admin or owner
      if (
        membership.group.requirePostApproval &&
        membership.role !== GroupRole.OWNER &&
        membership.role !== GroupRole.ADMIN &&
        membership.role !== GroupRole.MODERATOR
      ) {
        // Create post with PENDING status
        const pendingPost = await ctx.db.groupPost.create({
          data: {
            content,
            userId,
            groupId,
            topicId,
            isPinned,
            isAnnouncement,
            status: GroupContentStatus.PENDING,
            ...(mediaIds && mediaIds.length > 0
              ? {
                  media: {
                    connect: mediaIds.map((id) => ({ id })),
                  },
                }
              : {}),
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

        // Create notification for group admins
        const admins = await ctx.db.groupMember.findMany({
          where: {
            groupId,
            role: {
              in: [GroupRole.OWNER, GroupRole.ADMIN, GroupRole.MODERATOR],
            },
          },
          select: {
            userId: true,
          },
        });

        // Create notifications for admins about pending post
        for (const admin of admins) {
          if (admin.userId !== userId) { // Don't notify the post creator
            await ctx.db.notification.create({
              data: {
                type: 'GROUP_POST_PENDING',
                groupId,
                senderId: userId,
                recipientId: admin.userId,
                referenceId: pendingPost.id,
              },
            });
          }
        }

        return {
          ...pendingPost,
          isPending: true,
        };
      }

      // Create published post (no approval needed)
      const post = await ctx.db.groupPost.create({
        data: {
          content,
          userId,
          groupId,
          topicId,
          isPinned,
          isAnnouncement,
          status: GroupContentStatus.PUBLISHED,
          ...(mediaIds && mediaIds.length > 0
            ? {
                media: {
                  connect: mediaIds.map((id) => ({ id })),
                },
              }
            : {}),
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

      return {
        ...post,
        isPending: false,
      };
    }),

  // Get posts for a group
  getGroupPosts: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        limit: z.number().min(1).max(50).optional().default(10),
        cursor: z.string().nullish(),
        onlyAnnouncements: z.boolean().optional().default(false),
        topicId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { groupId, limit, cursor, onlyAnnouncements, topicId } = input;
      const userId = ctx.session?.user?.id;

      // Check if group exists and if the user has access
      const group = await ctx.db.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // If group is private or secret, check if the user is a member
      if (group.privacy !== GroupPrivacy.PUBLIC) {
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to view this group',
          });
        }

        const membership = await ctx.db.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId,
              groupId,
            },
          },
        });

        if (!membership) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You must be a member to view this group',
          });
        }
      }

      // Check if the user is an admin (to see pending posts)
      let isAdmin = false;
      if (userId) {
        const membership = await ctx.db.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId,
              groupId,
            },
          },
        });

        isAdmin = membership?.role === GroupRole.OWNER ||
                 membership?.role === GroupRole.ADMIN ||
                 membership?.role === GroupRole.MODERATOR;
      }

      // Build the query conditions
      const where: any = {
        groupId,
        // Only admins can see pending posts
        status: isAdmin
          ? { in: [GroupContentStatus.PUBLISHED, GroupContentStatus.PENDING] }
          : GroupContentStatus.PUBLISHED,
        // Filter by topic if specified
        ...(topicId ? { topicId } : {}),
        // Filter for announcements if requested
        ...(onlyAnnouncements ? { isAnnouncement: true } : {}),
      };

      // Get posts with pagination
      const posts = await ctx.db.groupPost.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [
          // Pinned posts first
          { isPinned: 'desc' },
          // Then announcements
          { isAnnouncement: 'desc' },
          // Then most recent
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
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
      });

      // Handle pagination
      let nextCursor: typeof cursor = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      return {
        posts,
        nextCursor,
      };
    }),

  // Get a specific group post
  getGroupPost: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session?.user?.id;

      const post = await ctx.db.groupPost.findUnique({
        where: { id: postId },
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
          group: true,
          _count: {
            select: {
              comments: true,
              reactions: true,
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

      // Check if the group is private/secret and if the user has access
      if (post.group.privacy !== GroupPrivacy.PUBLIC) {
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to view this post',
          });
        }

        const membership = await ctx.db.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId,
              groupId: post.groupId,
            },
          },
        });

        if (!membership) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You must be a member to view this post',
          });
        }
      }

      // Update view count
      await ctx.db.groupPost.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      });

      return post;
    }),

  // Add a comment to a group post
  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, content, parentId } = input;
      const userId = ctx.session.user.id;

      // Get the post and check if it exists
      const post = await ctx.db.groupPost.findUnique({
        where: { id: postId },
        include: {
          group: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // Check if the user is a member of the group
      const membership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: post.groupId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a member of the group to comment',
        });
      }

      // If the post is pending, only admins can comment
      if (
        post.status === GroupContentStatus.PENDING &&
        membership.role !== GroupRole.OWNER &&
        membership.role !== GroupRole.ADMIN &&
        membership.role !== GroupRole.MODERATOR
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot comment on pending posts',
        });
      }

      // If there's a parent comment, make sure it exists and belongs to the same post
      if (parentId) {
        const parentComment = await ctx.db.groupComment.findUnique({
          where: { id: parentId },
        });

        if (!parentComment || parentComment.postId !== postId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid parent comment',
          });
        }
      }

      // Create the comment
      const comment = await ctx.db.groupComment.create({
        data: {
          content,
          userId,
          postId,
          parentId,
          status: GroupContentStatus.PUBLISHED,
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
        },
      });

      // Create notification for post owner if it's not the commenter
      if (post.userId !== userId) {
        await ctx.db.notification.create({
          data: {
            type: 'GROUP_POST_COMMENT',
            groupId: post.groupId,
            senderId: userId,
            recipientId: post.userId,
            referenceId: postId,
          },
        });
      }

      // Create notification for parent comment owner if it's a reply
      if (parentId) {
        const parentComment = await ctx.db.groupComment.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });

        if (parentComment && parentComment.userId !== userId && parentComment.userId !== post.userId) {
          await ctx.db.notification.create({
            data: {
              type: 'GROUP_COMMENT_REPLY',
              groupId: post.groupId,
              senderId: userId,
              recipientId: parentComment.userId,
              referenceId: comment.id,
            },
          });
        }
      }

      return comment;
    }),

  // Get comments for a group post
  getPostComments: publicProcedure
    .input(
      z.object({
        postId: z.string(),
        limit: z.number().min(1).max(50).optional().default(20),
        cursor: z.string().nullish(),
        parentId: z.string().optional(), // For replies to a specific comment
      })
    )
    .query(async ({ ctx, input }) => {
      const { postId, limit, cursor, parentId } = input;
      const userId = ctx.session?.user?.id;

      // Get the post and check access permissions
      const post = await ctx.db.groupPost.findUnique({
        where: { id: postId },
        include: {
          group: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // Check if the group is private/secret and if the user has access
      if (post.group.privacy !== GroupPrivacy.PUBLIC) {
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to view this post',
          });
        }

        const membership = await ctx.db.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId,
              groupId: post.groupId,
            },
          },
        });

        if (!membership) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You must be a member to view this post',
          });
        }
      }

      // Build the query
      const where = {
        postId,
        status: GroupContentStatus.PUBLISHED,
        // If parentId is provided, get replies to that comment
        // If not, get top-level comments (parentId is null)
        ...(parentId !== undefined ? { parentId } : { parentId: null }),
      };

      const comments = await ctx.db.groupComment.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: parentId ? 'asc' : 'desc', // Replies chronologically, top comments newest first
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
              replies: true,
              reactions: true,
            },
          },
        },
      });

      // Handle pagination
      let nextCursor: typeof cursor = undefined;
      if (comments.length > limit) {
        const nextItem = comments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        comments,
        nextCursor,
      };
    }),

  // React to a group post or comment
  addReaction: protectedProcedure
    .input(
      z.object({
        postId: z.string().optional(),
        commentId: z.string().optional(),
        type: z.enum(['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, commentId, type } = input;
      const userId = ctx.session.user.id;

      if (!postId && !commentId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must provide either postId or commentId',
        });
      }

      let groupId: string;

      // Check permissions based on whether it's a post or comment reaction
      if (postId) {
        const post = await ctx.db.groupPost.findUnique({
          where: { id: postId },
          select: { groupId: true },
        });

        if (!post) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Post not found',
          });
        }

        groupId = post.groupId;
      } else if (commentId) {
        const comment = await ctx.db.groupComment.findUnique({
          where: { id: commentId },
          include: {
            post: {
              select: { groupId: true },
            },
          },
        });

        if (!comment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Comment not found',
          });
        }

        groupId = comment.post.groupId;
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid request',
        });
      }

      // Check if user is a member of the group
      const membership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a member of the group to react',
        });
      }

      // Check if reaction already exists and remove it if same type (toggle behavior)
      const existingReaction = await ctx.db.groupReaction.findFirst({
        where: {
          userId,
          ...(postId ? { postId } : { commentId }),
        },
      });

      if (existingReaction) {
        if (existingReaction.type === type) {
          // Remove reaction if same type (toggle off)
          await ctx.db.groupReaction.delete({
            where: { id: existingReaction.id },
          });
          return { action: 'removed' };
        } else {
          // Update reaction if different type
          await ctx.db.groupReaction.update({
            where: { id: existingReaction.id },
            data: { type },
          });
          return { action: 'updated' };
        }
      }

      // Create new reaction
      await ctx.db.groupReaction.create({
        data: {
          type,
          userId,
          ...(postId ? { postId } : { commentId }),
        },
      });

      return { action: 'added' };
    }),
  // Create a new group
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(100),
        handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
        description: z.string().max(1000).optional(),
        privacy: z.nativeEnum(GroupPrivacy).default(GroupPrivacy.PUBLIC),
        rules: z.string().max(5000).optional(),
        logoImage: z.string().url().optional(),
        coverImage: z.string().url().optional(),
        autoApproveMembers: z.boolean().default(true),
        allowMemberPosts: z.boolean().default(true),
        requirePostApproval: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if group handle is already taken
      const existingGroup = await ctx.db.group.findUnique({
        where: { handle: input.handle },
      });

      if (existingGroup) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Group handle is already taken',
        });
      }

      // Create group and automatically add creator as OWNER
      const group = await ctx.db.group.create({
        data: {
          ...input,
          creatorId: ctx.session.user.id,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: GroupRole.OWNER,
            },
          },
          settings: {
            create: {
              // Default settings
              allowMemberInvites: true,
              enableDiscussions: true,
              enableEvents: true,
              enablePolls: true,
              enableFiles: true,
            },
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          settings: true,
        },
      });

      return group;
    }),

  // Get group by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          settings: true,
          _count: {
            select: {
              members: true,
              posts: true,
              discussions: true,
              events: true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // If group is SECRET, check if user is a member
      if (group.privacy === GroupPrivacy.SECRET) {
        // For logged in users
        if (ctx.session?.user) {
          const isMember = await ctx.db.groupMember.findUnique({
            where: {
              userId_groupId: {
                userId: ctx.session.user.id,
                groupId: input.id,
              },
            },
          });

          if (!isMember) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this group',
            });
          }
        } else {
          // For anonymous users
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this group',
          });
        }
      }

      return group;
    }),

  // Get group by handle
  getByHandle: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { handle: input.handle },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          settings: true,
          _count: {
            select: {
              members: true,
              posts: true,
              discussions: true,
              events: true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // If group is SECRET, check if user is a member
      if (group.privacy === GroupPrivacy.SECRET) {
        // For logged in users
        if (ctx.session?.user) {
          const isMember = await ctx.db.groupMember.findUnique({
            where: {
              userId_groupId: {
                userId: ctx.session.user.id,
                groupId: group.id,
              },
            },
          });

          if (!isMember) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this group',
            });
          }
        } else {
          // For anonymous users
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this group',
          });
        }
      }

      return group;
    }),

  // Get all public groups with optional filtering and pagination
  getAll: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(10),
      }).optional()
    )
    .query(async ({ ctx, input = { limit: 10 } }) => {
      // Default values if input is undefined
      const query = input?.query || "";
      const cursor = input?.cursor;
      const limit = input?.limit ?? 10;

      const groups = await ctx.db.group.findMany({
        where: {
          privacy: {
            in: [GroupPrivacy.PUBLIC, GroupPrivacy.PRIVATE],
          },
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
      });

      let nextCursor: string | null = null;
      if (groups.length > limit) {
        const nextItem = groups.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return {
        items: groups,
        nextCursor,
      };
    }),

  // Get user's groups (groups they are a member of)
  getUserGroups: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(10),
      }).optional()
    )
    .query(async ({ ctx, input = { limit: 10 } }) => {
      // Return empty result if no session or user (client should prevent calling this)
      if (!ctx.session?.user?.id) {
        return {
          items: [],
          nextCursor: null
        };
      }

      // Default values if input is undefined
      const cursor = input?.cursor;
      const limit = input?.limit ?? 10;

      const groupMembers = await ctx.db.groupMember.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        include: {
          group: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  members: true,
                  posts: true,
                },
              },
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
      });

      let nextCursor: string | null = null;
      if (groupMembers.length > limit) {
        const nextItem = groupMembers.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return {
        items: groupMembers.map((membership) => ({
          membership: {
            id: membership.id,
            role: membership.role,
            createdAt: membership.createdAt,
          },
          group: membership.group,
        })),
        nextCursor,
      };
    }),

  // Get groups created by the user
  getCreatedGroups: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;

      const groups = await ctx.db.group.findMany({
        where: {
          creatorId: ctx.session.user.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          _count: {
            select: {
              members: true,
              posts: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
      });

      let nextCursor: string | null = null;
      if (groups.length > limit) {
        const nextItem = groups.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return {
        items: groups,
        nextCursor,
      };
    }),

  // Update group settings
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(3).max(100).optional(),
        description: z.string().max(1000).optional(),
        privacy: z.nativeEnum(GroupPrivacy).optional(),
        rules: z.string().max(5000).optional(),
        logoImage: z.string().url().optional(),
        coverImage: z.string().url().optional(),
        autoApproveMembers: z.boolean().optional(),
        allowMemberPosts: z.boolean().optional(),
        requirePostApproval: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if user has permission (must be OWNER or ADMIN)
      const membership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: id,
          },
        },
      });

      if (!membership || ![GroupRole.OWNER, GroupRole.ADMIN].includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this group',
        });
      }

      const group = await ctx.db.group.update({
        where: { id },
        data,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          settings: true,
        },
      });

      return group;
    }),

  // Update group settings
  updateSettings: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        allowMemberInvites: z.boolean().optional(),
        enableDiscussions: z.boolean().optional(),
        enableEvents: z.boolean().optional(),
        enablePolls: z.boolean().optional(),
        enableFiles: z.boolean().optional(),
        enableBadges: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, ...settings } = input;

      // Check if user has permission (must be OWNER or ADMIN)
      const membership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId,
          },
        },
      });

      if (!membership || ![GroupRole.OWNER, GroupRole.ADMIN].includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update group settings',
        });
      }

      const updatedSettings = await ctx.db.groupSettings.update({
        where: { groupId },
        data: settings,
      });

      return updatedSettings;
    }),

  // Join a group
  join: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // Check if user is already a member
      const existingMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already a member of this group',
        });
      }

      // For SECRET groups, users must be invited
      if (group.privacy === GroupPrivacy.SECRET) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This is a secret group. You must be invited to join.',
        });
      }

      // For PRIVATE groups, create a join request if auto-approve is off
      if (group.privacy === GroupPrivacy.PRIVATE && !group.autoApproveMembers) {
        // Check if there's already a pending request
        const existingRequest = await ctx.db.groupJoinRequest.findFirst({
          where: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
            status: 'PENDING',
          },
        });

        if (existingRequest) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You already have a pending request to join this group',
          });
        }

        await ctx.db.groupJoinRequest.create({
          data: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
            status: 'PENDING',
          },
        });

        return {
          status: 'PENDING',
          message: 'Your request to join this group is pending approval',
        };
      }

      // For PUBLIC groups or PRIVATE with auto-approve, add user as member immediately
      const membership = await ctx.db.groupMember.create({
        data: {
          userId: ctx.session.user.id,
          groupId: input.groupId,
          role: GroupRole.MEMBER,
        },
      });

      return {
        status: 'JOINED',
        membership,
      };
    }),

  // Leave a group
  leave: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is a member
      const membership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are not a member of this group',
        });
      }

      // If user is the OWNER, they can't leave unless they transfer ownership
      if (membership.role === GroupRole.OWNER) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Group owners cannot leave. Transfer ownership to another member first.',
        });
      }

      // Remove membership
      await ctx.db.groupMember.delete({
        where: {
          id: membership.id,
        },
      });

      return { success: true };
    }),

  // Add a member to the group (admin only)
  addMember: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
        role: z.nativeEnum(GroupRole).default(GroupRole.MEMBER),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the caller has permission (must be OWNER or ADMIN)
      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (!callerMembership || ![GroupRole.OWNER, GroupRole.ADMIN].includes(callerMembership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to add members to this group',
        });
      }

      // Only OWNER can add ADMIN
      if (input.role === GroupRole.ADMIN && callerMembership.role !== GroupRole.OWNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the group owner can add administrators',
        });
      }

      // Check if the target user exists
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if the user is already a member
      const existingMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: input.userId,
            groupId: input.groupId,
          },
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is already a member of this group',
        });
      }

      // Add the user as a member
      const membership = await ctx.db.groupMember.create({
        data: {
          userId: input.userId,
          groupId: input.groupId,
          role: input.role,
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
        },
      });

      // Create notification for the added user
      await ctx.db.notification.create({
        data: {
          type: 'GROUP_ADDED',
          recipientId: input.userId,
          senderId: ctx.session.user.id,
          groupId: input.groupId,
        },
      });

      return membership;
    }),

  // Remove a member from the group (admin only)
  removeMember: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the caller has permission (must be OWNER or ADMIN)
      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (!callerMembership || ![GroupRole.OWNER, GroupRole.ADMIN].includes(callerMembership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to remove members from this group',
        });
      }

      // Check if the target member exists
      const targetMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: input.userId,
            groupId: input.groupId,
          },
        },
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // ADMIN can't remove OWNER or other ADMIN
      if (
        callerMembership.role === GroupRole.ADMIN &&
        [GroupRole.OWNER, GroupRole.ADMIN].includes(targetMembership.role)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to remove this member',
        });
      }

      // Can't remove the group owner
      if (targetMembership.role === GroupRole.OWNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot remove the group owner',
        });
      }

      // Remove the member
      await ctx.db.groupMember.delete({
        where: {
          id: targetMembership.id,
        },
      });

      return { success: true };
    }),

  // Update a member's role (owner only)
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
        role: z.nativeEnum(GroupRole),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the caller is the group owner
      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      // Only OWNER can change roles to ADMIN
      if (callerMembership?.role !== GroupRole.OWNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the group owner can update member roles',
        });
      }

      // Cannot set another member as OWNER
      if (input.role === GroupRole.OWNER) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot set another member as owner. Use the transfer ownership endpoint instead.',
        });
      }

      // Check if the target member exists
      const targetMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: input.userId,
            groupId: input.groupId,
          },
        },
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Cannot change the role of the current owner
      if (targetMembership.role === GroupRole.OWNER) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot change the role of the group owner',
        });
      }

      // Update the role
      const updatedMembership = await ctx.db.groupMember.update({
        where: {
          id: targetMembership.id,
        },
        data: {
          role: input.role,
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
        },
      });

      return updatedMembership;
    }),

  // Transfer group ownership
  transferOwnership: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        newOwnerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the caller is the group owner
      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (!callerMembership || callerMembership.role !== GroupRole.OWNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the group owner can transfer ownership',
        });
      }

      // Check if new owner is a member
      const newOwnerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: input.newOwnerId,
            groupId: input.groupId,
          },
        },
      });

      if (!newOwnerMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The new owner must be a member of the group',
        });
      }

      // Start a transaction to update both memberships
      await ctx.db.$transaction([
        // Update current owner to admin
        ctx.db.groupMember.update({
          where: {
            id: callerMembership.id,
          },
          data: {
            role: GroupRole.ADMIN,
          },
        }),
        // Update new owner
        ctx.db.groupMember.update({
          where: {
            id: newOwnerMembership.id,
          },
          data: {
            role: GroupRole.OWNER,
          },
        }),
        // Update group creator
        ctx.db.group.update({
          where: {
            id: input.groupId,
          },
          data: {
            creatorId: input.newOwnerId,
          },
        }),
      ]);

      return { success: true };
    }),

  // Get all members of a group
  getMembers: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        query: z.string().optional(),
        role: z.nativeEnum(GroupRole).optional(),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { groupId, query, role, cursor, limit } = input;

      if (!groupId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Group ID is required'
        });
      }

      // Check if group exists and if user has access to secret groups
      const group = await ctx.db.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // If group is SECRET, check if user is a member
      if (group.privacy === GroupPrivacy.SECRET) {
        if (ctx.session?.user) {
          const isMember = await ctx.db.groupMember.findUnique({
            where: {
              userId_groupId: {
                userId: ctx.session.user.id,
                groupId,
              },
            },
          });

          if (!isMember) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this group',
            });
          }
        } else {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this group',
          });
        }
      }

      // Get members with filters
      const members = await ctx.db.groupMember.findMany({
        where: {
          groupId,
          ...(role ? { role } : {}),
          ...(query
            ? {
                user: {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
            },
          },
        },
        orderBy: [
          // Sort by role importance (OWNER first, then ADMIN, etc.)
          {
            role: 'asc',
          },
          // Then by join date
          {
            createdAt: 'asc',
          },
        ],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
      });

      let nextCursor: string | null = null;
      if (members.length > limit) {
        const nextItem = members.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return {
        items: members,
        nextCursor,
      };
    }),

  // Get pending join requests
  getJoinRequests: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { groupId, cursor, limit } = input;

      // Check if the caller has permission (must be OWNER or ADMIN)
      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId,
          },
        },
      });

      if (!callerMembership || ![GroupRole.OWNER, GroupRole.ADMIN, GroupRole.MODERATOR].includes(callerMembership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view join requests',
        });
      }

      // Get pending requests
      const requests = await ctx.db.groupJoinRequest.findMany({
        where: {
          groupId,
          status: 'PENDING',
        },
        include: {
          user: {
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
          createdAt: 'asc', // Oldest first
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
      });

      let nextCursor: string | null = null;
      if (requests.length > limit) {
        const nextItem = requests.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return {
        items: requests,
        nextCursor,
      };
    }),

  // Approve or reject a join request
  processJoinRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        action: z.enum(['APPROVE', 'REJECT']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the request
      const request = await ctx.db.groupJoinRequest.findUnique({
        where: { id: input.requestId },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Join request not found',
        });
      }

      // Check if the request is still pending
      if (request.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This request has already been processed',
        });
      }

      // Check if the caller has permission
      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: request.groupId,
          },
        },
      });

      if (!callerMembership || ![GroupRole.OWNER, GroupRole.ADMIN, GroupRole.MODERATOR].includes(callerMembership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to process join requests',
        });
      }

      if (input.action === 'APPROVE') {
        // Add user as member and update request status
        await ctx.db.$transaction([
          ctx.db.groupJoinRequest.update({
            where: { id: input.requestId },
            data: {
              status: 'APPROVED',
              processedById: ctx.session.user.id,
              processedAt: new Date(),
            },
          }),
          ctx.db.groupMember.create({
            data: {
              userId: request.userId,
              groupId: request.groupId,
              role: GroupRole.MEMBER,
            },
          }),
        ]);

        // Create notification for the user
        await ctx.db.notification.create({
          data: {
            type: 'GROUP_JOIN_APPROVED',
            recipientId: request.userId,
            senderId: ctx.session.user.id,
            groupId: request.groupId,
          },
        });

        return { success: true, action: 'APPROVED' };
      } else {
        // Reject the request
        await ctx.db.groupJoinRequest.update({
          where: { id: input.requestId },
          data: {
            status: 'REJECTED',
            processedById: ctx.session.user.id,
            processedAt: new Date(),
          },
        });

        // Create notification for the user
        await ctx.db.notification.create({
          data: {
            type: 'GROUP_JOIN_REJECTED',
            recipientId: request.userId,
            senderId: ctx.session.user.id,
            groupId: request.groupId,
          },
        });

        return { success: true, action: 'REJECTED' };
      }
    }),

  // Create group invitation
  createInvitation: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the caller is a member with invitation permission
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
        include: {
          settings: true,
        },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (!callerMembership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this group',
        });
      }

      // Check if the caller has permission to invite
      const isAdmin = [GroupRole.OWNER, GroupRole.ADMIN].includes(callerMembership.role);
      if (!isAdmin && !group.settings.allowMemberInvites) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to invite users to this group',
        });
      }

      // Check if target user exists
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if user is already a member
      const existingMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: input.userId,
            groupId: input.groupId,
          },
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is already a member of this group',
        });
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db.groupInvitation.findFirst({
        where: {
          userId: input.userId,
          groupId: input.groupId,
          status: 'PENDING',
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This user already has a pending invitation',
        });
      }

      // Create invitation
      const invitation = await ctx.db.groupInvitation.create({
        data: {
          groupId: input.groupId,
          userId: input.userId,
          inviterId: ctx.session.user.id,
          message: input.message,
          status: 'PENDING',
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              handle: true,
              logoImage: true,
              privacy: true,
            },
          },
          inviter: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      // Create notification for invited user
      await ctx.db.notification.create({
        data: {
          type: 'GROUP_INVITATION',
          recipientId: input.userId,
          senderId: ctx.session.user.id,
          groupId: input.groupId,
        },
      });

      return invitation;
    }),

  // Respond to a group invitation (accept/decline)
  respondToInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.string(),
        action: z.enum(['ACCEPT', 'DECLINE']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the invitation
      const invitation = await ctx.db.groupInvitation.findUnique({
        where: { id: input.invitationId },
        include: {
          group: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      // Check if this invitation belongs to the current user
      if (invitation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This invitation is not for you',
        });
      }

      // Check if the invitation is still pending
      if (invitation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This invitation has already been processed',
        });
      }

      if (input.action === 'ACCEPT') {
        // Add user as a member and update invitation status
        await ctx.db.$transaction([
          ctx.db.groupInvitation.update({
            where: { id: input.invitationId },
            data: {
              status: 'ACCEPTED',
              responseAt: new Date(),
            },
          }),
          ctx.db.groupMember.create({
            data: {
              userId: ctx.session.user.id,
              groupId: invitation.groupId,
              role: GroupRole.MEMBER,
            },
          }),
        ]);

        // Notify the inviter
        await ctx.db.notification.create({
          data: {
            type: 'GROUP_INVITATION_ACCEPTED',
            recipientId: invitation.inviterId,
            senderId: ctx.session.user.id,
            groupId: invitation.groupId,
          },
        });

        return {
          success: true,
          action: 'ACCEPTED',
          groupId: invitation.groupId,
          groupName: invitation.group.name,
          groupHandle: invitation.group.handle,
        };
      } else {
        // Decline the invitation
        await ctx.db.groupInvitation.update({
          where: { id: input.invitationId },
          data: {
            status: 'DECLINED',
            responseAt: new Date(),
          },
        });

        return { success: true, action: 'DECLINED' };
      }
    }),

  // Get user's pending invitations
  getPendingInvitations: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;

      const invitations = await ctx.db.groupInvitation.findMany({
        where: {
          userId: ctx.session.user.id,
          status: 'PENDING',
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              handle: true,
              description: true,
              logoImage: true,
              privacy: true,
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
          inviter: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
      });

      let nextCursor: string | null = null;
      if (invitations.length > limit) {
        const nextItem = invitations.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return {
        items: invitations,
        nextCursor,
      };
    }),

  // Delete a group (owner only)
  delete: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if the caller is the group owner
      const callerMembership = await ctx.db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (!callerMembership || callerMembership.role !== GroupRole.OWNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the group owner can delete the group',
        });
      }

      // Delete the group (cascade will handle related records)
      await ctx.db.group.delete({
        where: { id: input.groupId },
      });

      return { success: true };
    }),
});