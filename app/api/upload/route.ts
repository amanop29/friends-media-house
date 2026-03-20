import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToR2, uploadToR2ByKey, isR2Available, getPresignedUploadUrl, getPresignedUrlForKey } from '@/lib/r2-storage';
import { optimizeImageLosslessly } from '@/lib/lossless-image-optimizer';

/**
 * Image upload endpoint with immutable object naming.
 * For gallery/events uploads, also generates CDN thumbnails at multiple sizes.
 */

/** Width of the primary thumbnail used by the frontend (grid views, photo cards) */
const THUMB_WIDTH = 640;

function buildThumbKey(originalKey: string): string {
  const base = originalKey.replace(/\.[^/.]+$/, '');
  return `${base}__w${THUMB_WIDTH}.webp`;
}

// GET /api/upload - Returns a presigned URL for direct-to-R2 uploads (images)
export async function GET(request: NextRequest) {
  if (!isR2Available()) {
    return NextResponse.json(
      { error: 'Cloud storage is not configured. Please set up R2 environment variables.' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType');
    const folder = searchParams.get('folder') || 'events';

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    const allowedFolders = ['events', 'gallery', 'reviews', 'videos', 'general'];
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

      // When the caller wants a paired thumbnail slot (client-side resize flow), presign
      // the derived thumbnail key in the same response so only one server round-trip is needed.
      const withThumb = searchParams.get('withThumb') === 'true';
      if (withThumb) {
        const thumbKey = buildThumbKey(key);
        const { uploadUrl: thumbUploadUrl, publicUrl: thumbUrl } =
          await getPresignedUrlForKey(thumbKey, 'image/webp');
        return NextResponse.json({
          success: true,
          uploadUrl,
          key,
          url: publicUrl,
          thumbUploadUrl,
          thumbKey,
          thumbUrl,
        });
      }

      return NextResponse.json({ success: true, uploadUrl, key, url: publicUrl });
  } catch (error) {
    console.error('❌ Presign error (images):', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}

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

    // No size limit - upload any size image
    console.log(`📤 Uploading ${file.name} to ${folder} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    const { buffer, contentType, optimized } = await optimizeImageLosslessly(rawBuffer, file.type);
    if (optimized) {
      console.log(
        `🗜️ Lossless optimized ${file.name}: ${(rawBuffer.length / 1024 / 1024).toFixed(2)}MB -> ${(buffer.length / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // Always upload original file for full-quality lightbox/downloads
    const uploadResult = await uploadToR2(
      buffer,
      file.name,
      contentType,
      folder as any
    );

    const shouldGenerateThumbs = ['events', 'gallery'].includes(folder);

    if (!shouldGenerateThumbs) {
      console.log(`✅ Uploaded: ${uploadResult.url}`);
      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        key: uploadResult.key,
      });
    }

    // Generate a single 640-wide WebP thumbnail — only this is used by the frontend.
    // Runs best-effort: if encoding fails the upload still succeeds with original URL.
    let thumbnailUrl = uploadResult.url;
    try {
      const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: 78, effort: 4 })
        .toBuffer();

      const thumbKey = buildThumbKey(uploadResult.key);
      const thumbUpload = await uploadToR2ByKey(thumbBuffer, thumbKey, 'image/webp');
      thumbnailUrl = thumbUpload.url;
    } catch (thumbErr) {
      console.warn('⚠️ Thumbnail generation failed (non-fatal):', thumbErr);
    }

    console.log(`✅ Uploaded original + thumbnail: ${uploadResult.url}`);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.key,
      thumbnailUrl,
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
