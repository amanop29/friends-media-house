import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
    }

    const parsedUrl = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Unsupported URL protocol' }, { status: 400 });
    }

    const upstream = await fetch(parsedUrl.toString(), {
      cache: 'force-cache',
      headers: {
        'User-Agent': 'FriendsMediaHouseImageProxy/1.0',
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: upstream.status || 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400, stale-while-revalidate=604800';

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
