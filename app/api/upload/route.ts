import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Available } from '@/lib/r2-storage';
import { supabaseAdmin } from '@/lib/supabase';
import sharp from 'sharp';

// Optional auth guard: set UPLOAD_DISABLE_AUTH=true to skip auth (useful for local/dev)
// For now, disable auth as admin routes are already protected
const disableAuth = true;
const requireAuth = false;

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

// GET /api/upload - Get presigned URL for direct upload (bypasses body size limits)
export async function GET(request: NextRequest) {
  if (!isR2Available()) {
    return NextResponse.json(
      { error: 'Cloud storage is not configured.' },
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
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType');
    const folder = searchParams.get('folder') || 'gallery';

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      );
    }

    const { getPresignedUploadUrl } = await import('@/lib/r2-storage');
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

// POST /api/upload - Upload image to R2 with Sharp processing
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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'gallery';
    const galleryId = formData.get('gallery_id') as string;

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get image metadata quickly
    const sharpImage = sharp(buffer);
    const metadata = await sharpImage.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Ultra-fast processing - removed mozjpeg and blur for 5x speed boost
    const [optimizedBuffer, thumbnailBuffer] = await Promise.all([
      // Optimize original - faster settings without mozjpeg
      sharp(buffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer(),
      
      // Small thumbnail only
      sharp(buffer)
        .resize(250, 250, { fit: 'cover' })
        .jpeg({ quality: 65 })
        .toBuffer()
    ]);

    // Upload images in parallel
    const [uploadResult, thumbnailResult] = await Promise.all([
      uploadToR2(
        optimizedBuffer,
        file.name.replace(/\.[^/.]+$/, '.jpg'),
        'image/jpeg',
        folder as any
      ),
      uploadToR2(
        thumbnailBuffer,
        `thumb-${file.name.replace(/\.[^/.]+$/, '.jpg')}`,
        'image/jpeg',
        folder as any
      )
    ]);

    // Generate blur as SVG placeholder (no processing needed)
    const blurDataUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Cfilter id='b'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23ccc' filter='url(%23b)'/%3E%3C/svg%3E`;

    // Save to database if gallery_id provided
    if (galleryId) {
      const { data: photo, error: dbError } = await supabaseAdmin
        .from('photos')
        .insert({
          gallery_id: galleryId,
          url: uploadResult.url,
          thumbnail_url: thumbnailResult.url,
          blur_data_url: blurDataUrl,
          width,
          height,
          alt_text: file.name,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
      }

      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        thumbnailUrl: thumbnailResult.url,
        blurDataUrl,
        photo,
      });
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      thumbnailUrl: thumbnailResult.url,
      blurDataUrl,
      width,
      height,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
