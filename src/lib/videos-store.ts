// Videos Store - Centralized video management with Supabase sync

import { Video } from './mock-data';
import { supabase } from './supabase';

export type { Video };

// Extended Video type with Supabase fields
export interface VideoWithSupabase extends Video {
  supabaseId?: string;
  eventId?: string;
  supabaseEventId?: string;
}

// Helper to delete a file from R2 via API
async function deleteFromR2Api(url: string): Promise<boolean> {
  try {
    const response = await fetch('/api/upload/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-upload-token',
      },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error(`R2 delete API error for ${url}:`, response.status, data.error || response.statusText);
      return false;
    }
    console.log(`Successfully deleted from R2: ${url}`);
    return true;
  } catch (err) {
    console.error(`Failed to call R2 delete API for ${url}:`, err);
    return false;
  }
}

/**
 * Get all videos from Supabase
 */
export async function getVideosFromSupabase(): Promise<VideoWithSupabase[]> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos from Supabase:', error);
      return [];
    }

    // Map Supabase data to Video format
    return (data || []).map((video: any) => ({
      id: video.id,
      supabaseId: video.id,
      url: video.url,
      thumbnail: video.thumbnail_url || '',
      title: video.title || 'Video',
      type: video.type === 'youtube' ? 'youtube' : 'upload',
      uploadedAt: video.uploaded_at || video.created_at,
      eventId: video.event_id,
      supabaseEventId: video.event_id,
    }));
  } catch (err) {
    console.error('Error in getVideosFromSupabase:', err);
    return [];
  }
}

/**
 * Get videos for a specific event from Supabase
 */
export async function getEventVideos(eventId: string): Promise<VideoWithSupabase[]> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching event videos from Supabase:', error);
      return [];
    }

    return (data || []).map((video: any) => ({
      id: video.id,
      supabaseId: video.id,
      url: video.url,
      thumbnail: video.thumbnail_url || '',
      title: video.title || 'Video',
      type: video.type === 'youtube' ? 'youtube' : 'upload',
      uploadedAt: video.uploaded_at || video.created_at,
      eventId: video.event_id,
      supabaseEventId: video.event_id,
    }));
  } catch (err) {
    console.error('Error in getEventVideos:', err);
    return [];
  }
}

/**
 * Get video count from Supabase
 */
export async function getVideoCount(): Promise<number> {
  if (!supabase || typeof supabase.from !== 'function') {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting video count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error in getVideoCount:', err);
    return 0;
  }
}

/**
 * Add a video to Supabase via API
 */
export async function addVideo(video: VideoWithSupabase, eventId: string): Promise<VideoWithSupabase | null> {
  try {
    const response = await fetch('/api/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId, video }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error adding video to Supabase:', data.error);
      return null;
    }

    console.log(`Added video to Supabase: ${data.video.id} for event ${eventId}`);
    
    return {
      ...video,
      id: data.video.id,
      supabaseId: data.video.id,
      supabaseEventId: eventId,
    };
  } catch (err) {
    console.error('Error in addVideo:', err);
    return null;
  }
}

/**
 * Delete a video from Supabase and R2
 */
export async function deleteVideo(videoId: string, videoUrl?: string, thumbnailUrl?: string): Promise<boolean> {
  try {
    // Delete video file from R2 if URL is provided
    if (videoUrl && videoUrl.startsWith('http')) {
      console.log(`Deleting video from R2: ${videoUrl}`);
      await deleteFromR2Api(videoUrl);
    }

    // Delete thumbnail from R2 (if not a YouTube thumbnail)
    if (thumbnailUrl && thumbnailUrl.startsWith('http') && 
        !thumbnailUrl.includes('youtube.com') && !thumbnailUrl.includes('ytimg.com')) {
      console.log(`Deleting video thumbnail from R2: ${thumbnailUrl}`);
      await deleteFromR2Api(thumbnailUrl);
      
      // Also delete the thumb- prefixed version that the image upload API creates
      // The image upload API creates: timestamp-filename.webp AND timestamp-thumb-filename.webp
      // So we need to derive the thumb- version from the main thumbnail URL
      const thumbVersionUrl = thumbnailUrl.replace(/\/(\d+-)([^/]+)$/, '/$1thumb-$2');
      if (thumbVersionUrl !== thumbnailUrl) {
        console.log(`Deleting video thumbnail's thumb version from R2: ${thumbVersionUrl}`);
        await deleteFromR2Api(thumbVersionUrl);
      }
    }

    // Delete from Supabase via API
    const response = await fetch(`/api/videos?id=${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error('Error deleting video from Supabase:', data.error);
      // Don't return false here - R2 deletion may have succeeded
    } else {
      console.log(`Deleted video ${videoId} from Supabase`);
    }

    return true;
  } catch (err) {
    console.error('Error in deleteVideo:', err);
    return false;
  }
}

/**
 * Update videos for an event - syncs local videos array to Supabase
 * This handles adding new videos and removing deleted ones
 */
export async function syncEventVideos(eventId: string, localVideos: Video[]): Promise<void> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured');
    return;
  }

  try {
    // Get existing videos from Supabase
    const existingVideos = await getEventVideos(eventId);
    const existingIds = new Set(existingVideos.map(v => v.supabaseId));
    const localIds = new Set(localVideos.map(v => v.id));

    // Find videos to add (in local but not in Supabase)
    const videosToAdd = localVideos.filter(v => !existingIds.has(v.id));
    
    // Find videos to delete (in Supabase but not in local)
    const videosToDelete = existingVideos.filter(v => v.supabaseId && !localIds.has(v.supabaseId));

    // Add new videos
    for (const video of videosToAdd) {
      await addVideo(video, eventId);
    }

    // Delete removed videos
    for (const video of videosToDelete) {
      if (video.supabaseId) {
        await deleteVideo(video.supabaseId, video.url, video.thumbnail);
      }
    }

    console.log(`Synced videos for event ${eventId}: added ${videosToAdd.length}, deleted ${videosToDelete.length}`);
  } catch (err) {
    console.error('Error in syncEventVideos:', err);
  }
}

/**
 * Upload a video file to R2
 */
export async function uploadVideoToR2(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'videos');

    const response = await fetch('/api/upload/video', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    console.error('Video upload error:', error);
    return {
      success: false,
      error: 'Failed to upload video',
    };
  }
}
