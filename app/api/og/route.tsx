import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Node.js runtime required for sharp (not edge)
export const runtime = 'nodejs';

// In-memory cache for the banner URL (1 hour TTL)
let cachedBannerUrl: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3_600_000; // 1 hour

async function getBannerFromSettings(): Promise<string | null> {
  const now = Date.now();
  if (cachedBannerUrl !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedBannerUrl;
  }

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
      }
    );
    const data = await res.json();
    const settings = data?.[0]?.value;
    const url: string | null = settings?.homeBannerUrl || null;
    cachedBannerUrl = url;
    cacheTimestamp = now;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let bannerUrl = searchParams.get('banner');

    if (!bannerUrl) {
      bannerUrl = await getBannerFromSettings();
    }

    // Validate URL
    if (bannerUrl) {
      try {
        new URL(bannerUrl);
      } catch {
        bannerUrl = null;
      }
    }

    let optimized: Buffer;

    if (bannerUrl) {
      // Fetch the original banner from R2
      const imgRes = await fetch(bannerUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!imgRes.ok) {
        throw new Error(`Failed to fetch banner: ${imgRes.status}`);
      }

      const arrayBuffer = await imgRes.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      // Resize to exactly 1200×630, compress as JPEG → target ~150–250 KB
      // Quality 75 with mozjpeg gives much better compression than default encoder
      optimized = await sharp(inputBuffer)
        .resize(1200, 630, {
          fit: 'cover',       // crop to fill, no black bars
          position: 'centre',
        })
        .jpeg({
          quality: 75,
          mozjpeg: true,              // better compression algorithm
          chromaSubsampling: '4:2:0', // standard chroma subsampling for photos
        })
        .toBuffer();
    } else {
      // Fallback: dark branded background when no banner is set
      optimized = await sharp({
        create: {
          width: 1200,
          height: 630,
          channels: 3,
          background: { r: 10, g: 10, b: 20 },
        },
      })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    }

    return new NextResponse(new Uint8Array(optimized), {
      headers: {
        'Content-Type': 'image/jpeg',
        // Cache for 1 day on browser, 7 days on CDN edge
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[OG] Error generating image:', error);
    return NextResponse.json({ error: 'Failed to generate OG image' }, { status: 500 });
  }
}
