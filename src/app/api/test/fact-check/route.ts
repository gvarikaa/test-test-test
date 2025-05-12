import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeContent } from '@/lib/reality-check';

/**
 * Advanced fact-checking API endpoint
 * Analyzes a post's content for truthfulness and reality alignment
 */
export async function GET(request: Request) {
  try {
    // Parse post ID from query string
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({
        success: false,
        error: 'Post ID is required as a query parameter'
      }, { status: 400 });
    }

    // Fetch the post with media
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        },
        media: true,
        _count: {
          select: {
            reactions: true,
            comments: true,
          }
        },
      }
    });

    if (!post) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 });
    }

    // Extract media URLs for analysis
    const mediaUrls = post.media.map(m => m.url);

    // Convert external URLs to base64 if needed
    const preparedMediaUrls = [];
    if (mediaUrls && mediaUrls.length > 0) {
      try {
        for (const url of mediaUrls) {
          if (url.startsWith('data:')) {
            // Already a data URL, use as is
            preparedMediaUrls.push(url);
          } else {
            // Try to convert external URL to data URL
            const prepareResult = await fetch(`${new URL(request.url).origin}/api/test/prepare-media?url=${encodeURIComponent(url)}`);
            if (prepareResult.ok) {
              const data = await prepareResult.json();
              if (data.success && data.dataUrl) {
                preparedMediaUrls.push(data.dataUrl);
              } else {
                console.warn("Failed to prepare media URL:", url, data.error);
                preparedMediaUrls.push(url); // Use original as fallback
              }
            } else {
              console.warn("Media preparation service error:", await prepareResult.text());
              preparedMediaUrls.push(url); // Use original as fallback
            }
          }
        }
      } catch (error) {
        console.error("Error preparing media for Gemini:", error);
        // Fall back to original URLs if preparation fails
        preparedMediaUrls.push(...mediaUrls);
      }
    }

    // Perform deep truthfulness analysis with Gemini
    console.log(`Analyzing content with Gemini (${preparedMediaUrls.length} media items)...`);
    const realityCheck = await analyzeContent(post.content, preparedMediaUrls);
    
    // Calculate an overall credibility score
    const credibilityFactors = {
      accountAge: 100, // Placeholder - would calculate based on account age
      previousReliability: 85, // Placeholder - would calculate based on user history
      consistencyScore: 90, // Placeholder - consistency with user's past content
    };
    
    // Format timestamp
    const publishedTime = new Date(post.createdAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Return comprehensive analysis
    return NextResponse.json({
      success: true,
      postId: post.id,
      authorName: post.user.name,
      authorUsername: post.user.username,
      content: post.content,
      publishedAt: publishedTime,
      mediaCount: post.media.length,
      mediaUrls,
      
      // Detailed reality check results
      realityCheck,
      
      // Source credibility assessment
      sourceCredibility: {
        authorFactors: credibilityFactors,
        overallSourceScore: Math.round((credibilityFactors.accountAge + 
                                      credibilityFactors.previousReliability + 
                                      credibilityFactors.consistencyScore) / 3)
      }
    });
    
  } catch (error) {
    console.error('Error performing reality check:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}