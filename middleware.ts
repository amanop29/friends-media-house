import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  
  // Check if running locally (development or local production build)
  const isLocalhost = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname.startsWith('localhost:') ||
                      hostname.startsWith('192.168.') ||
                      hostname.includes('vercel.app'); // Also include Vercel preview URLs

  // Check if it's the admin subdomain
  const isAdminSubdomain = hostname.startsWith('admin.') || 
                          hostname === 'admin.friendsmediahouse.com';

  // Get the main domain (works for both custom domains and vercel.app)
  const mainDomain = hostname.replace('admin.', '');

  // Skip middleware for API routes to avoid redirect loops with API calls
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

  // ADMIN SUBDOMAIN ROUTING
  // If accessing admin routes from main domain, redirect to admin subdomain
  if (pathname.startsWith('/admin') && !isAdminSubdomain && !isLocalhost) {
    const adminUrl = new URL(request.url);
    adminUrl.hostname = `admin.${mainDomain}`;
    return NextResponse.redirect(adminUrl, 308); // 308 Permanent Redirect
  }

  // PUBLIC DOMAIN ROUTING
  // If accessing public routes from admin subdomain, redirect to main domain
  if (!pathname.startsWith('/admin') && isAdminSubdomain && !isLocalhost) {
    const mainUrl = new URL(request.url);
    mainUrl.hostname = mainDomain;
    return NextResponse.redirect(mainUrl, 308); // 308 Permanent Redirect
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
