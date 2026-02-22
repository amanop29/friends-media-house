import { NextRequest, NextResponse } from 'next/server';

// Visit /api/launch-clear to remove bypass cookie and return to launch page
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set('fmh_launch_bypass', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
  return response;
}
