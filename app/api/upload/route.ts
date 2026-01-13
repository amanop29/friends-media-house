import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED ENDPOINT
 * 
 * This route is no longer used. The new high-performance upload system uses:
 * 1. /api/r2/presign - Generate presigned URLs for direct R2 uploads
 * 2. Frontend batch-upload.ts - Upload directly from browser to R2
 * 3. Frontend UI - Send only metadata back to save in database
 * 
 * Benefits of the new system:
 * ✅ No server-side image processing (removed Sharp bottleneck)
 * ✅ Direct browser-to-R2 uploads (faster network path)
 * ✅ Parallel uploads with concurrency control (6 files at a time)
 * ✅ Supports 1000+ image batches without hanging
 * ✅ Real-time per-file and overall progress
 * ✅ Graceful error handling (one failure doesn't stop batch)
 * ✅ Low server resource usage (just metadata storage)
 * 
 * Migration:
 * - Old: POST file to /api/upload → server processes → upload to R2
 * - New: GET presigned URLs → upload to R2 directly → POST metadata only
 */

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/r2/presign for presigned URLs instead',
      docs: 'See src/lib/batch-upload.ts for the new upload system'
    },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/r2/presign for presigned URLs instead',
      docs: 'See src/lib/batch-upload.ts for the new upload system'
    },
    { status: 410 }
  );
}
