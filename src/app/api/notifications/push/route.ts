import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notification-service';

// Create a singleton instance of the NotificationService
// This is a common pattern with DIP - create the instance at the composition root
const notificationService = new NotificationService();

// POST endpoint to send a push notification
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      recipientId, 
      notificationId, 
      isTest, 
      title, 
      body: content,
      providers
    } = body;
    
    // Verify permissions - a user can only send test notifications to themselves
    // For other notifications, check admin permissions
    const isAdmin = session.user.email === 'admin@dapdip.com'; // In a real app, check actual roles
    
    if (isTest) {
      // For test notifications, make sure user is sending to themselves
      if (recipientId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'You can only send test notifications to yourself' },
          { status: 403 }
        );
      }
      
      // Send test notification using the service
      const result = await notificationService.sendTestNotification(
        recipientId, 
        { 
          title: title || 'ტესტური შეტყობინება', 
          body: content || 'ეს არის ტესტური შეტყობინება',
          providerNames: providers
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Test notification sent',
        results: result
      });
    } else {
      // For real notifications, check admin permissions
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 403 }
        );
      }
      
      // Get notification data
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
      
      if (!notification) {
        return NextResponse.json(
          { success: false, message: 'Notification not found' },
          { status: 404 }
        );
      }
      
      // Format notification payload
      const payload = {
        id: notification.id,
        title: notification.title || getDefaultTitle(notification.type),
        body: notification.content || 'ახალი შეტყობინება',
        type: notification.type,
        priority: notification.priority,
        isActionable: notification.isActionable,
        actionLabel: notification.actionLabel,
        actionUrl: notification.actionUrl || notification.url,
        imageUrl: notification.imageUrl,
        data: notification.data || {},
      };
      
      // Send notification using the service
      const result = await notificationService.sendNotification(
        notification.recipientId,
        payload,
        providers
      );
      
      return NextResponse.json({
        success: true,
        message: 'Notification sent',
        results: result
      });
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check push notification status
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get enabled providers and all devices for this user
    const enabledProviders = await notificationService.getEnabledProvidersForUser(session.user.id);
    const allDevices = await notificationService.getUserDevices(session.user.id);
    
    // Format the response
    return NextResponse.json({
      success: true,
      enabledProviders,
      providerStatus: Object.fromEntries(
        Object.entries(allDevices).map(([provider, devices]) => [
          provider, { 
            enabled: enabledProviders.includes(provider),
            deviceCount: devices.length, 
            devices 
          }
        ])
      ),
    });
  } catch (error) {
    console.error('Error checking push notification status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get a title based on notification type
function getDefaultTitle(type: string): string {
  switch (type) {
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
      if (type?.startsWith?.('GROUP_')) {
        return 'შეტყობინება ჯგუფიდან';
      } else if (type?.startsWith?.('PAGE_')) {
        return 'შეტყობინება გვერდიდან';
      }
      return 'DapDip';
  }
}