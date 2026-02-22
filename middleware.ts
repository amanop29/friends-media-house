import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cached launch settings with 30s TTL
let cachedLaunchEnabled: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

async function isLaunchPageEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedLaunchEnabled !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedLaunchEnabled;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

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
    const enabled = data?.[0]?.value?.launchPageEnabled === true;
    cachedLaunchEnabled = enabled;
    cacheTimestamp = now;
    return enabled;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|avif|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // --- Launch page redirect ---
  // Skip for /launch, /admin, and API routes
  if (!pathname.startsWith('/launch') && !pathname.startsWith('/admin')) {
    const hasBypass = request.cookies.get('fmh_launch_bypass')?.value === '1';
    if (!hasBypass) {
      const enabled = await isLaunchPageEnabled();
      if (enabled) {
        return NextResponse.redirect(new URL('/launch', request.url));
      }
    }
  }

  // Add security headers
  const response = NextResponse.next();

  // Cache control for static assets
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
