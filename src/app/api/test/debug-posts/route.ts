import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Simple API endpoint to directly fetch posts from the database
 * This bypasses tRPC and personalization to help debug data access issues
 */
export async function GET() {
  try {
    // Get a count of total posts first
    const totalPostCount = await db.post.count();

    // Check for users
    const userCount = await db.user.count();

    // Try to get a sample user
    const firstUser = await db.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    // Fetch posts directly from the database
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
        media: true,
        _count: {
          select: {
            reactions: true,
            comments: true,
          },
        },
      },
    });

    // Log for debugging
    console.log(`Found ${posts.length} posts directly from database out of ${totalPostCount} total posts`);
    console.log(`Database has ${userCount} users`);
    if (firstUser) {
      console.log(`Sample user: ${firstUser.name} (${firstUser.email})`);
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
    console.error('Error fetching posts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      databaseConnected: false
    }, { status: 500 });
  }
}