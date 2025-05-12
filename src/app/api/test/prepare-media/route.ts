import { NextResponse } from 'next/server';

/**
 * API route to fetch and prepare media for Gemini analysis
 * Converts external URLs to base64 data for use with Gemini Vision API
 */
export async function GET(request: Request) {
  try {
    // Parse URL from query string
    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get('url');

    if (!mediaUrl) {
      return NextResponse.json({
        success: false,
        error: 'Media URL is required as a query parameter'
      }, { status: 400 });
    }

    // Fetch the image
    const response = await fetch(mediaUrl);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch media from URL: ${response.status} ${response.statusText}`
      }, { status: 500 });
    }
    
    // Get the content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Convert to Base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    // Return the prepared data URL
    return NextResponse.json({
      success: true,
      dataUrl,
      contentType
    });
    
  } catch (error) {
    console.error('Error preparing media for analysis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}