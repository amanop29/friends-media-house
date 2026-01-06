import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get limit from query params, default to 6
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6');

    // Fetch featured events (only visible ones)
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_featured', true)
      .eq('is_visible', true)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch featured events' },
        { status: 500 }
      );
    }

    // Transform database fields to camelCase
    const transformedEvents = events?.map(event => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      date: event.date,
      location: event.location,
      category: event.category,
      coverImage: event.cover_image,
      coupleNames: event.title, // Can be extracted from title or add separate field
      isFeatured: event.is_featured,
      isVisible: event.is_visible,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    })) || [];

    return NextResponse.json({
      events: transformedEvents,
      count: transformedEvents.length,
    });

  } catch (error) {
    console.error('Error fetching featured events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
