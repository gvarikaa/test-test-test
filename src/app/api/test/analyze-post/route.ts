import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Analyze a post's content and metadata
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

    // Fetch the post with as much related data as possible
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            bio: true,
            createdAt: true,
          }
        },
        media: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            },
            _count: {
              select: {
                reactions: true,
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        aiAnalysis: true,
        _count: {
          select: {
            reactions: true,
            comments: true,
            savedBy: true,
          }
        },
        hashtags: {
          include: {
            topic: true,
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 });
    }

    // Manually collect engagement statistics
    const engagementStats = {
      totalReactions: post._count.reactions,
      totalComments: post._count.comments,
      totalSaves: post._count.savedBy,
      engagementScore: post._count.reactions + post._count.comments * 2 + post._count.savedBy * 3,
      reactionTypes: post.reactions.reduce((acc, reaction) => {
        acc[reaction.type] = (acc[reaction.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Determine post visibility
    const visibilityString = (() => {
      switch (post.visibility) {
        case 'PUBLIC': return 'Public (visible to everyone)';
        case 'FRIENDS': return 'Friends only (visible to connections)';
        case 'PRIVATE': return 'Private (visible only to the author)';
        default: return 'Unknown visibility setting';
      }
    })();

    // Extract hashtags
    const hashtags = post.hashtags.map(tag => tag.topic.name);

    // Format timestamp
    const publishedTime = new Date(post.createdAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Prepare AI analysis summary if available
    const aiAnalysisSummary = post.aiAnalysis ? {
      sentiment: post.aiAnalysis.sentiment,
      topics: post.aiAnalysis.topics?.split(',').map(t => t.trim()) || [],
      suggestions: post.aiAnalysis.suggestions?.split('\n').filter(Boolean) || [],
      detectedEntities: post.aiAnalysis.detectedEntities ? JSON.parse(post.aiAnalysis.detectedEntities) : [],
      modelVersion: post.aiAnalysis.modelVersion,
      createdAt: new Date(post.aiAnalysis.createdAt).toLocaleString(),
    } : null;

    // Create a media summary
    const mediaSummary = post.media.map(m => ({
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
      dimensions: m.width && m.height ? `${m.width}x${m.height}` : 'Unknown',
      fileSize: m.fileSize ? `${Math.round(m.fileSize / 1024)} KB` : 'Unknown',
    }));

    // Return a comprehensive analysis
    return NextResponse.json({
      success: true,
      postId: post.id,
      authorName: post.user.name,
      authorUsername: post.user.username,
      content: post.content,
      publishedAt: publishedTime,
      visibility: visibilityString,
      published: post.published ? 'Yes' : 'No',
      wordCount: post.content.split(/\s+/).length,
      characterCount: post.content.length,
      hashtags,
      mediaCount: post.media.length,
      mediaDetails: mediaSummary,
      engagementStats,
      commentCount: post.comments.length,
      commentSample: post.comments.slice(0, 3).map(c => ({
        author: c.user.name,
        content: c.content,
        likes: c._count.reactions,
      })),
      aiAnalysis: aiAnalysisSummary,
      rawPost: post, // Include the full raw post data for debugging
    });
    
  } catch (error) {
    console.error('Error analyzing post:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}