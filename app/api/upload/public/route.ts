import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Available } from '@/lib/r2-storage';

// POST /api/upload/public - Public upload endpoint for avatars, logos, banners
export async function POST(request: NextRequest) {
  try {
    // Check if R2 is configured
    if (!isR2Available()) {
      return NextResponse.json(
        { error: 'Cloud storage is not configured. Please set up R2 environment variables.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (allow SVG for logos)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (including SVG) are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max for public uploads)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Validate folder
    const allowedFolders = ['banners', 'logos', 'avatars', 'reviews', 'team'];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json(
        { error: 'Invalid folder specified' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
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
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
