import { NextResponse } from 'next/server';
import { createCallerFactory } from '@/lib/trpc/server';
import { appRouter } from '@/lib/trpc/root';
import { db } from '@/lib/db';

/**
 * This is a special debug endpoint that accesses tRPC procedures directly
 * to help diagnose issues with tRPC vs database access
 */
export async function GET() {
  try {
    console.log("tRPC debug API called");
    
    // Create a caller for direct procedure access
    const createCaller = createCallerFactory(appRouter);
    const caller = createCaller({
      db,
      session: null,
      req: null as any,
      res: null as any,
    });
    
    // Get basic database info
    const userCount = await db.user.count();
    const postCount = await db.post.count();
    console.log(`Database has ${userCount} users and ${postCount} posts`);
    
    // Test results
    const results: Record<string, any> = {
      dbStats: {
        userCount,
        postCount
      }
    };
    
    // Try standard post.getAll
    try {
      console.log("Calling post.getAll");
      const standardPosts = await caller.post.getAll({ limit: 10 });
      console.log(`post.getAll returned ${standardPosts.posts.length} posts`);
      results.postGetAll = {
        success: true,
        postCount: standardPosts.posts.length,
        posts: standardPosts.posts.map(p => ({ id: p.id, content: p.content })),
      };
    } catch (error) {
      console.error("Error in post.getAll:", error);
      results.postGetAll = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Try simplified version as a diagnostic
    try {
      console.log("Calling postSimplified.getAll");
      const simplifiedPosts = await caller.postSimplified.getAll({ limit: 10 });
      console.log(`postSimplified.getAll returned ${simplifiedPosts.posts.length} posts`);
      results.postSimplifiedGetAll = {
        success: true,
        postCount: simplifiedPosts.posts.length,
        posts: simplifiedPosts.posts.map(p => ({ id: p.id, content: p.content })),
      };
    } catch (error) {
      console.error("Error in postSimplified.getAll:", error);
      results.postSimplifiedGetAll = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
    
    // Try using the getById method if post.getAll found anything
    if (results.postGetAll?.success && results.postGetAll?.postCount > 0) {
      try {
        const firstPostId = results.postGetAll.posts[0].id;
        console.log(`Calling post.getById with ID ${firstPostId}`);
        const postById = await caller.post.getById({ id: firstPostId });
        results.postGetById = {
          success: true,
          post: {
            id: postById.id,
            content: postById.content,
            userId: postById.userId,
          }
        };
      } catch (error) {
        console.error("Error in post.getById:", error);
        results.postGetById = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
    
    // Try the fallback router if available
    try {
      console.log("Calling postFallback.getAll");
      const fallbackPosts = await caller.postFallback.getAll({ limit: 10 });
      results.postFallbackGetAll = {
        success: true,
        postCount: fallbackPosts.posts.length,
        posts: fallbackPosts.posts.map(p => ({ id: p.id, content: p.content })),
      };
    } catch (error) {
      console.error("Error in postFallback.getAll:", error);
      results.postFallbackGetAll = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error in tRPC debug endpoint:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}