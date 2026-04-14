import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let eventResult = await supabase
      .from('events')
      .select('*')
      .eq('slug', decodedId)
      .eq('is_visible', true)
      .single();

    if (eventResult.error && eventResult.error.code === 'PGRST116') {
      eventResult = await supabase
        .from('events')
        .select('*')
        .eq('id', decodedId)
        .eq('is_visible', true)
        .single();
    }

    if (eventResult.error || !eventResult.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventRow = eventResult.data;

    const [{ data: photoRows, error: photosError }, { data: videoRows, error: videosError }] = await Promise.all([
      supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventRow.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('videos')
        .select('*')
        .eq('event_id', eventRow.id)
        .order('created_at', { ascending: true }),
    ]);

    if (photosError) {
      return NextResponse.json({ error: 'Failed to fetch event photos' }, { status: 500 });
    }

    if (videosError) {
      return NextResponse.json({ error: 'Failed to fetch event videos' }, { status: 500 });
    }

    const photoIds = (photoRows || []).map((photo: any) => photo.id);
    let commentCounts: Record<string, number> = {};

    if (photoIds.length > 0) {
      const { data: commentsData } = await supabase
        .from('photo_comments')
        .select('photo_id')
        .in('photo_id', photoIds)
        .eq('is_hidden', false);

      if (commentsData) {
        commentCounts = commentsData.reduce((acc: Record<string, number>, comment: any) => {
          acc[comment.photo_id] = (acc[comment.photo_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const event = {
      id: eventRow.id,
      supabaseId: eventRow.id,
      title: eventRow.title,
      slug: eventRow.slug,
      description: eventRow.description,
      date: eventRow.date,
      location: eventRow.location,
      category: eventRow.custom_category || eventRow.category,
      coverImage: eventRow.cover_image || eventRow.cover_image_url,
      coverThumbnail: eventRow.cover_thumbnail || eventRow.cover_image || eventRow.cover_image_url,
      coupleNames: eventRow.couple_names,
      photoCount: eventRow.photo_count || 0,
      videoCount: eventRow.video_count || 0,
      isFeatured: Boolean(eventRow.is_featured),
      isVisible: Boolean(eventRow.is_visible),
      viewCount: eventRow.view_count || 0,
    };

    const photos = (photoRows || []).map((photo: any) => ({
      id: photo.id,
      supabasePhotoId: photo.id,
      eventId: photo.event_id,
      supabaseEventId: photo.event_id,
      url: photo.url,
      thumbnail: photo.thumbnail_url || photo.url,
      uploadedAt: photo.created_at,
      width: photo.width,
      height: photo.height,
      orientation: photo.orientation,
      likeCount: photo.like_count || 0,
      commentCount: commentCounts[photo.id] || 0,
    }));

    const videos = (videoRows || []).map((video: any) => ({
      id: video.id,
      url: video.url,
      type: video.type || 'youtube',
      thumbnail: video.thumbnail_url || '',
      title: video.title || '',
      uploadedAt: video.created_at || new Date().toISOString(),
    }));

    // Best-effort view increment.
    supabase
      .from('events')
      .update({ view_count: (eventRow.view_count || 0) + 1 })
      .eq('id', eventRow.id)
      .then(() => {})
      .catch(() => {});

    return NextResponse.json({ event, photos, videos });
  } catch (error) {
    console.error('Public event detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
