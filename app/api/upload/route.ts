import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Available } from '@/lib/r2-storage';

/**
 * Simple upload endpoint for single files (cover images, banners, logos)
 * For batch gallery uploads, use /api/r2/presign + batch-upload.ts instead
 */

export async function POST(request: NextRequest) {
  // Check if R2 is configured
  if (!isR2Available()) {
    return NextResponse.json(
      { error: 'Cloud storage is not configured. Please set up R2 environment variables.' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'events';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log(`📤 Uploading ${file.name} to ${folder} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2 (no processing for speed)
    const uploadResult = await uploadToR2(
      buffer,
      file.name,
      file.type,
      folder as any
    );

    console.log(`✅ Uploaded: ${uploadResult.url}`);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.key,
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
