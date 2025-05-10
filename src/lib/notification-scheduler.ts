import { prisma } from '@/lib/db';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { sendPushNotification } from '@/lib/push-service';
import { sendMobilePushNotification } from '@/lib/mobile-push-service';
import { triggerEvent, getUserChannel, PusherEvents } from '@/lib/pusher';
import * as cronParser from 'cron-parser';

// Function to process scheduled notifications due for delivery
export async function processScheduledNotifications() {
  try {
    const now = new Date();
    
    // Find all pending scheduled notifications that are due
    const scheduledNotifications = await prisma.scheduledNotification.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
    });
    
    console.log(`Processing ${scheduledNotifications.length} scheduled notifications`);
    
    // Process each notification
    for (const scheduledNotification of scheduledNotifications) {
      try {
        // If it's for a specific recipient
        if (scheduledNotification.recipientId) {
          await sendScheduledNotification(scheduledNotification);
        }
        // If it's for a group of users
        else if (scheduledNotification.groupId) {
          await sendGroupScheduledNotification(scheduledNotification);
        }
        // If it's for a segment of users (not implemented in this example)
        else if (scheduledNotification.segmentId) {
          // This would use a more complex segmentation logic
          // await sendSegmentScheduledNotification(scheduledNotification);
          console.log(`Segmented notifications not implemented yet`);
        }
        
        // Update the notification status to SENT
        await prisma.scheduledNotification.update({
          where: { id: scheduledNotification.id },
          data: {
            status: 'SENT',
            sentCount: { increment: 1 },
          },
        });
        
        // If this is a recurring notification, schedule the next occurrence
        if (scheduledNotification.recurring && scheduledNotification.recurrencePattern) {
          await scheduleNextOccurrence(scheduledNotification);
        }
      } catch (error) {
        console.error(`Error processing scheduled notification ${scheduledNotification.id}:`, error);
        
        // Mark as failed
        await prisma.scheduledNotification.update({
          where: { id: scheduledNotification.id },
          data: {
            status: 'FAILED',
          },
        });
      }
    }
    
    return {
      success: true,
      processedCount: scheduledNotifications.length,
    };
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Function to send a scheduled notification to an individual recipient
async function sendScheduledNotification(scheduledNotification: any) {
  const { recipientId, type, content, priority } = scheduledNotification;
  
  // Create a notification record
  const notification = await prisma.notification.create({
    data: {
      type: type as NotificationType,
      content,
      recipientId,
      priority: priority as NotificationPriority || 'NORMAL',
      isRead: false,
      // Set other fields from the scheduled notification
      url: scheduledNotification.entityType && scheduledNotification.entityId 
        ? `/${scheduledNotification.entityType}/${scheduledNotification.entityId}`
        : '/',
      // Set metadata if available
      metadata: scheduledNotification.metadata || undefined,
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
  
  // Create notification log entry
  await prisma.notificationLog.create({
    data: {
      notificationId: notification.id,
      userId: recipientId,
      channel: 'IN_APP',
      event: 'delivered',
      success: true,
      timestamp: new Date(),
    },
  });
  
  // Determine which channels to deliver to based on the scheduledNotification.channels
  const channels = scheduledNotification.channels?.split(',') || ['IN_APP'];
  
  // Always send in-app notification via Pusher
  await triggerEvent(
    getUserChannel(recipientId),
    PusherEvents.NEW_NOTIFICATION,
    notification
  );
  
  // Check user notification preferences
  const userPreferences = await prisma.notificationPreference.findUnique({
    where: { userId: recipientId },
  });
  
  // Send push notifications if enabled for this channel and user
  if (channels.includes('PUSH') && userPreferences?.pushEnabled) {
    // Send browser push notification
    try {
      await sendPushNotification(recipientId, notification);
    } catch (error) {
      console.error('Error sending scheduled browser push notification:', error);
    }
    
    // Send mobile push notification
    try {
      await sendMobilePushNotification(recipientId, notification);
    } catch (error) {
      console.error('Error sending scheduled mobile push notification:', error);
    }
  }
  
  // Update sent count on the scheduled notification
  await prisma.scheduledNotification.update({
    where: { id: scheduledNotification.id },
    data: {
      sentCount: { increment: 1 },
    },
  });
  
  return notification;
}

// Function to send a scheduled notification to members of a group
async function sendGroupScheduledNotification(scheduledNotification: any) {
  const { groupId, type, content, priority } = scheduledNotification;
  
  // Get all members of the group
  const groupMembers = await prisma.groupMember.findMany({
    where: {
      groupId,
      isActive: true,
    },
    select: {
      userId: true,
    },
  });
  
  // Get group details for the notification content
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      handle: true,
    },
  });
  
  if (!group) {
    throw new Error(`Group with ID ${groupId} not found`);
  }
  
  const notifications = [];
  
  // Send notification to each group member
  for (const member of groupMembers) {
    const notification = await prisma.notification.create({
      data: {
        type: type as NotificationType,
        content: content || `ახალი შეტყობინება ჯგუფიდან "${group.name}"`,
        recipientId: member.userId,
        priority: priority as NotificationPriority || 'NORMAL',
        isRead: false,
        // Set group reference
        groupId,
        // Set URL to the group
        url: `/groups/${group.handle}`,
        // Set metadata if available
        metadata: scheduledNotification.metadata 
          ? { ...scheduledNotification.metadata, groupName: group.name }
          : { groupName: group.name },
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
    
    // Create notification log entry
    await prisma.notificationLog.create({
      data: {
        notificationId: notification.id,
        userId: member.userId,
        channel: 'IN_APP',
        event: 'delivered',
        success: true,
        timestamp: new Date(),
      },
    });
    
    // Always trigger in-app notification
    await triggerEvent(
      getUserChannel(member.userId),
      PusherEvents.NEW_NOTIFICATION,
      notification
    );
    
    // Check user preferences
    const userPreferences = await prisma.notificationPreference.findUnique({
      where: { userId: member.userId },
    });
    
    // Check group notification preferences
    const groupPreferences = await prisma.notificationGroupPreference.findUnique({
      where: {
        userId_groupId: {
          userId: member.userId,
          groupId,
        },
      },
    });
    
    // Determine if we should send push notification based on user preferences
    const shouldSendPush = 
      userPreferences?.pushEnabled &&
      (!groupPreferences || !groupPreferences.muteAll);
      
    // Send push notifications if enabled
    if (shouldSendPush) {
      // Send browser push notification
      try {
        await sendPushNotification(member.userId, notification);
      } catch (error) {
        console.error('Error sending group browser push notification:', error);
      }
      
      // Send mobile push notification
      try {
        await sendMobilePushNotification(member.userId, notification);
      } catch (error) {
        console.error('Error sending group mobile push notification:', error);
      }
    }
    
    notifications.push(notification);
  }
  
  // Update sent count on the scheduled notification
  await prisma.scheduledNotification.update({
    where: { id: scheduledNotification.id },
    data: {
      sentCount: { increment: notifications.length },
    },
  });
  
  return {
    success: true,
    notificationCount: notifications.length,
  };
}

// Function to schedule the next occurrence for a recurring notification
async function scheduleNextOccurrence(scheduledNotification: any) {
  try {
    // Skip if this is not a recurring notification or missing pattern
    if (!scheduledNotification.recurring || !scheduledNotification.recurrencePattern) {
      return null;
    }
    
    // Check if we've reached the recurrence end date
    if (scheduledNotification.recurrenceEnd && new Date() > new Date(scheduledNotification.recurrenceEnd)) {
      return null;
    }
    
    // Parse the cron expression
    const interval = cronParser.parseExpression(scheduledNotification.recurrencePattern, {
      currentDate: new Date(),
    });
    
    // Get the next occurrence
    const nextScheduledFor = interval.next().toDate();
    
    // Create a new scheduled notification for the next occurrence
    const nextNotification = await prisma.scheduledNotification.create({
      data: {
        type: scheduledNotification.type,
        content: scheduledNotification.content,
        scheduledFor: nextScheduledFor,
        recurring: true,
        recurrencePattern: scheduledNotification.recurrencePattern,
        recurrenceEnd: scheduledNotification.recurrenceEnd,
        channels: scheduledNotification.channels,
        priority: scheduledNotification.priority,
        recipientId: scheduledNotification.recipientId,
        groupId: scheduledNotification.groupId,
        segmentId: scheduledNotification.segmentId,
        entityType: scheduledNotification.entityType,
        entityId: scheduledNotification.entityId,
        metadata: scheduledNotification.metadata,
        status: 'PENDING',
      },
    });
    
    return nextNotification;
  } catch (error) {
    console.error('Error scheduling next occurrence:', error);
    return null;
  }
}

// Helper to create a one-time scheduled notification
export async function scheduleNotification({
  type,
  content,
  scheduledFor,
  recipientId,
  groupId,
  priority = 'NORMAL',
  channels = 'IN_APP,PUSH',
  metadata,
  entityType,
  entityId,
}: {
  type: NotificationType;
  content: string;
  scheduledFor: Date;
  recipientId?: string;
  groupId?: string;
  priority?: NotificationPriority;
  channels?: string;
  metadata?: any;
  entityType?: string;
  entityId?: string;
}) {
  try {
    // Validate that either recipientId or groupId is provided
    if (!recipientId && !groupId) {
      throw new Error('Either recipientId or groupId must be provided');
    }
    
    // Create the scheduled notification
    const scheduledNotification = await prisma.scheduledNotification.create({
      data: {
        type,
        content,
        scheduledFor,
        recipientId,
        groupId,
        recurring: false,
        channels,
        priority,
        status: 'PENDING',
        metadata: metadata || undefined,
        entityType,
        entityId,
      },
    });
    
    return {
      success: true,
      scheduledNotification,
    };
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Helper to create a recurring scheduled notification
export async function scheduleRecurringNotification({
  type,
  content,
  startDate,
  recurrencePattern,
  endDate,
  recipientId,
  groupId,
  priority = 'NORMAL',
  channels = 'IN_APP,PUSH',
  metadata,
  entityType,
  entityId,
}: {
  type: NotificationType;
  content: string;
  startDate: Date;
  recurrencePattern: string;
  endDate?: Date;
  recipientId?: string;
  groupId?: string;
  priority?: NotificationPriority;
  channels?: string;
  metadata?: any;
  entityType?: string;
  entityId?: string;
}) {
  try {
    // Validate that either recipientId or groupId is provided
    if (!recipientId && !groupId) {
      throw new Error('Either recipientId or groupId must be provided');
    }
    
    // Validate the cron pattern
    try {
      cronParser.parseExpression(recurrencePattern);
    } catch (error) {
      throw new Error(`Invalid cron expression: ${error.message}`);
    }
    
    // Create the scheduled notification
    const scheduledNotification = await prisma.scheduledNotification.create({
      data: {
        type,
        content,
        scheduledFor: startDate,
        recipientId,
        groupId,
        recurring: true,
        recurrencePattern,
        recurrenceEnd: endDate,
        channels,
        priority,
        status: 'PENDING',
        metadata: metadata || undefined,
        entityType,
        entityId,
      },
    });
    
    return {
      success: true,
      scheduledNotification,
    };
  } catch (error) {
    console.error('Error scheduling recurring notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Helper to cancel a scheduled notification
export async function cancelScheduledNotification(id: string) {
  try {
    // Update the scheduled notification status to CANCELLED
    const updatedNotification = await prisma.scheduledNotification.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
    
    return {
      success: true,
      notification: updatedNotification,
    };
  } catch (error) {
    console.error('Error cancelling scheduled notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}