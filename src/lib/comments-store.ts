// Comments Store - Centralized photo comments management with Supabase integration

import { PhotoComment, mockPhotoComments } from './mock-data';
import { supabaseAdmin } from './supabase';

const COMMENTS_KEY = 'photoComments';

// Get comments from Supabase
export async function getCommentsFromSupabase(photoId?: string): Promise<PhotoComment[]> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured, using localStorage');
    return photoId ? getCommentsByPhoto(photoId) : getComments();
  }

  try {
    let query = supabaseAdmin
      .from('photo_comments')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (photoId) {
      query = query.eq('photo_id', photoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map database fields to PhotoComment interface
    return data?.map((comment: any) => ({
      id: comment.id,
      photoId: comment.photo_id,
      guestName: comment.guest_name,
      guestEmail: comment.guest_email || '',
      comment: comment.comment || comment.comment_text,
      avatar: comment.avatar || '{"icon":"User","color":"#C5A572"}',
      createdAt: comment.created_at,
      hidden: comment.is_hidden || false,
    })) || [];
  } catch (error) {
    console.error('Error fetching comments from Supabase:', error);
    return photoId ? getCommentsByPhoto(photoId) : getComments();
  }
}

export function getComments(): PhotoComment[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(COMMENTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }

  return [];
}

export function saveComments(comments: PhotoComment[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('commentsUpdated', { detail: comments }));
  } catch (error) {
    console.error('Error saving comments:', error);
  }
}

export async function addComment(comment: PhotoComment): Promise<void> {
  // Add to Supabase
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('photo_comments')
        .insert({
          photo_id: comment.photoId,
          guest_name: comment.guestName,
          guest_email: comment.guestEmail,
          comment: comment.comment,
          avatar: comment.avatar,
          is_hidden: false,
        });

      if (error) throw error;

      // Also update localStorage
      const comments = getComments();
      comments.unshift(comment);
      saveComments(comments);
      
      return;
    } catch (error) {
      console.error('Error adding comment to Supabase:', error);
    }
  }

  // Fallback to localStorage only
  const comments = getComments();
  comments.unshift(comment);
  saveComments(comments);
}

export async function updateComment(updatedComment: PhotoComment): Promise<void> {
  // Update in Supabase
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('photo_comments')
        .update({
          guest_name: updatedComment.guestName,
          guest_email: updatedComment.guestEmail,
          comment: updatedComment.comment,
          avatar: updatedComment.avatar,
          is_hidden: updatedComment.hidden,
        })
        .eq('id', updatedComment.id);

      if (error) throw error;

      // Also update localStorage
      const comments = getComments();
      const index = comments.findIndex(c => c.id === updatedComment.id);
      if (index !== -1) {
        comments[index] = updatedComment;
        saveComments(comments);
      }
      
      return;
    } catch (error) {
      console.error('Error updating comment in Supabase:', error);
    }
  }

  // Fallback to localStorage only
  const comments = getComments();
  const index = comments.findIndex(c => c.id === updatedComment.id);
  if (index !== -1) {
    comments[index] = updatedComment;
    saveComments(comments);
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    // Use the API endpoint to delete
    const response = await fetch(`/api/comments?id=${commentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete comment');
    }

    // Also update localStorage
    const comments = getComments();
    const filtered = comments.filter(c => c.id !== commentId);
    saveComments(filtered);
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

export async function toggleCommentVisibility(commentId: string, hideIt?: boolean): Promise<void> {
  try {
    // Use the API endpoint to toggle visibility
    const response = await fetch(`/api/comments?id=${commentId}&action=toggleVisibility`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to toggle comment visibility');
    }

    const result = await response.json();

    // Also update localStorage
    const comments = getComments();
    const localComment = comments.find(c => c.id === commentId);
    if (localComment) {
      // Use the hideIt parameter if provided, otherwise use the result from API
      localComment.hidden = hideIt !== undefined ? hideIt : result.hidden;
      saveComments(comments);
    }
  } catch (error) {
    console.error('Error toggling comment visibility:', error);
    throw error;
  }
}

export function getCommentsByPhoto(photoId: string): PhotoComment[] {
  const comments = getComments();
  return comments.filter(c => c.photoId === photoId);
}
