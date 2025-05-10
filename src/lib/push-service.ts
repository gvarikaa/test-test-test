import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { NotificationType, NotificationPriority } from '@prisma/client';

// In a real application, these would be environment variables
// These are placeholder keys for implementation only
const VAPID_PUBLIC_KEY = 'BJthRQ5myDgc7OSXzPCMftGw-n16F7zQBEN7EUD6XxcfTTvrLGWSIG7y_JxiWtVlCFua0S8MTB5rPziBqNx1qIo';
const VAPID_PRIVATE_KEY = 'LUlRtGHYE69RdLPR9qrEhDyLGqN9YVDzzPG9jG4Y9YQ';

// Set up webpush with VAPID details
webpush.setVapidDetails(
  'mailto:support@dapdip.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Function to format notification content for push
const formatPushNotification = (notification: any) => {
  // Get a title based on notification type
  let title = 'DapDip';
  let body = notification.content || 'ახალი შეტყობინება';
  
  switch (notification.type) {
    case 'FOLLOW':
      title = 'ახალი მიმდევარი';
      break;
    case 'LIKE':
      title = 'ახალი მოწონება';
      break;
    case 'COMMENT':
      title = 'ახალი კომენტარი';
      break;
    case 'MENTION':
      title = 'ვიღაცამ მოგიხსენიათ';
      break;
    case 'FRIEND_REQUEST':
      title = 'მეგობრობის მოთხოვნა';
      break;
    case 'MESSAGE':
      title = 'ახალი შეტყობინება';
      break;
    case 'GROUP_INVITE':
      title = 'მოწვევა ჯგუფში';
      break;
    case 'GROUP_POST':
      title = 'ახალი პოსტი ჯგუფში';
      break;
    case 'SECURITY_ALERT':
      title = 'უსაფრთხოების შეტყობინება!';
      break;
    default:
      if (notification.type.startsWith('GROUP_')) {
        title = 'შეტყობინება ჯგუფიდან';
      } else if (notification.type.startsWith('PAGE_')) {
        title = 'შეტყობინება გვერდიდან';
      }
  }
  
  // Notification payload
  return {
    title,
    body,
    icon: notification.imageUrl || '/favicon.ico',
    badge: '/favicon.ico',
    tag: notification.id,
    url: notification.url || notification.actionUrl || '/',
    notificationId: notification.id,
    priority: notification.priority || 'NORMAL',
    actions: notification.isActionable ? [
      {
        action: 'view',
        title: notification.actionLabel || 'ნახვა',
      }
    ] : [],
  };
};

// Function to send push notification to a user
export const sendPushNotification = async (
  userId: string,
  notification: any
) => {
  try {
    // Get all active push devices for the user
    const devices = await prisma.pushDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!devices.length) {
      return { success: false, message: 'No active devices found' };
    }

    // Format notification for push
    const payload = formatPushNotification(notification);

    // Track successful sends
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
      } catch (error) {
        console.error(`Error sending push to device ${device.id}:`, error);
        
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
        
        // Create notification log entry for failed delivery
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

    return {
      success: true,
      results,
      failedDevices,
      sentCount: results.length,
      failedCount: failedDevices.length,
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

// Function to send a test push notification
export const sendTestPushNotification = async (userId: string, content: string = 'ეს არის ტესტური შეტყობინება') => {
  try {
    // Create a test notification
    const notification = {
      id: `test-${Date.now()}`,
      type: 'SYSTEM',
      content,
      priority: 'NORMAL',
      isActionable: true,
      actionLabel: 'ნახვა',
      actionUrl: '/',
      url: '/',
    };
    
    // Send the push notification
    return await sendPushNotification(userId, notification);
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return { success: false, error: error.message };
  }
};