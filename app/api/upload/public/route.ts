import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Available, getPresignedUploadUrl } from '@/lib/r2-storage';

// GET /api/upload/public - Get presigned URL for public uploads
export async function GET(request: NextRequest) {
  try {
    if (!isR2Available()) {
      return NextResponse.json(
        { error: 'Cloud storage is not configured.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType');
    const folder = searchParams.get('folder') || 'general';

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      );
    }

    const allowedFolders = ['banners', 'logos', 'avatars', 'reviews', 'team'];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json(
        { error: 'Invalid folder specified' },
        { status: 400 }
      );
    }

    const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(
      fileName,
      contentType,
      folder as any
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}

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

    // No size limit - upload any size image

    // Validate folder
    const allowedFolders = ['banners', 'logos', 'avatars', 'reviews', 'team'];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json(
        { error: 'Invalid folder specified' },
        { status: 400 }
      );
    }

    // Convert to buffer more efficiently
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Uploading ${file.name} (${(file.size / 1024).toFixed(1)}KB) to ${folder}`);

    // Upload to R2 directly without additional processing
    // Client-side compression is already done if needed
    const uploadResult = await uploadToR2(
      buffer,
      file.name,
      file.type,
      folder as any
    );

    console.log(`Upload successful: ${uploadResult.url}`);

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
