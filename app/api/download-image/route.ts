import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract filename from URL and convert to .jpg
    const urlPath = new URL(url).pathname;
    const urlFilename = urlPath.split('/').pop() || '';
    // Clean filename - remove thumb- prefix, timestamp prefix, and change extension to .jpg
    const baseName = urlFilename
      .replace(/^thumb-/, '')
      .replace(/^\d+-/, '')
      .replace(/\.[^/.]+$/, '') || `photo-${Date.now()}`;
    const cleanFilename = `${baseName}.jpg`;

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Get raw array buffer
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    
    // Convert to JPG using sharp - high quality, no metadata (removes any lock/quarantine)
    const jpgBuffer = await sharp(inputBuffer)
      .jpeg({ 
        quality: 95,
        mozjpeg: true,  // Better compression
        chromaSubsampling: '4:4:4'  // Best quality
      })
      .toBuffer();
    
    // Convert Buffer to Uint8Array for NextResponse
    const jpgArray = new Uint8Array(jpgBuffer);
    
    // Return the JPG image with proper headers - clean, no quarantine attributes
    return new NextResponse(jpgArray, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${cleanFilename}"`,
        'Content-Length': jpgBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to download image' }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
