import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { 
  scheduleNotification, 
  scheduleRecurringNotification, 
  cancelScheduledNotification 
} from '@/lib/notification-scheduler';

// Check if user is admin (simple implementation)
const isAdmin = async (email?: string | null) => {
  if (!email) return false;
  const adminEmails = ['admin@dapdip.com', 'moderator@dapdip.com'];
  return adminEmails.includes(email);
};

// GET endpoint to list all scheduled notifications
export async function GET(req: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Fetch all scheduled notifications
    const notifications = await prisma.scheduledNotification.findMany({
      orderBy: [
        { status: 'asc' },
        { scheduledFor: 'asc' },
      ],
    });
    
    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching scheduled notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new scheduled notification
export async function POST(req: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      type, 
      content, 
      scheduledFor, 
      recipientId, 
      groupId, 
      priority = 'NORMAL',
      recurring = false,
      recurrencePattern,
      recurrenceEnd,
      channels = 'IN_APP,PUSH',
      metadata,
      entityType,
      entityId,
    } = body;
    
    // Validate required fields
    if (!type || !content || !scheduledFor) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: type, content, scheduledFor' },
        { status: 400 }
      );
    }
    
    if (!recipientId && !groupId) {
      return NextResponse.json(
        { success: false, message: 'Either recipientId or groupId is required' },
        { status: 400 }
      );
    }
    
    // If recurring, recurrencePattern is required
    if (recurring && !recurrencePattern) {
      return NextResponse.json(
        { success: false, message: 'recurrencePattern is required for recurring notifications' },
        { status: 400 }
      );
    }
    
    // Create scheduled notification
    let result;
    if (recurring) {
      result = await scheduleRecurringNotification({
        type,
        content,
        startDate: new Date(scheduledFor),
        recurrencePattern,
        endDate: recurrenceEnd ? new Date(recurrenceEnd) : undefined,
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
        scheduledFor: new Date(scheduledFor),
        recipientId,
        groupId,
        priority,
        channels,
        metadata,
        entityType,
        entityId,
      });
    }
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      scheduledNotification: result.scheduledNotification,
    });
  } catch (error) {
    console.error('Error creating scheduled notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT endpoint to cancel a scheduled notification
export async function PUT(req: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Cancel the notification
    const result = await cancelScheduledNotification(id);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      notification: result.notification,
    });
  } catch (error) {
    console.error('Error cancelling scheduled notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a scheduled notification (hard delete, not just cancel)
export async function DELETE(req: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get the notification ID from the query parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the notification exists
    const notification = await prisma.scheduledNotification.findUnique({
      where: { id },
    });
    
    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Delete the notification
    await prisma.scheduledNotification.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting scheduled notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}