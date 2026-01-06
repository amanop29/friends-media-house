import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/likes - Get like count for a photo
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json(
        { error: 'photoId is required' },
        { status: 400 }
      );
    }

    // Get like count from photos table
    const { data, error } = await supabaseAdmin
      .from('photos')
      .select('like_count')
      .eq('id', photoId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching like count:', error);
      // Return 0 if photo not found instead of error
      return NextResponse.json({ 
        photoId,
        likeCount: 0 
      });
    }

    return NextResponse.json({ 
      photoId,
      likeCount: data?.like_count || 0 
    });
  } catch (error) {
    console.error('Likes GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/likes - Increment like count
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { photoId, action } = body; // action: 'like' or 'unlike'

    if (!photoId || !action) {
      return NextResponse.json(
        { error: 'photoId and action are required' },
        { status: 400 }
      );
    }

    // First, get the current count (use maybeSingle to handle missing photos)
    const { data: fetchData, error: fetchError } = await supabaseAdmin
      .from('photos')
      .select('like_count')
      .eq('id', photoId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching current like count:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch photo', details: fetchError.message },
        { status: 500 }
      );
    }

    // If photo not found, return error
    if (!fetchData) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    const currentCount = fetchData?.like_count || 0;
    let newCount = currentCount;

    if (action === 'like') {
      newCount = currentCount + 1;
    } else if (action === 'unlike') {
      newCount = Math.max(0, currentCount - 1);
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Update with new count
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('photos')
      .update({ like_count: newCount })
      .eq('id', photoId)
      .select('like_count')
      .single();

    if (updateError) {
      console.error('Error updating like count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update like count', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      photoId,
      likeCount: updatedData?.like_count || newCount
    });
  } catch (error) {
    console.error('Likes POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
