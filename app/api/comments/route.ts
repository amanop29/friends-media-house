import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { z } from 'zod';

const commentSchema = z.object({
  photoId: z.string().min(1, 'Photo ID is required'),
  guestName: z.string().min(2, 'Name must be at least 2 characters'),
  guestEmail: z.string().email('Invalid email address'),
  comment: z.string().min(1, 'Comment must be at least 1 character'),
  avatar: z.string().optional(),
  photoUrl: z.string().optional(),
  eventTitle: z.string().optional(),
});

// GET /api/comments - Get comments for a photo or all comments (for admin)
export async function GET(request: NextRequest) {
  try {
    // Use admin client if available, otherwise use public client
    const client = supabaseAdmin || supabase;
    
    if (!client) {
      console.error('❌ Supabase client not initialized. Check environment variables.');
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');
    const photoUrl = searchParams.get('photoUrl');

    console.log('📝 Fetching comments for photoId:', photoId, 'photoUrl:', photoUrl?.substring(0, 50));

    let query = client
      .from('photo_comments')
      .select('*')
      .order('created_at', { ascending: false });

    // If photoId is provided, filter by it and only show non-hidden comments
    if (photoId) {
      // Try to match by photo_id OR by photo_url containing the photo ID pattern
      query = query
        .or(`photo_id.eq.${photoId},photo_url.ilike.%${photoId}%`)
        .eq('is_hidden', false);
    }
    
    // If photoUrl is provided, also search by URL
    if (photoUrl) {
      // Extract thumbnail filename pattern from URL for matching
      const urlParts = photoUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      if (filename) {
        query = query
          .or(`photo_url.ilike.%${filename}%`)
          .eq('is_hidden', false);
      }
    }
    // Otherwise, return all comments (for admin panel) including hidden ones

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Fetched', data?.length || 0, 'comments for photoId:', photoId);

    // Map to frontend format
    const comments = data?.map((comment: any) => ({
      id: comment.id,
      photoId: comment.photo_id,
      guestName: comment.guest_name,
      guestEmail: comment.guest_email || '',
      comment: comment.comment,
      avatar: comment.avatar || '{"icon":"User","color":"#C5A572"}',
      createdAt: comment.created_at,
      hidden: comment.is_hidden || false,
      photoUrl: comment.photo_url || null,
      eventTitle: comment.event_title || null,
    })) || [];

    return NextResponse.json(comments);
  } catch (error) {
    console.error('❌ Comments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/comments - Add a new comment
export async function POST(request: NextRequest) {
  try {
    // Use admin client if available, otherwise use public client
    const client = supabaseAdmin || supabase;
    
    if (!client) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = commentSchema.parse(body);

    const { data, error } = await client
      .from('photo_comments')
      .insert({
        photo_id: validatedData.photoId,
        guest_name: validatedData.guestName,
        guest_email: validatedData.guestEmail,
        comment: validatedData.comment,
        avatar: validatedData.avatar,
        photo_url: validatedData.photoUrl,
        event_title: validatedData.eventTitle,
        is_hidden: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding comment:', error);
      return NextResponse.json(
        { error: 'Failed to add comment', details: error.message },
        { status: 500 }
      );
    }

    // Return in frontend format
    const comment = {
      id: data.id,
      photoId: data.photo_id,
      guestName: data.guest_name,
      guestEmail: data.guest_email || '',
      comment: data.comment,
      avatar: data.avatar,
      createdAt: data.created_at,
      hidden: data.is_hidden || false,
      photoUrl: data.photo_url,
      eventTitle: data.event_title,
    };

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      console.error('Validation error:', errorMessages);
      return NextResponse.json(
        { error: 'Validation error', message: errorMessages },
        { status: 400 }
      );
    }

    console.error('Comments POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/comments - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    // Use admin client if available, otherwise use public client
    const client = supabaseAdmin || supabase;
    
    if (!client) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const { error } = await client
      .from('photo_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json(
        { error: 'Failed to delete comment', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Comments DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/comments - Toggle comment visibility
export async function PATCH(request: NextRequest) {
  try {
    // Use admin client if available, otherwise use public client
    const client = supabaseAdmin || supabase;
    
    if (!client) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!commentId || !action) {
      return NextResponse.json(
        { error: 'Comment ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'toggleVisibility') {
      // Get current status
      const { data: comment, error: fetchError } = await client
        .from('photo_comments')
        .select('is_hidden')
        .eq('id', commentId)
        .single();

      if (fetchError) {
        console.error('Error fetching comment:', fetchError);
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }

      // Toggle visibility
      const { data: updatedComment, error: updateError } = await client
        .from('photo_comments')
        .update({ is_hidden: !comment.is_hidden })
        .eq('id', commentId)
        .select('is_hidden')
        .single();

      if (updateError) {
        console.error('Error updating comment visibility:', updateError);
        return NextResponse.json(
          { error: 'Failed to update comment visibility', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        hidden: updatedComment?.is_hidden,
        message: updatedComment?.is_hidden ? 'Comment hidden' : 'Comment visible'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Comments PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
