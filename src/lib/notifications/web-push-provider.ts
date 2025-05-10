import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { 
  NotificationProvider, 
  NotificationPayload, 
  NotificationResult, 
  BulkNotificationResult 
} from '../interfaces/notification-provider';

/**
 * WebPushNotificationProvider
 * 
 * A concrete implementation of the NotificationProvider interface for Web Push notifications.
 */
export class WebPushNotificationProvider implements NotificationProvider {
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private vapidContact: string;

  constructor(config?: { 
    vapidPublicKey?: string;
    vapidPrivateKey?: string;
    vapidContact?: string;
  }) {
    // Use provided config or defaults
    this.vapidPublicKey = config?.vapidPublicKey || 
      process.env.VAPID_PUBLIC_KEY || 
      'BJthRQ5myDgc7OSXzPCMftGw-n16F7zQBEN7EUD6XxcfTTvrLGWSIG7y_JxiWtVlCFua0S8MTB5rPziBqNx1qIo';
      
    this.vapidPrivateKey = config?.vapidPrivateKey || 
      process.env.VAPID_PRIVATE_KEY || 
      'LUlRtGHYE69RdLPR9qrEhDyLGqN9YVDzzPG9jG4Y9YQ';
      
    this.vapidContact = config?.vapidContact || 
      process.env.VAPID_CONTACT || 
      'mailto:support@dapdip.com';

    // Initialize web-push with VAPID details
    webpush.setVapidDetails(
      this.vapidContact,
      this.vapidPublicKey,
      this.vapidPrivateKey
    );
  }

  getName(): string {
    return 'web-push';
  }

  /**
   * Format the notification for web push
   */
  private formatNotification(notification: NotificationPayload): any {
    return {
      title: notification.title,
      body: notification.body,
      icon: notification.imageUrl || '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id || `notification-${Date.now()}`,
      data: {
        url: notification.actionUrl || '/',
        ...notification.data,
      },
      actions: notification.isActionable ? [
        {
          action: 'view',
          title: notification.actionLabel || 'ნახვა',
        }
      ] : [],
    };
  }

  /**
   * Send a web push notification to a user
   */
  async send(userId: string, notification: NotificationPayload): Promise<NotificationResult> {
    try {
      // Get active web push devices for the user
      const devices = await prisma.pushDevice.findMany({
        where: {
          userId,
          isActive: true,
          platform: 'web',
        },
      });

      if (!devices.length) {
        return { success: false, deviceCount: 0, error: 'No active web devices found' };
      }

      // Format the notification
      const payload = this.formatNotification(notification);

      // Track results
      const results = [];
      const failedDevices = [];

      // Send to each device
      for (const device of devices) {
        try {
          // Parse the subscription
          const subscription = JSON.parse(device.deviceToken);
          
          // Send the notification
          await webpush.sendNotification(
            subscription,
            JSON.stringify(payload)
          );
          
          // Track successful send
          results.push({
            deviceId: device.id,
            success: true,
          });
          
          // Log the notification delivery
          if (notification.id) {
            // Create notification log entry
            await prisma.notificationLog.create({
              data: {
                notificationId: notification.id,
                userId,
                channel: 'PUSH',
                event: 'delivered',
                deviceId: device.id,
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
          console.error(`Error sending web push to device ${device.id}:`, error);
          
          // If subscription is invalid, mark device as inactive
          if (error instanceof webpush.WebPushError && error.statusCode === 410) {
            await prisma.pushDevice.update({
              where: { id: device.id },
              data: { isActive: false },
            });
          }
          
          // Track failed send
          failedDevices.push({
            deviceId: device.id,
            error: error.message,
          });
          
          // Log the failed notification
          if (notification.id) {
            await prisma.notificationLog.create({
              data: {
                notificationId: notification.id,
                userId,
                channel: 'PUSH',
                event: 'delivered',
                deviceId: device.id,
                success: false,
                errorMessage: error.message,
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
      console.error('Error sending web push notification:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error' 
      };
    }
  }

  /**
   * Send a web push notification to multiple users
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
      console.error('Error sending bulk web push notifications:', error);
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
   * Check if web push is enabled for a user
   */
  async isEnabledForUser(userId: string): Promise<boolean> {
    try {
      // Count active web push devices for the user
      const count = await prisma.pushDevice.count({
        where: {
          userId,
          isActive: true,
          platform: 'web',
        },
      });
      
      return count > 0;
    } catch (error) {
      console.error('Error checking if web push is enabled:', error);
      return false;
    }
  }

  /**
   * Get the user's web push devices
   */
  async getUserDevices(userId: string): Promise<Array<{
    id: string;
    type: string;
    name?: string;
    lastActive?: Date;
  }>> {
    try {
      // Get active web push devices for the user
      const devices = await prisma.pushDevice.findMany({
        where: {
          userId,
          platform: 'web',
        },
        select: {
          id: true,
          deviceName: true,
          lastActive: true,
          isActive: true,
        },
      });
      
      // Format the devices
      return devices.map(device => ({
        id: device.id,
        type: 'web',
        name: device.deviceName || 'Web Browser',
        lastActive: device.lastActive || undefined,
      }));
    } catch (error) {
      console.error('Error getting user web push devices:', error);
      return [];
    }
  }

  /**
   * Get the VAPID public key
   */
  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }
}