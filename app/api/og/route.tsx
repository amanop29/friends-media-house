import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Fetch the banner URL from Supabase settings (for when no banner param is provided)
async function getBannerFromSettings(): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/settings?key=eq.site_config&select=value`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 3600 },
      }
    );
    const data = await res.json();
    const settings = data?.[0]?.value;
    return settings?.homeBannerUrl || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get banner URL from query params, or fetch from settings
    let bannerUrl = searchParams.get('banner');

    if (!bannerUrl) {
      bannerUrl = await getBannerFromSettings();
    }

    // Validate URL if provided
    if (bannerUrl) {
      try {
        new URL(bannerUrl);
      } catch {
        bannerUrl = null;
      }
    }

    const response = new ImageResponse(
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
          {bannerUrl && (
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
          )}

          {/* Overlay */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: bannerUrl
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))'
                : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
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

    // Add aggressive cache headers so crawlers don't re-fetch constantly
    response.headers.set(
      'Cache-Control',
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
    );

    return response;
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
