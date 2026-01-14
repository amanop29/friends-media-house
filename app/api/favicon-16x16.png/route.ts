import { NextResponse } from 'next/server';
import { getR2Object } from '../../../src/lib/r2-storage';

export async function GET() {
  const file = await getR2Object('favicon_io/favicon-16x16.png');
  if (!file) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
