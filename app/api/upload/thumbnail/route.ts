import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getR2Object, uploadToR2ByKey } from '@/lib/r2-storage';
import { supabaseAdmin } from '@/lib/supabase';

const THUMB_WIDTH = 640;

function buildThumbKey(originalKey: string): string {
  const base = originalKey.replace(/\.[^/.]+$/, '');
  return `${base}__w${THUMB_WIDTH}.webp`;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const key = typeof body?.key === 'string' ? body.key : '';
    const photoId = typeof body?.photoId === 'string' ? body.photoId : undefined;

    if (!key) {
      return NextResponse.json(
        { error: 'key is required' },
        { status: 400 }
      );
    }

    const original = await getR2Object(key);
    if (!original) {
      return NextResponse.json(
        { error: 'Original file not found in storage' },
        { status: 404 }
      );
    }

    const thumbBuffer = await sharp(original.body)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();

    const thumbKey = buildThumbKey(key);
    const thumbUpload = await uploadToR2ByKey(thumbBuffer, thumbKey, 'image/webp');

    if (photoId && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('photos')
        .update({ thumbnail_url: thumbUpload.url })
        .eq('id', photoId);

      if (error) {
        console.warn('Failed to persist thumbnail URL to Supabase:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      thumbnailUrl: thumbUpload.url,
      key: thumbUpload.key,
    });
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}