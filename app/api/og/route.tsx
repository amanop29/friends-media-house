import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get banner URL from query params
    const bannerUrl = searchParams.get('banner');
    
    if (!bannerUrl) {
      return new Response('Missing banner parameter', { status: 400 });
    }

    // Validate URL (basic security check)
    try {
      new URL(bannerUrl);
    } catch {
      return new Response('Invalid banner URL', { status: 400 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            position: 'relative',
          }}
        >
          {/* Background Image */}
          <img
            src={bannerUrl}
            alt="Friends Media House"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          
          {/* Overlay */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6))',
            }}
          />

          {/* Text Content */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px',
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 600,
                color: 'white',
                textAlign: 'center',
                marginBottom: 24,
                fontFamily: 'serif',
              }}
            >
              Friends Media House
            </div>
            <div
              style={{
                fontSize: 32,
                color: 'rgba(255,255,255,0.9)',
                textAlign: 'center',
              }}
            >
              Professional Event Photography & Videography
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
