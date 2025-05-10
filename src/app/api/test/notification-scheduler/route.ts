import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { scheduleNotification, scheduleRecurringNotification, processScheduledNotifications } from '@/lib/notification-scheduler';

// Test endpoint for notification scheduling functionality
export async function POST(req: NextRequest) {
  try {
    const { type, recipient, group, scheduled, recurring, cron } = await req.json();
    
    let result;

    if (recurring && cron) {
      // Schedule a recurring notification
      const startDate = scheduled ? new Date(scheduled) : new Date(Date.now() + 60000); // Default: 1 minute from now
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // End date 7 days from now
      
      result = await scheduleRecurringNotification({
        type: type || 'SYSTEM',
        content: 'This is a test recurring notification',
        startDate,
        recurrencePattern: cron || '*/5 * * * *', // Default: every 5 minutes
        endDate,
        recipientId: recipient,
        groupId: group,
        priority: 'NORMAL',
        metadata: { test: true, createdAt: new Date().toISOString() },
      });
    } else {
      // Schedule a one-time notification
      const scheduledFor = scheduled ? new Date(scheduled) : new Date(Date.now() + 60000); // Default: 1 minute from now
      
      result = await scheduleNotification({
        type: type || 'SYSTEM',
        content: 'This is a test one-time notification',
        scheduledFor,
        recipientId: recipient,
        groupId: group,
        priority: 'NORMAL',
        metadata: { test: true, createdAt: new Date().toISOString() },
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test notification endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to list scheduled notifications
export async function GET(req: NextRequest) {
  try {
    const scheduled = await prisma.scheduledNotification.findMany({
      take: 10,
      orderBy: { scheduledFor: 'asc' },
    });
    
    // Test processing scheduled notifications
    const processResult = await processScheduledNotifications();
    
    return NextResponse.json({
      scheduled,
      processed: processResult,
    });
  } catch (error) {
    console.error('Error retrieving scheduled notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}