import { NextRequest, NextResponse } from 'next/server';
import { deleteFromR2, isR2Available } from '@/lib/r2-storage';

// Optional auth toggle matches upload route
const disableAuth = process.env.UPLOAD_DISABLE_AUTH === 'true';

export async function POST(request: NextRequest) {
  try {
    if (!isR2Available()) {
      return NextResponse.json({ error: 'Cloud storage is not configured.' }, { status: 503 });
    }

    // Optional simple auth: expect a header token if not disabled
    if (!disableAuth) {
      const auth = request.headers.get('authorization');
      if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    console.log('🗑️  DELETE REQUEST for URL:', url);

    // Get and normalize the base URL (remove trailing slash)
    let base = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
    base = base.replace(/\/$/, ''); // Remove trailing slash if present
    
    if (!base) {
      console.error('❌ R2_PUBLIC_URL not configured');
      return NextResponse.json({ error: 'R2 public URL not configured' }, { status: 500 });
    }

    // Normalize the provided URL too
    const normalizedUrl = url.replace(/\/$/, '');
    
    if (!normalizedUrl.startsWith(base)) {
      console.error(`❌ URL validation failed: ${normalizedUrl} does not start with ${base}`);
      return NextResponse.json({ error: 'URL does not belong to this bucket' }, { status: 400 });
    }

    const key = normalizedUrl.substring(base.length).replace(/^\//, '');
    if (!key) {
      console.error('❌ Invalid key derived from URL');
      return NextResponse.json({ error: 'Invalid key derived from URL' }, { status: 400 });
    }

    console.log(`🔑 Extracted key: ${key}`);
    
    // Actually delete the file from R2
    try {
      await deleteFromR2(key);
      console.log(`✅ Successfully deleted R2 object: ${key}`);
      return NextResponse.json({ success: true, message: `Deleted ${key}` });
    } catch (deleteError: any) {
      console.error(`❌ Failed to delete R2 object: ${key}`, deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete file from R2', 
        details: deleteError?.message || String(deleteError)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ R2 delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete file', 
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
