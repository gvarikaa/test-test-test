import { NextRequest, NextResponse } from 'next/server';
import { processScheduledNotifications } from '@/lib/notification-scheduler';

// Secret key for authentication (in a real app, this would be an environment variable)
const CRON_SECRET = 'some-secret-key';

// POST endpoint to trigger the notification scheduler
export async function POST(req: NextRequest) {
  try {
    // Check authorization
    const authorization = req.headers.get('authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const token = authorization.substring(7);
    
    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 403 }
      );
    }
    
    // Process scheduled notifications
    const result = await processScheduledNotifications();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in notification scheduler cron job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for health check (can be used to verify the endpoint is working)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    message: 'Notification scheduler is ready',
  });
}