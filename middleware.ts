import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  
  // Check if running locally (development or local production build)
  const isLocalhost = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname.startsWith('localhost:') ||
                      hostname.startsWith('192.168.');

  // Check if it's the admin subdomain
  const isAdminSubdomain = hostname.startsWith('admin.') || 
                          hostname === 'admin.friendsmediahouse.com' ||
                          hostname === 'localhost:3001';

  // Skip middleware for login page to avoid redirect loops
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Admin routes - require admin subdomain (only enforce on actual production domain)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/api/upload')) {
    // Only enforce subdomain routing on production domain, not localhost
    if (!isAdminSubdomain && !isLocalhost) {
      // Redirect to admin subdomain
      const adminUrl = new URL(request.url);
      adminUrl.hostname = `admin.${adminUrl.hostname}`;
      return NextResponse.redirect(adminUrl);
    }
  }

  // Public routes - should not be on admin subdomain (only on production)
  if (isAdminSubdomain && !pathname.startsWith('/admin') && !pathname.startsWith('/api/admin') && !pathname.startsWith('/api/upload')) {
    if (!isLocalhost) {
      // Redirect to main domain
      const mainUrl = new URL(request.url);
      mainUrl.hostname = mainUrl.hostname.replace('admin.', '');
      return NextResponse.redirect(mainUrl);
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
