import { prisma } from '@/lib/db';
import { 
  NotificationProvider, 
  NotificationPayload, 
  NotificationResult, 
  BulkNotificationResult,
  NotificationPriority
} from '../interfaces/notification-provider';

// Mobile push notification types
type PushProvider = 'FCM' | 'APNS';

/**
 * MobilePushNotificationProvider
 * 
 * A concrete implementation of the NotificationProvider interface for Mobile Push notifications.
 * Supports both iOS (APNS) and Android (FCM) platforms.
 */
export class MobilePushNotificationProvider implements NotificationProvider {
  private fcmApiKey: string;
  private apnsKeyId: string;
  private apnsTeamId: string;
  private apnsKey: string;

  constructor(config?: {
    fcmApiKey?: string;
    apnsKeyId?: string;
    apnsTeamId?: string;
    apnsKey?: string;
  }) {
    // Use provided config or defaults
    this.fcmApiKey = config?.fcmApiKey || 
      process.env.FCM_API_KEY || 
      'mock-fcm-api-key';
      
    this.apnsKeyId = config?.apnsKeyId || 
      process.env.APNS_KEY_ID || 
      'mock-apns-key-id';
      
    this.apnsTeamId = config?.apnsTeamId || 
      process.env.APNS_TEAM_ID || 
      'mock-apns-team-id';
      
    this.apnsKey = config?.apnsKey || 
      process.env.APNS_KEY || 
      'mock-apns-key';
  }

  getName(): string {
    return 'mobile-push';
  }

  /**
   * Format notification for FCM (Firebase Cloud Messaging)
   */
  private formatFCMNotification(
    deviceToken: string,
    notification: NotificationPayload,
    unreadCount: number
  ): any {
    const priority = this.mapPriority(notification.priority);
    const soundType = notification.priority === 'URGENT' ? 'critical' : 'default';

    return {
      to: deviceToken,
      priority: priority === 'high' ? 'high' : 'normal',
      notification: {
        title: notification.title,
        body: notification.body,
        sound: soundType,
        badge: unreadCount,
        icon: 'notification_icon',
        android_channel_id: 'default',
        click_action: notification.actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
      },
      data: {
        notificationId: notification.id,
        type: notification.type,
        priority: notification.priority || 'NORMAL',
        url: notification.actionUrl || '',
        isActionable: notification.isActionable ? 'true' : 'false',
        actionLabel: notification.actionLabel || '',
        actionUrl: notification.actionUrl || '',
        title: notification.title,
        body: notification.body,
        ...notification.data,
      },
      android: {
        priority: priority === 'high' ? 'high' : 'normal',
        ttl: 3600000, // 1 hour in milliseconds
        notification: {
          icon: 'notification_icon',
          color: '#4285F4',
          sound: soundType,
          channel_id: 'default',
          click_action: notification.actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        headers: {
          'apns-priority': priority === 'high' ? '10' : '5',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            badge: unreadCount,
            sound: soundType,
            'mutable-content': 1,
            'content-available': 1,
            'category': 'default',
          },
          notificationId: notification.id,
          type: notification.type,
          url: notification.actionUrl || '',
          ...notification.data,
        },
      },
    };
  }

  /**
   * Format notification for APNS (Apple Push Notification Service)
   */
  private formatAPNSNotification(
    deviceToken: string,
    notification: NotificationPayload,
    unreadCount: number
  ): any {
    const soundType = notification.priority === 'URGENT' ? 'critical.caf' : 'default';

    return {
      aps: {
        alert: {
          title: notification.title,
          body: notification.body,
        },
        badge: unreadCount,
        sound: soundType,
        'mutable-content': 1,
        'content-available': 1,
        category: 'default',
      },
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority || 'NORMAL',
      url: notification.actionUrl || '',
      isActionable: notification.isActionable || false,
      actionLabel: notification.actionLabel || '',
      actionUrl: notification.actionUrl || '',
      ...notification.data,
    };
  }

  /**
   * Map NotificationPriority to FCM/APNS priority
   */
  private mapPriority(priority?: NotificationPriority): 'normal' | 'high' {
    if (!priority) return 'normal';
    
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return 'high';
      case 'NORMAL':
      case 'LOW':
      default:
        return 'normal';
    }
  }

  /**
   * Send a mobile push notification to a user
   */
  async send(userId: string, notification: NotificationPayload): Promise<NotificationResult> {
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
        return { success: false, deviceCount: 0, error: 'No active mobile devices found' };
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
          let provider: PushProvider;
          let payload: any;

          // Format payload based on platform
          if (device.platform === 'ios') {
            provider = 'APNS';
            payload = this.formatAPNSNotification(
              device.deviceToken,
              notification,
              unreadCount
            );
          } else {
            provider = 'FCM';
            payload = this.formatFCMNotification(
              device.deviceToken,
              notification,
              unreadCount
            );
          }

          // In a real implementation, this would call the actual push service
          // For this implementation, we'll simulate a successful response
          /*
          const response = await axios.post(
            provider === 'FCM' ? 'https://fcm.googleapis.com/fcm/send' : `https://api.push.apple.com/3/device/${device.deviceToken}`,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': provider === 'FCM' ? `key=${this.fcmApiKey}` : `bearer ${this.getApnsAuthToken()}`,
              },
            }
          );
          */

          // Simulate successful response
          const response = { status: 200, data: { success: 1 } };

          // Track successful send
          results.push({
            deviceId: device.id,
            success: true,
          });

          // Log the notification if it has an ID
          if (notification.id) {
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
          }
        } catch (error) {
          console.error(`Error sending mobile push to device ${device.id}:`, error);

          // Track failed send
          failedDevices.push({
            deviceId: device.id,
            error: error.message || 'Unknown error',
          });

          // Log the failed notification if it has an ID
          if (notification.id) {
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
      }

      return {
        success: results.length > 0,
        deviceCount: devices.length,
        failedCount: failedDevices.length,
        results: [...results, ...failedDevices.map(d => ({ deviceId: d.deviceId, success: false, error: d.error }))],
      };
    } catch (error) {
      console.error('Error sending mobile push notification:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error' 
      };
    }
  }

  /**
   * Send a mobile push notification to multiple users
   */
  async sendBulk(userIds: string[], notification: NotificationPayload): Promise<BulkNotificationResult> {
    try {
      // Call send for each user
      const results = await Promise.all(
        userIds.map(userId => this.send(userId, notification))
      );
      
      // Aggregate results
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount > 0,
        totalCount: userIds.length,
        successCount,
        failedCount: userIds.length - successCount,
        results: results.flatMap(r => r.results || []),
      };
    } catch (error) {
      console.error('Error sending bulk mobile push notifications:', error);
      return {
        success: false,
        totalCount: userIds.length,
        successCount: 0,
        failedCount: userIds.length,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Check if mobile push is enabled for a user
   */
  async isEnabledForUser(userId: string): Promise<boolean> {
    try {
      // Count active mobile devices for the user
      const count = await prisma.pushDevice.count({
        where: {
          userId,
          isActive: true,
          platform: {
            in: ['ios', 'android'],
          },
        },
      });
      
      return count > 0;
    } catch (error) {
      console.error('Error checking if mobile push is enabled:', error);
      return false;
    }
  }

  /**
   * Get the user's mobile devices
   */
  async getUserDevices(userId: string): Promise<Array<{
    id: string;
    type: string;
    name?: string;
    lastActive?: Date;
  }>> {
    try {
      // Get active mobile devices for the user
      const devices = await prisma.pushDevice.findMany({
        where: {
          userId,
          platform: {
            in: ['ios', 'android'],
          },
        },
        select: {
          id: true,
          platform: true,
          deviceName: true,
          lastActive: true,
          isActive: true,
        },
      });
      
      // Format the devices
      return devices.map(device => ({
        id: device.id,
        type: device.platform,
        name: device.deviceName || `${device.platform.charAt(0).toUpperCase()}${device.platform.slice(1)} Device`,
        lastActive: device.lastActive || undefined,
      }));
    } catch (error) {
      console.error('Error getting user mobile devices:', error);
      return [];
    }
  }

  /**
   * Generate an APNS authentication token (mock implementation)
   */
  private getApnsAuthToken(): string {
    // In a real implementation, this would generate a JWT token
    // using the APNS key, key ID, and team ID
    return 'mock-apns-auth-token';
  }
}