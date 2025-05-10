import { prisma } from '@/lib/db';
import axios from 'axios';

// Mobile push notification types
type PushProvider = 'FCM' | 'APNS';

type MobilePushPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'normal' | 'high';
  image?: string;
  channelId?: string; // Android notification channel
  category?: string; // iOS notification category
  ttl?: number;
  icon?: string;
  clickAction?: string;
  collapseKey?: string;
};

// Mock API endpoints for mobile push services
// In a real application, these would be actual Firebase FCM and Apple APNS endpoints
const PUSH_ENDPOINTS = {
  FCM: 'https://fcm.googleapis.com/fcm/send',
  APNS: 'https://api.push.apple.com/3/device',
};

// Mock API keys for mobile push services
// In a real application, these would be environment variables with actual API keys
const PUSH_API_KEYS = {
  FCM: 'mock-fcm-api-key',
  APNS: 'mock-apns-api-key',
};

// Format notification for FCM (Firebase Cloud Messaging)
const formatFCMNotification = (
  deviceToken: string,
  notification: any,
  unreadCount: number
): any => {
  // Get notification content
  const title = getNotificationTitle(notification);
  const body = notification.content || 'ახალი შეტყობინება';

  // FCM payload
  return {
    to: deviceToken,
    priority: notification.priority === 'HIGH' || notification.priority === 'URGENT' ? 'high' : 'normal',
    notification: {
      title,
      body,
      sound: notification.priority === 'URGENT' ? 'critical' : 'default',
      badge: unreadCount,
      icon: 'notification_icon',
      android_channel_id: 'default',
      click_action: notification.actionUrl || notification.url || 'FLUTTER_NOTIFICATION_CLICK',
    },
    data: {
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority || 'NORMAL',
      url: notification.url || notification.actionUrl || '',
      isActionable: notification.isActionable ? 'true' : 'false',
      actionLabel: notification.actionLabel || '',
      actionUrl: notification.actionUrl || '',
      title,
      body,
    },
    android: {
      priority: notification.priority === 'HIGH' || notification.priority === 'URGENT' ? 'high' : 'normal',
      ttl: 3600000, // 1 hour in milliseconds
      notification: {
        icon: 'notification_icon',
        color: '#4285F4',
        sound: notification.priority === 'URGENT' ? 'critical' : 'default',
        channel_id: 'default',
        click_action: notification.actionUrl || notification.url || 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      headers: {
        'apns-priority': notification.priority === 'HIGH' || notification.priority === 'URGENT' ? '10' : '5',
        'apns-push-type': 'alert',
      },
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          badge: unreadCount,
          sound: notification.priority === 'URGENT' ? 'critical' : 'default',
          'mutable-content': 1,
          'content-available': 1,
          'category': 'default',
        },
        notificationId: notification.id,
        type: notification.type,
        url: notification.url || notification.actionUrl || '',
      },
    },
  };
};

// Format notification for APNS (Apple Push Notification Service)
const formatAPNSNotification = (
  deviceToken: string,
  notification: any,
  unreadCount: number
): any => {
  // Get notification content
  const title = getNotificationTitle(notification);
  const body = notification.content || 'ახალი შეტყობინება';

  // APNS payload
  return {
    aps: {
      alert: {
        title,
        body,
      },
      badge: unreadCount,
      sound: notification.priority === 'URGENT' ? 'critical.caf' : 'default',
      'mutable-content': 1,
      'content-available': 1,
      category: 'default',
    },
    notificationId: notification.id,
    type: notification.type,
    priority: notification.priority || 'NORMAL',
    url: notification.url || notification.actionUrl || '',
    isActionable: notification.isActionable ? true : false,
    actionLabel: notification.actionLabel || '',
    actionUrl: notification.actionUrl || '',
  };
};

// Helper function to determine notification title based on type
const getNotificationTitle = (notification: any): string => {
  switch (notification.type) {
    case 'FOLLOW':
      return 'ახალი მიმდევარი';
    case 'LIKE':
      return 'ახალი მოწონება';
    case 'COMMENT':
      return 'ახალი კომენტარი';
    case 'MENTION':
      return 'ვიღაცამ მოგიხსენიათ';
    case 'FRIEND_REQUEST':
      return 'მეგობრობის მოთხოვნა';
    case 'MESSAGE':
      return 'ახალი შეტყობინება';
    case 'GROUP_INVITE':
      return 'მოწვევა ჯგუფში';
    case 'GROUP_POST':
      return 'ახალი პოსტი ჯგუფში';
    case 'SECURITY_ALERT':
      return 'უსაფრთხოების შეტყობინება!';
    default:
      if (notification.type?.startsWith?.('GROUP_')) {
        return 'შეტყობინება ჯგუფიდან';
      } else if (notification.type?.startsWith?.('PAGE_')) {
        return 'შეტყობინება გვერდიდან';
      }
      return 'DapDip';
  }
};

// Send push notification to a mobile device
export const sendMobilePushNotification = async (
  userId: string,
  notification: any
): Promise<any> => {
  try {
    // Get user's active mobile devices
    const devices = await prisma.pushDevice.findMany({
      where: {
        userId,
        isActive: true,
        platform: {
          in: ['ios', 'android'],
        },
      },
    });

    if (!devices.length) {
      return { success: false, message: 'No active mobile devices found' };
    }

    // Get unread count for badge
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    // Track results
    const results = [];
    const failedDevices = [];

    // Send to each device
    for (const device of devices) {
      try {
        let response;
        let provider: PushProvider;
        let payload: any;

        // Format payload based on platform
        if (device.platform === 'ios') {
          provider = 'APNS';
          payload = formatAPNSNotification(
            device.deviceToken,
            notification,
            unreadCount
          );
        } else {
          provider = 'FCM';
          payload = formatFCMNotification(
            device.deviceToken,
            notification,
            unreadCount
          );
        }

        // In a real implementation, this would call the actual push service
        // For this implementation, we'll simulate a successful response
        /*
        response = await axios.post(
          PUSH_ENDPOINTS[provider],
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${PUSH_API_KEYS[provider]}`,
            },
          }
        );
        */

        // Simulate successful response
        response = { status: 200, data: { success: 1 } };

        // Track successful send
        results.push({
          deviceId: device.id,
          success: true,
          provider,
        });

        // Create notification log entry
        await prisma.notificationLog.create({
          data: {
            notificationId: notification.id,
            userId,
            channel: 'PUSH',
            event: 'delivered',
            deviceId: device.id,
            deviceInfo: {
              platform: device.platform,
              provider,
            },
            success: true,
            timestamp: new Date(),
          },
        });

        // Update notification delivery status
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            deliveryStatus: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`Error sending mobile push to device ${device.id}:`, error);

        // Track failed send
        failedDevices.push({
          deviceId: device.id,
          error: error.message || 'Unknown error',
        });

        // Create notification log entry for failed delivery
        await prisma.notificationLog.create({
          data: {
            notificationId: notification.id,
            userId,
            channel: 'PUSH',
            event: 'delivered',
            deviceId: device.id,
            deviceInfo: {
              platform: device.platform,
            },
            success: false,
            errorMessage: error.message || 'Unknown error',
            timestamp: new Date(),
          },
        });
      }
    }

    return {
      success: true,
      results,
      failedDevices,
      sentCount: results.length,
      failedCount: failedDevices.length,
    };
  } catch (error) {
    console.error('Error sending mobile push notification:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

// Send a test mobile push notification
export const sendTestMobilePushNotification = async (
  userId: string,
  content: string = 'ეს არის ტესტური შეტყობინება',
  priority: string = 'NORMAL'
): Promise<any> => {
  try {
    // Create a test notification
    const notification = {
      id: `test-mobile-${Date.now()}`,
      type: 'SYSTEM',
      content,
      priority,
      isActionable: true,
      actionLabel: 'ნახვა',
      actionUrl: '/',
      url: '/',
    };

    // Send the mobile push notification
    return await sendMobilePushNotification(userId, notification);
  } catch (error) {
    console.error('Error sending test mobile push notification:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};