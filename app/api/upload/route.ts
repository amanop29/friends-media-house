import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Available } from '@/lib/r2-storage';
import { supabaseAdmin } from '@/lib/supabase';
import sharp from 'sharp';

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

// POST /api/upload - Upload image to R2
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

    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Optimize and upload original image
    const optimizedBuffer = await sharp(buffer)
      .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const uploadResult = await uploadToR2(
      optimizedBuffer,
      file.name.replace(/\.[^/.]+$/, '.webp'),
      'image/webp',
      folder as any
    );

    // Generate and upload thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();

    const thumbnailResult = await uploadToR2(
      thumbnailBuffer,
      `thumb-${file.name.replace(/\.[^/.]+$/, '.webp')}`,
      'image/webp',
      folder as any
    );

    // Generate blur placeholder
    const blurBuffer = await sharp(buffer)
      .resize(20, 20, { fit: 'cover' })
      .blur()
      .webp({ quality: 20 })
      .toBuffer();

    const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

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
