import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePersonalizedFeed, ContentType } from '@/lib/personalization';

/**
 * Special endpoint to directly test the personalization system without going through tRPC
 */
export async function GET() {
  try {
    console.log("Personalized feed debug API called");
    
    // Get basic database info
    const userCount = await db.user.count();
    const postCount = await db.post.count();
    console.log(`Database has ${userCount} users and ${postCount} posts`);
    
    // Get a sample user for testing
    const sampleUser = await db.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    
    if (!sampleUser) {
      return NextResponse.json({
        success: false,
        error: "No users found in database. Please seed the database first.",
      }, { status: 404 });
    }
    
    console.log(`Using sample user: ${sampleUser.name}`);
    
    // Try to get personalized recommendations
    let recommendations = [];
    let error = null;
    
    try {
      console.log("Calling generatePersonalizedFeed directly");
      recommendations = await generatePersonalizedFeed(
        sampleUser.id,
        ContentType.POST,
        10
      );
      console.log(`generatePersonalizedFeed returned ${recommendations.length} recommendations`);
    } catch (e) {
      console.error("Error in generatePersonalizedFeed:", e);
      error = e instanceof Error ? e.message : "Unknown error";
    }
    
    // Now fetch the actual posts for these recommendations
    let posts = [];
    
    if (recommendations.length > 0) {
      try {
        const postIds = recommendations.map(rec => rec.id);
        
        posts = await db.post.findMany({
          where: {
            id: { in: postIds },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                reactions: true,
                comments: true,
              },
            },
          },
        });
        
        console.log(`Found ${posts.length} posts from recommendations`);
      } catch (e) {
        console.error("Error fetching posts from recommendations:", e);
      }
    }
    
    // If we couldn't get personalized recommendations, fall back to recent posts
    if (recommendations.length === 0 || posts.length === 0) {
      try {
        console.log("Falling back to recent posts");
        posts = await db.post.findMany({
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                reactions: true,
                comments: true,
              },
            },
          },
        });
        
        console.log(`Fetched ${posts.length} recent posts as fallback`);
      } catch (e) {
        console.error("Error fetching fallback posts:", e);
      }
    }
    
    // Return results
    return NextResponse.json({
      success: true,
      user: sampleUser,
      recommendationsCount: recommendations.length,
      postsCount: posts.length,
      personalizationError: error,
      recommendations: recommendations.slice(0, 3), // Just include a sample
      posts: posts.map(p => ({
        id: p.id,
        content: p.content,
        user: p.user,
        createdAt: p.createdAt,
        reactions: p._count.reactions,
        comments: p._count.comments,
      })),
    });
  } catch (error) {
    console.error("Error in personalized feed API:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}