import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const categoryMap: Record<string, string> = {
  wedding: 'wedding',
  'pre-wedding': 'pre-wedding',
  engagement: 'engagement',
  reception: 'reception',
  jainism: 'jainism',
  birthday: 'birthday',
  corporate: 'corporate',
  event: 'event',
  film: 'film',
  other: 'other',
};

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_visible', true)
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    const events = (data || []).map((event: any) => {
      const normalizedCategory = (event.custom_category || event.category || 'event').toLowerCase();
      const category = categoryMap[normalizedCategory] ? normalizedCategory : (event.custom_category || event.category || 'event');

      return {
        id: event.id,
        supabaseId: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        date: event.date,
        location: event.location,
        category,
        coverImage: event.cover_image || event.cover_image_url,
        coverThumbnail: event.cover_thumbnail || event.cover_image || event.cover_image_url,
        coupleNames: event.couple_names,
        photoCount: event.photo_count || 0,
        videoCount: event.video_count || 0,
        isFeatured: Boolean(event.is_featured),
        isVisible: Boolean(event.is_visible),
        viewCount: event.view_count || 0,
      };
    });

    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    console.error('Public events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
