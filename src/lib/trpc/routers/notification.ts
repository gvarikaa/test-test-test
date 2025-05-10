import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { triggerEvent, getUserChannel, PusherEvents } from '@/lib/pusher';

export const notificationRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      // Count unread notifications
      const unreadCount = await ctx.db.notification.count({
        where: {
          recipientId: ctx.session.user.id,
          isRead: false,
        },
      });

      // Build the where clause
      const whereClause: {
        recipientId: string;
        id?: { lt: string };
      } = {
        recipientId: ctx.session.user.id,
      };

      // If a cursor is provided, only fetch notifications created after the cursor
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      const notifications = await ctx.db.notification.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem!.id;
      }

      return {
        notifications,
        nextCursor,
        unreadCount,
      };
    }),

  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { notificationId } = input;

      if (notificationId) {
        // Mark a specific notification as read
        const notification = await ctx.db.notification.update({
          where: {
            id: notificationId,
            recipientId: ctx.session.user.id,
          },
          data: {
            isRead: true,
          },
        });

        // Trigger real-time event for other open clients
        await triggerEvent(
          getUserChannel(ctx.session.user.id),
          PusherEvents.READ_NOTIFICATION,
          { notificationId: notification.id }
        );

        return { success: true, notification };
      } else {
        // Mark all notifications as read
        await ctx.db.notification.updateMany({
          where: {
            recipientId: ctx.session.user.id,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        // Trigger real-time event for other open clients
        await triggerEvent(
          getUserChannel(ctx.session.user.id),
          PusherEvents.READ_NOTIFICATION,
          {}
        );

        return { success: true };
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        type: z.enum([
          'FOLLOW',
          'LIKE',
          'COMMENT',
          'MENTION',
          'FRIEND_REQUEST',
          'MESSAGE',
          'SYSTEM',
        ]),
        content: z.string().optional(),
        postId: z.string().optional(),
        commentId: z.string().optional(),
        messageId: z.string().optional(),
        url: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { recipientId, type, content, postId, commentId, messageId, url } = input;

      // Don't create notifications for yourself
      if (recipientId === ctx.session.user.id) {
        return { success: false, error: 'Cannot create notification for yourself' };
      }

      // Create the notification
      const notification = await ctx.db.notification.create({
        data: {
          type,
          content,
          recipientId,
          senderId: ctx.session.user.id,
          postId,
          commentId,
          messageId,
          url,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Trigger real-time notification via Pusher
      await triggerEvent(
        getUserChannel(recipientId),
        PusherEvents.NEW_NOTIFICATION,
        notification
      );

      return { success: true, notification };
    }),

  // Get unread count only
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const unreadCount = await ctx.db.notification.count({
        where: {
          recipientId: ctx.session.user.id,
          isRead: false,
        },
      });

      return { unreadCount };
    }),

  // Test - Create a test notification for the current user
  createTestNotification: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          'FOLLOW',
          'LIKE',
          'COMMENT',
          'MENTION',
          'FRIEND_REQUEST',
          'MESSAGE',
          'SYSTEM',
        ]).default('SYSTEM'),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { type, content } = input;

      // Create a simulated notification from a system user
      const notification = await ctx.db.notification.create({
        data: {
          type,
          content: content || 'ეს არის სატესტო შეტყობინება',
          recipientId: ctx.session.user.id,
          url: '#',
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Trigger real-time notification via Pusher
      await triggerEvent(
        getUserChannel(ctx.session.user.id),
        PusherEvents.NEW_NOTIFICATION,
        notification
      );

      return { success: true, notification };
    }),
});