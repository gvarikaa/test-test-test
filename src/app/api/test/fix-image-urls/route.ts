import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Fix broken image URLs in the database
 */
export async function GET() {
  try {
    // Find media items with problematic URLs
    const mediaItems = await db.media.findMany({
      where: {
        url: {
          contains: 'source.unsplash.com'
        }
      }
    });
    
    console.log(`Found ${mediaItems.length} media items with Unsplash URLs`);
    
    // Update URLs to use Picsum Photos instead
    const updatePromises = mediaItems.map((media, index) => {
      return db.media.update({
        where: { id: media.id },
        data: {
          url: `https://picsum.photos/800/600?random=${index + 1}`
        }
      });
    });
    
    const results = await Promise.all(updatePromises);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${results.length} media URLs`,
      updatedItems: results
    });
    
  } catch (error) {
    console.error('Error fixing image URLs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}