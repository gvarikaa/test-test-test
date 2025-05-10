import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../server';
import { triggerEvent, getUserChannel, PusherEvents } from '@/lib/pusher';
import { NotificationPriority, NotificationChannel, NotificationType } from '@prisma/client';
import { sendPushNotification } from '@/lib/push-service';
import { sendMobilePushNotification } from '@/lib/mobile-push-service';
import {
  scheduleNotification,
  scheduleRecurringNotification,
  cancelScheduledNotification,
  processScheduledNotifications
} from '@/lib/notification-scheduler';

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
          // User-related notifications
          'FOLLOW',
          'LIKE',
          'COMMENT',
          'MENTION',
          'FRIEND_REQUEST',
          'MESSAGE',
          'SYSTEM',

          // Group-related notifications
          'GROUP_INVITE',
          'GROUP_JOIN_REQUEST',
          'GROUP_JOIN_APPROVED',
          'GROUP_ROLE_CHANGE',
          'GROUP_POST',
          'GROUP_COMMENT',
          'GROUP_REACTION',
          'GROUP_EVENT',
          'GROUP_POLL',
          'GROUP_ANNOUNCEMENT',
          'GROUP_MENTION',
          'GROUP_FILE_UPLOAD',
          'GROUP_BADGE_AWARDED',

          // Page-related notifications
          'PAGE_INVITE',
          'PAGE_POST',
          'PAGE_EVENT',

          // Content notifications
          'POST_TRENDING',
          'CONTENT_REMOVED',

          // AI-related notifications
          'AI_RECOMMENDATION',

          // Health-related notifications
          'HEALTH_REMINDER',
          'HEALTH_GOAL_ACHIEVED',

          // System notifications
          'SECURITY_ALERT',
          'ACCOUNT_UPDATE',
        ]),
        content: z.string().optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),

        // Basic metadata
        postId: z.string().optional(),
        commentId: z.string().optional(),
        messageId: z.string().optional(),
        url: z.string().optional(),
        imageUrl: z.string().optional(),

        // Group-related fields
        groupId: z.string().optional(),
        groupPostId: z.string().optional(),
        groupCommentId: z.string().optional(),
        groupEventId: z.string().optional(),
        groupPollId: z.string().optional(),
        groupFileId: z.string().optional(),
        groupBadgeId: z.string().optional(),

        // Page-related fields
        pageId: z.string().optional(),

        // Action-related fields
        isActionable: z.boolean().optional(),
        actionLabel: z.string().optional(),
        actionUrl: z.string().optional(),

        // Advanced options
        expiresAt: z.date().optional(),
        metadata: z.record(z.any()).optional(),
        overrideUserPreferences: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        recipientId, type, content, priority, postId, commentId, messageId, url,
        imageUrl, groupId, groupPostId, groupCommentId, groupEventId, groupPollId,
        groupFileId, groupBadgeId, pageId, isActionable, actionLabel, actionUrl,
        expiresAt, metadata, overrideUserPreferences
      } = input;

      // Don't create notifications for yourself
      if (recipientId === ctx.session.user.id) {
        return { success: false, error: 'Cannot create notification for yourself' };
      }

      // Get user's notification preferences to check if they want this type of notification
      // (skipped if overrideUserPreferences is true)
      if (!overrideUserPreferences) {
        // Check user's notification settings before sending
        const userPreferences = await ctx.db.notificationPreference.findUnique({
          where: { userId: recipientId }
        });

        // If user has disabled in-app notifications, don't create one
        if (userPreferences?.inAppEnabled === false) {
          return { success: false, error: 'Recipient has disabled notifications of this type' };
        }

        // Check category-specific preferences
        let category = 'SOCIAL';
        if (type.startsWith('GROUP_')) category = 'GROUP';
        if (type.startsWith('PAGE_')) category = 'PAGE';
        if (type === 'SECURITY_ALERT' || type === 'ACCOUNT_UPDATE') category = 'SYSTEM';
        if (type.startsWith('HEALTH_')) category = 'HEALTH';

        const categoryPreference = await ctx.db.notificationCategoryPreference.findUnique({
          where: {
            userId_category: {
              userId: recipientId,
              category: category
            }
          }
        });

        if (categoryPreference?.muteAll === true) {
          return { success: false, error: `Recipient has muted ${category} notifications` };
        }

        // Check group-specific preferences if applicable
        if (groupId) {
          const groupPreference = await ctx.db.notificationGroupPreference.findUnique({
            where: {
              userId_groupId: {
                userId: recipientId,
                groupId
              }
            }
          });

          if (groupPreference?.muteAll === true) {
            return { success: false, error: 'Recipient has muted notifications for this group' };
          }

          // Check specific notification types for this group
          if (type === 'GROUP_POST' && groupPreference?.postsEnabled === false) {
            return { success: false, error: 'Recipient has disabled post notifications for this group' };
          }

          if (type === 'GROUP_COMMENT' && groupPreference?.commentsEnabled === false) {
            return { success: false, error: 'Recipient has disabled comment notifications for this group' };
          }

          if (type === 'GROUP_EVENT' && groupPreference?.eventsEnabled === false) {
            return { success: false, error: 'Recipient has disabled event notifications for this group' };
          }

          if (type === 'GROUP_POLL' && groupPreference?.pollsEnabled === false) {
            return { success: false, error: 'Recipient has disabled poll notifications for this group' };
          }

          if (type === 'GROUP_MENTION' && groupPreference?.mentionsEnabled === false) {
            return { success: false, error: 'Recipient has disabled mention notifications for this group' };
          }

          if (groupPreference?.announcementsOnly === true && type !== 'GROUP_ANNOUNCEMENT') {
            return { success: false, error: 'Recipient only receives announcements for this group' };
          }
        }
      }

      // Create the notification with all the new fields
      const notification = await ctx.db.notification.create({
        data: {
          type,
          content,
          priority: priority || 'NORMAL',
          isRead: false,
          recipientId,
          senderId: ctx.session.user.id,

          // Basic content references
          postId,
          commentId,
          messageId,
          url,
          imageUrl,

          // Group-related references
          groupId,
          groupPostId,
          groupCommentId,
          groupEventId,
          groupPollId,
          groupFileId,
          groupBadgeId,

          // Page-related references
          pageId,

          // Action-related fields
          isActionable: isActionable || false,
          actionLabel,
          actionUrl,

          // Advanced options
          expiresAt,
          metadata: metadata ? metadata : undefined,
          overrideUserPreferences: overrideUserPreferences || false,

          // Set default delivery status for tracking
          deliveryStatus: 'PENDING'
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

      // Create a notification log entry for this delivery
      await ctx.db.notificationLog.create({
        data: {
          notificationId: notification.id,
          userId: recipientId,
          channel: 'IN_APP',
          event: 'delivered',
          success: true,
          timestamp: new Date(),
        }
      });

      // Trigger real-time notification via Pusher
      await triggerEvent(
        getUserChannel(recipientId),
        PusherEvents.NEW_NOTIFICATION,
        notification
      );

      // Send push notification if user has push enabled
      const userPreferences = await ctx.db.notificationPreference.findUnique({
        where: { userId: recipientId }
      });

      if (userPreferences?.pushEnabled) {
        // Check if this notification type has push enabled in category preferences
        let category = 'SOCIAL';
        if (type.startsWith('GROUP_')) category = 'GROUP';
        if (type.startsWith('PAGE_')) category = 'PAGE';
        if (type === 'SECURITY_ALERT' || type === 'ACCOUNT_UPDATE') category = 'SYSTEM';
        if (type.startsWith('HEALTH_')) category = 'HEALTH';

        const categoryPreference = await ctx.db.notificationCategoryPreference.findUnique({
          where: {
            userId_category: {
              userId: recipientId,
              category
            }
          }
        });

        const shouldSendPush =
          overrideUserPreferences ||
          !categoryPreference ||
          (categoryPreference.pushEnabled && !categoryPreference.muteAll);

        // Only send push if not in quiet hours
        const isInQuietHours = userPreferences.quietHoursEnabled &&
          (() => {
            // Simple quiet hours check - in a real app this would be more sophisticated
            // and check the user's timezone and current day of week
            if (!userPreferences.quietHoursStart || !userPreferences.quietHoursEnd) {
              return false;
            }

            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            const start = userPreferences.quietHoursStart;
            const end = userPreferences.quietHoursEnd;

            // Handle overnight quiet hours (e.g., 22:00 - 08:00)
            if (start > end) {
              return currentTime >= start || currentTime < end;
            } else {
              return currentTime >= start && currentTime < end;
            }
          })();

        // Only send push if not in quiet hours or if notification is high priority
        const shouldIgnoreQuietHours =
          priority === 'HIGH' ||
          priority === 'URGENT' ||
          type === 'SECURITY_ALERT';

        if (shouldSendPush && (!isInQuietHours || shouldIgnoreQuietHours)) {
          // Send browser push notification asynchronously (don't await)
          sendPushNotification(recipientId, notification).catch(error => {
            console.error('Error sending browser push notification:', error);
          });

          // Send mobile push notification asynchronously (don't await)
          sendMobilePushNotification(recipientId, notification).catch(error => {
            console.error('Error sending mobile push notification:', error);
          });
        }
      }

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
          'GROUP_INVITE',
          'GROUP_POST',
          'GROUP_COMMENT',
          'PAGE_POST',
          'SECURITY_ALERT',
          'HEALTH_REMINDER',
        ]).default('SYSTEM'),
        content: z.string().optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
        isActionable: z.boolean().optional(),
        actionLabel: z.string().optional(),
        actionUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { type, content, priority, isActionable, actionLabel, actionUrl } = input;

      // Create a simulated notification from a system user
      const notification = await ctx.db.notification.create({
        data: {
          type,
          content: content || 'ეს არის სატესტო შეტყობინება',
          recipientId: ctx.session.user.id,
          url: '#',
          priority: priority || 'NORMAL',
          isActionable: isActionable || false,
          actionLabel: actionLabel || (isActionable ? 'ნახვა' : undefined),
          actionUrl: actionUrl || '#',
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

      // Create a notification log entry
      await ctx.db.notificationLog.create({
        data: {
          notificationId: notification.id,
          userId: ctx.session.user.id,
          channel: 'IN_APP',
          event: 'delivered',
          success: true,
          timestamp: new Date(),
        }
      });

      // Trigger real-time notification via Pusher
      await triggerEvent(
        getUserChannel(ctx.session.user.id),
        PusherEvents.NEW_NOTIFICATION,
        notification
      );

      // Check if user has push notifications enabled
      const userPreferences = await ctx.db.notificationPreference.findUnique({
        where: { userId: ctx.session.user.id }
      });

      // For test notifications, always try to send push if permissions exist
      if (userPreferences?.pushEnabled) {
        // Send browser push notification asynchronously
        sendPushNotification(ctx.session.user.id, notification).catch(error => {
          console.error('Error sending test browser push notification:', error);
        });

        // Send mobile push notification asynchronously
        sendMobilePushNotification(ctx.session.user.id, notification).catch(error => {
          console.error('Error sending test mobile push notification:', error);
        });
      }

      return { success: true, notification };
    }),

  // Get user notification preferences
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      // Get general notification preferences
      const preferences = await ctx.db.notificationPreference.findUnique({
        where: { userId: ctx.session.user.id },
      });

      // If preferences don't exist yet, create default ones
      if (!preferences) {
        const newPreferences = await ctx.db.notificationPreference.create({
          data: {
            userId: ctx.session.user.id,
            emailEnabled: true,
            pushEnabled: true,
            inAppEnabled: true,
            smsEnabled: false,
            quietHoursEnabled: false,
          }
        });
        return { preferences: newPreferences };
      }

      return { preferences };
    }),

  // Update user notification preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        quietHoursEnabled: z.boolean().optional(),
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
        quietHoursDays: z.string().optional(),
        weekendMuteEnabled: z.boolean().optional(),
        digestEnabled: z.boolean().optional(),
        digestFrequency: z.string().optional(),
        digestDay: z.string().optional(),
        digestTime: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find existing preferences or create default ones
      const existingPrefs = await ctx.db.notificationPreference.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (existingPrefs) {
        // Update existing preferences
        const updatedPrefs = await ctx.db.notificationPreference.update({
          where: { userId: ctx.session.user.id },
          data: input,
        });
        return { success: true, preferences: updatedPrefs };
      } else {
        // Create new preferences
        const newPrefs = await ctx.db.notificationPreference.create({
          data: {
            userId: ctx.session.user.id,
            ...input,
          },
        });
        return { success: true, preferences: newPrefs };
      }
    }),

  // Get category preferences
  getCategoryPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const categoryPrefs = await ctx.db.notificationCategoryPreference.findMany({
        where: { userId: ctx.session.user.id },
      });

      return { preferences: categoryPrefs };
    }),

  // Update category preferences
  updateCategoryPreference: protectedProcedure
    .input(
      z.object({
        category: z.string(),
        inAppEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        muteAll: z.boolean().optional(),
        muteUntil: z.date().optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { category, ...data } = input;

      // Find existing preferences for this category
      const existingPref = await ctx.db.notificationCategoryPreference.findUnique({
        where: {
          userId_category: {
            userId: ctx.session.user.id,
            category,
          }
        },
      });

      if (existingPref) {
        // Update existing preferences
        const updatedPref = await ctx.db.notificationCategoryPreference.update({
          where: {
            userId_category: {
              userId: ctx.session.user.id,
              category,
            }
          },
          data,
        });
        return { success: true, preference: updatedPref };
      } else {
        // Create new preferences
        const newPref = await ctx.db.notificationCategoryPreference.create({
          data: {
            userId: ctx.session.user.id,
            category,
            ...data,
          },
        });
        return { success: true, preference: newPref };
      }
    }),

  // Get group preferences
  getGroupPreferences: protectedProcedure
    .input(
      z.object({
        groupId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { groupId } = input;

      // If groupId is provided, get preferences for that specific group
      if (groupId) {
        const groupPref = await ctx.db.notificationGroupPreference.findUnique({
          where: {
            userId_groupId: {
              userId: ctx.session.user.id,
              groupId,
            }
          },
        });

        // If preferences don't exist, return default values
        if (!groupPref) {
          return {
            preferences: {
              inAppEnabled: true,
              emailEnabled: false,
              pushEnabled: true,
              muteAll: false,
              postsEnabled: true,
              commentsEnabled: true,
              eventsEnabled: true,
              pollsEnabled: true,
              mentionsEnabled: true,
              announcementsOnly: false,
            }
          };
        }

        return { preferences: groupPref };
      }

      // Otherwise, get preferences for all groups the user is a member of
      const groupPrefs = await ctx.db.notificationGroupPreference.findMany({
        where: { userId: ctx.session.user.id },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      return { preferences: groupPrefs };
    }),

  // Update group preferences
  updateGroupPreference: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        inAppEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        muteAll: z.boolean().optional(),
        muteUntil: z.date().optional(),
        postsEnabled: z.boolean().optional(),
        commentsEnabled: z.boolean().optional(),
        eventsEnabled: z.boolean().optional(),
        pollsEnabled: z.boolean().optional(),
        mentionsEnabled: z.boolean().optional(),
        announcementsOnly: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, ...data } = input;

      // Find existing preferences for this group
      const existingPref = await ctx.db.notificationGroupPreference.findUnique({
        where: {
          userId_groupId: {
            userId: ctx.session.user.id,
            groupId,
          }
        },
      });

      if (existingPref) {
        // Update existing preferences
        const updatedPref = await ctx.db.notificationGroupPreference.update({
          where: {
            userId_groupId: {
              userId: ctx.session.user.id,
              groupId,
            }
          },
          data,
        });
        return { success: true, preference: updatedPref };
      } else {
        // Create new preferences
        const newPref = await ctx.db.notificationGroupPreference.create({
          data: {
            userId: ctx.session.user.id,
            groupId,
            ...data,
          },
        });
        return { success: true, preference: newPref };
      }
    }),

  // Register a device for push notifications
  registerDevice: protectedProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        platform: z.string(),
        deviceName: z.string().optional(),
        deviceModel: z.string().optional(),
        osVersion: z.string().optional(),
        appVersion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { deviceToken, platform, ...deviceInfo } = input;

      // Check if the device is already registered
      const existingDevice = await ctx.db.pushDevice.findUnique({
        where: { deviceToken },
      });

      if (existingDevice) {
        // If device exists but belongs to another user, update it
        if (existingDevice.userId !== ctx.session.user.id) {
          const updatedDevice = await ctx.db.pushDevice.update({
            where: { deviceToken },
            data: {
              userId: ctx.session.user.id,
              isActive: true,
              lastActive: new Date(),
              ...deviceInfo,
            },
          });
          return { success: true, device: updatedDevice };
        }

        // Otherwise just update the last active time
        const updatedDevice = await ctx.db.pushDevice.update({
          where: { deviceToken },
          data: {
            isActive: true,
            lastActive: new Date(),
            ...deviceInfo,
          },
        });
        return { success: true, device: updatedDevice };
      } else {
        // Create a new device registration
        const newDevice = await ctx.db.pushDevice.create({
          data: {
            deviceToken,
            platform,
            userId: ctx.session.user.id,
            isActive: true,
            ...deviceInfo,
          },
        });
        return { success: true, device: newDevice };
      }
    }),

  // Unregister a device
  unregisterDevice: protectedProcedure
    .input(
      z.object({
        deviceToken: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { deviceToken } = input;

      // Check if the device belongs to the current user
      const device = await ctx.db.pushDevice.findUnique({
        where: { deviceToken },
      });

      if (!device || device.userId !== ctx.session.user.id) {
        return { success: false, error: 'Device not found or does not belong to the current user' };
      }

      // Update device to inactive (we keep the record for analytics)
      await ctx.db.pushDevice.update({
        where: { deviceToken },
        data: { isActive: false },
      });

      return { success: true };
    }),

  // Create a scheduled notification (admin only)
  createScheduledNotification: adminProcedure
    .input(
      z.object({
        type: z.enum(Object.values(NotificationType) as [string, ...string[]]),
        content: z.string(),
        scheduledFor: z.date(),
        recipientId: z.string().optional(),
        groupId: z.string().optional(),
        recurring: z.boolean().optional(),
        recurrencePattern: z.string().optional(),
        recurrenceEnd: z.date().optional(),
        channels: z.string().optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
        metadata: z.record(z.any()).optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const {
        type, content, scheduledFor, recipientId, groupId,
        recurring, recurrencePattern, recurrenceEnd, channels,
        priority, metadata, entityType, entityId
      } = input;

      // Validate that either recipientId or groupId is provided
      if (!recipientId && !groupId) {
        return {
          success: false,
          error: 'Either recipientId or groupId must be provided'
        };
      }

      // Create the scheduled notification based on type
      let result;
      if (recurring) {
        if (!recurrencePattern) {
          return {
            success: false,
            error: 'recurrencePattern is required for recurring notifications'
          };
        }

        result = await scheduleRecurringNotification({
          type,
          content,
          startDate: scheduledFor,
          recurrencePattern,
          endDate: recurrenceEnd,
          recipientId,
          groupId,
          priority,
          channels,
          metadata,
          entityType,
          entityId,
        });
      } else {
        result = await scheduleNotification({
          type,
          content,
          scheduledFor,
          recipientId,
          groupId,
          priority,
          channels,
          metadata,
          entityType,
          entityId,
        });
      }

      return result;
    }),

  // Cancel a scheduled notification (admin only)
  cancelScheduledNotification: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { id } = input;
      return await cancelScheduledNotification(id);
    }),

  // Process scheduled notifications (admin only)
  processScheduledNotifications: adminProcedure
    .mutation(async () => {
      return await processScheduledNotifications();
    }),

  // Track notification interaction
  trackNotificationInteraction: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
        event: z.enum(['read', 'clicked', 'dismissed']),
        deviceInfo: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { notificationId, event, deviceInfo } = input;

      // Check if notification exists and belongs to the current user
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: notificationId,
          recipientId: ctx.session.user.id,
        },
      });

      if (!notification) {
        return { success: false, error: 'Notification not found or does not belong to the current user' };
      }

      // Create notification log entry
      await ctx.db.notificationLog.create({
        data: {
          notificationId,
          userId: ctx.session.user.id,
          channel: 'IN_APP',
          event,
          success: true,
          deviceInfo: deviceInfo || undefined,
          timestamp: new Date(),
        },
      });

      // If the event is 'read', update the notification
      if (event === 'read') {
        await ctx.db.notification.update({
          where: { id: notificationId },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      }

      return { success: true };
    }),
});