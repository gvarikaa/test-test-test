import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Simple API endpoint to directly fetch posts from the database
 * This bypasses tRPC and personalization to help debug data access issues
 */
export async function GET() {
  try {
    console.log("Debug posts API called");
    
    // Get a count of total posts first
    const totalPostCount = await db.post.count();
    console.log(`Database has ${totalPostCount} total posts`);

    // Check for users
    const userCount = await db.user.count();
    console.log(`Database has ${userCount} total users`);

    // Try to get a sample user
    const firstUser = await db.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    if (firstUser) {
      console.log(`Found a sample user: ${firstUser.name}`);
    } else {
      console.log("No users found in database");
    }

    // Fetch posts with a more simplified query to avoid Prisma errors
    const posts = await db.post.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        // Only include essential relationships
        media: true,
        _count: {
          select: {
            reactions: true,
            comments: true,
          },
        },
      },
    });

    console.log(`Successfully fetched ${posts.length} posts`);
    
    if (posts.length > 0) {
      console.log("Sample post content:", posts[0].content);
    }

    return NextResponse.json({
      success: true,
      count: posts.length,
      totalPosts: totalPostCount,
      userCount,
      firstUser,
      databaseConnected: true,
      posts,
    });
  } catch (error) {
    console.error('Error in debug-posts API:', error);
    
    // Try to get a more detailed error message
    let errorDetail = "Unknown error";
    let errorStack = undefined;
    
    if (error instanceof Error) {
      errorDetail = error.message;
      errorStack = error.stack;
      
      // Log additional details for Prisma errors
      if ('code' in error) {
        console.error('Prisma error code:', (error as any).code);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorDetail,
      stack: errorStack,
      databaseConnected: false
    }, { status: 500 });
  }
}