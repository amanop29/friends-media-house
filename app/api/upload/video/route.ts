import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, isR2Available } from '@/lib/r2-storage';
import { supabaseAdmin } from '@/lib/supabase';

// Optional auth guard: set UPLOAD_DISABLE_AUTH=true to skip auth (useful for local/dev)
const disableAuth = process.env.UPLOAD_DISABLE_AUTH === 'true';
const requireAuth = !!supabaseAdmin && !disableAuth;

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return null;
  }

  return user;
}

// POST /api/upload/video - Get a presigned URL for direct-to-R2 upload
export async function POST(request: NextRequest) {
  // Check if R2 is configured first
  if (!isR2Available()) {
    return NextResponse.json(
      { error: 'Cloud storage is not configured. Please set up R2 environment variables.' },
      { status: 503 }
    );
  }

  if (requireAuth) {
    const user = await verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { fileName, contentType, folder = 'videos' } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4, WebM, MOV, AVI, and MKV are allowed.' },
        { status: 400 }
      );
    }

    const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(fileName, contentType, folder);

    return NextResponse.json({ success: true, uploadUrl, key, url: publicUrl });
  } catch (error) {
    console.error('Video presign error:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}

// Force Node.js runtime for S3 signing
export const runtime = 'nodejs';
