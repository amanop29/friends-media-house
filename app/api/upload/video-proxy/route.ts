import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Available } from '@/lib/r2-storage';

// Server-side video upload proxy (bypasses CORS issues)
const disableAuth = true;
const requireAuth = false;

export async function POST(request: NextRequest) {
  if (!isR2Available()) {
    return NextResponse.json(
      { error: 'Cloud storage is not configured.' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'videos';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4, WebM, MOV, AVI, and MKV are allowed.' },
        { status: 400 }
      );
    }

    // 100MB limit for proxy upload
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB for proxy upload.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToR2(
      buffer,
      file.name,
      file.type,
      folder as any
    );

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.key,
    });
  } catch (error) {
    console.error('Video proxy upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for video processing
