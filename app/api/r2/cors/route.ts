import { NextResponse } from 'next/server';
import { configureR2Cors, isR2Available } from '@/lib/r2-storage';

/**
 * POST /api/r2/cors
 * Configures CORS on the R2 bucket so browsers can PUT directly via presigned URLs.
 * Idempotent — safe to call repeatedly. Called automatically from admin upload pages.
 */
export async function POST() {
  if (!isR2Available()) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 503 });
  }
  try {
    await configureR2Cors();
    return NextResponse.json({ success: true });
  } catch (error) {
    // PutBucketCors may not be available with HMAC keys on some R2 plans.
    // Log the warning but don't treat it as a hard error — the server-POST fallback handles it.
    console.warn('[r2/cors] Could not configure R2 CORS (will use server POST fallback):', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 200 } // 200 so the caller doesn't throw — fallback already handles uploads
    );
  }
}
