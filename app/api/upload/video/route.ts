import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Available } from '@/lib/r2-storage';
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

// POST /api/upload/video - Upload video to R2
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
    const folder = (formData.get('folder') as string) || 'videos';
    const eventId = formData.get('event_id') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - accept video formats
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime', // .mov
      'video/x-msvideo', // .avi
      'video/x-matroska', // .mkv
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4, WebM, MOV, AVI, and MKV are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (500MB max for videos)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload video to R2 (no processing, just upload)
    const uploadResult = await uploadToR2(
      buffer,
      file.name,
      file.type,
      folder as any
    );

    // Optionally save to database if event_id provided
    if (eventId && supabaseAdmin) {
      try {
        const { data: video, error: dbError } = await supabaseAdmin
          .from('videos')
          .insert({
            event_id: eventId,
            url: uploadResult.url,
            type: 'upload',
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
        } else {
          return NextResponse.json({
            success: true,
            url: uploadResult.url,
            key: uploadResult.key,
            video,
          });
        }
      } catch (dbErr) {
        console.error('Database save error:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.key,
      fileSize: file.size,
      fileName: file.name,
    });

  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

// Configure larger body size for video uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
