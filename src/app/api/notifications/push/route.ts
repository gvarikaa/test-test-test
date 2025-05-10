import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendPushNotification, sendTestPushNotification } from '@/lib/push-service';

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
    const { recipientId, notificationId, isTest, content } = body;
    
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
      
      // Send test notification
      const result = await sendTestPushNotification(recipientId, content || undefined);
      return NextResponse.json(result);
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
      
      // Send push notification
      const result = await sendPushNotification(
        notification.recipientId,
        notification
      );
      
      return NextResponse.json(result);
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
    
    // Get active push devices for the user
    const devices = await prisma.pushDevice.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      pushEnabled: devices.length > 0,
      deviceCount: devices.length,
      devices: devices.map(device => ({
        id: device.id,
        platform: device.platform,
        deviceName: device.deviceName,
        lastActive: device.lastActive,
      })),
    });
  } catch (error) {
    console.error('Error checking push notification status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}