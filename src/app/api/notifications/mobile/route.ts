import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendMobilePushNotification, sendTestMobilePushNotification } from '@/lib/mobile-push-service';

// POST endpoint to register a mobile device and send a test notification
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
    const { deviceToken, platform, deviceName, deviceModel, osVersion, appVersion, sendTestNotification } = body;

    if (!deviceToken || !platform) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: deviceToken and platform' },
        { status: 400 }
      );
    }

    // Validate platform
    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json(
        { success: false, message: 'Platform must be ios or android' },
        { status: 400 }
      );
    }

    // Check if the device is already registered
    let device = await prisma.pushDevice.findUnique({
      where: { deviceToken },
    });

    if (device) {
      // If device exists but belongs to another user, update it
      if (device.userId !== session.user.id) {
        device = await prisma.pushDevice.update({
          where: { deviceToken },
          data: {
            userId: session.user.id,
            platform,
            deviceName,
            deviceModel,
            osVersion,
            appVersion,
            isActive: true,
            lastActive: new Date(),
          },
        });
      } else {
        // Otherwise just update the last active time
        device = await prisma.pushDevice.update({
          where: { deviceToken },
          data: {
            platform,
            deviceName,
            deviceModel,
            osVersion,
            appVersion,
            isActive: true,
            lastActive: new Date(),
          },
        });
      }
    } else {
      // Create a new device registration
      device = await prisma.pushDevice.create({
        data: {
          deviceToken,
          platform,
          deviceName,
          deviceModel,
          osVersion,
          appVersion,
          userId: session.user.id,
          isActive: true,
        },
      });
    }

    // Update user notification preferences to enable push
    const userPreferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    if (!userPreferences) {
      await prisma.notificationPreference.create({
        data: {
          userId: session.user.id,
          pushEnabled: true,
        },
      });
    } else if (!userPreferences.pushEnabled) {
      await prisma.notificationPreference.update({
        where: { userId: session.user.id },
        data: {
          pushEnabled: true,
        },
      });
    }

    // Send a test notification if requested
    let testResult = null;
    if (sendTestNotification) {
      testResult = await sendTestMobilePushNotification(
        session.user.id,
        'მობილური შეტყობინებების რეგისტრაცია წარმატებულია!'
      );
    }

    return NextResponse.json({
      success: true,
      device,
      testNotification: testResult,
    });
  } catch (error) {
    console.error('Error registering mobile device:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to get all registered mobile devices for a user
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
    
    // Get all mobile devices for the user
    const devices = await prisma.pushDevice.findMany({
      where: {
        userId: session.user.id,
        platform: {
          in: ['ios', 'android'],
        },
      },
      orderBy: {
        lastActive: 'desc',
      },
    });
    
    // Count active devices
    const activeDevices = devices.filter(device => device.isActive);
    
    return NextResponse.json({
      success: true,
      devices,
      deviceCount: devices.length,
      activeDeviceCount: activeDevices.length,
    });
  } catch (error) {
    console.error('Error fetching mobile devices:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE endpoint to unregister a mobile device
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the device token from the query parameters
    const { searchParams } = new URL(req.url);
    const deviceToken = searchParams.get('deviceToken');
    
    if (!deviceToken) {
      return NextResponse.json(
        { success: false, message: 'Missing deviceToken parameter' },
        { status: 400 }
      );
    }
    
    // Check if the device belongs to the current user
    const device = await prisma.pushDevice.findFirst({
      where: {
        deviceToken,
        userId: session.user.id,
      },
    });
    
    if (!device) {
      return NextResponse.json(
        { success: false, message: 'Device not found or does not belong to the current user' },
        { status: 404 }
      );
    }
    
    // Update the device to inactive (we keep the record for analytics)
    await prisma.pushDevice.update({
      where: { id: device.id },
      data: { isActive: false },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unregistering mobile device:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}