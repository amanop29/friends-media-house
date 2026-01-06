import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/galleries/all - Get all photos with event info (for admin)
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Fetch all photos with their event info
    const { data: photos, error } = await supabaseAdmin
      .from('photos')
      .select(`
        id,
        url,
        thumbnail_url,
        event_id,
        events (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    // Map to a flattened format
    const mappedPhotos = photos?.map((photo: any) => ({
      id: photo.id,
      url: photo.url,
      thumbnail: photo.thumbnail_url || photo.url,
      event_id: photo.event_id,
      event_title: photo.events?.title || 'Unknown Event',
    })) || [];

    return NextResponse.json({ photos: mappedPhotos });
  } catch (error) {
    console.error('Galleries all GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
