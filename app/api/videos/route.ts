import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/videos - Add a video to Supabase
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { eventId, video } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    if (!video || !video.url) {
      return NextResponse.json(
        { error: 'Video data is required' },
        { status: 400 }
      );
    }

    // Extract YouTube ID if it's a YouTube video
    let youtubeId: string | null = null;
    if (video.type === 'youtube') {
      const match = video.url.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      youtubeId = match ? match[1] : null;
    }

    const { data, error } = await supabaseAdmin
      .from('videos')
      .insert({
        event_id: eventId,
        title: video.title || 'Video',
        url: video.url,
        thumbnail_url: video.thumbnail,
        type: video.type || 'upload',
        youtube_id: youtubeId,
        display_order: video.displayOrder || 0,
        is_featured: video.isFeatured || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding video to Supabase:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to add video' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video: {
        id: data.id,
        supabaseId: data.id,
        url: data.url,
        thumbnail: data.thumbnail_url,
        title: data.title,
        type: data.type,
        uploadedAt: data.created_at,
        eventId: data.event_id,
      },
    });
  } catch (error) {
    console.error('Video add error:', error);
    return NextResponse.json(
      { error: 'Failed to add video' },
      { status: 500 }
    );
  }
}

// DELETE /api/videos - Delete a video from Supabase
export async function DELETE(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Check if videoId is a valid UUID format (Supabase uses UUIDs)
    // Local IDs like "video-1234567890" are not valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(videoId)) {
      // This is a local ID, not a Supabase video - just return success
      console.log(`Video ID ${videoId} is a local ID, not in Supabase`);
      return NextResponse.json({
        success: true,
        message: 'Local video ID - not in database',
      });
    }

    // Get video details first (for returning URL info if needed)
    const { data: video } = await supabaseAdmin
      .from('videos')
      .select('url, thumbnail_url, type')
      .eq('id', videoId)
      .single();

    // Delete the video
    const { error } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      console.error('Error deleting video from Supabase:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete video' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video,
    });
  } catch (error) {
    console.error('Video delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
