// Photos Store - Centralized photo management with localStorage persistence and Supabase sync

import { Photo, mockPhotos } from './mock-data';
import { supabase } from './supabase';

const PHOTOS_KEY = 'event_photos';

export type { Photo };

export function getPhotos(): Photo[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(PHOTOS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading photos:', error);
  }

  return [];
}

export function savePhotos(photos: Photo[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('photosUpdated', { detail: photos }));
  } catch (error) {
    console.error('Error saving photos:', error);
  }
}

export async function addPhotos(newPhotos: Photo[]): Promise<void> {
  const photos = getPhotos();
  photos.push(...newPhotos);
  savePhotos(photos);

  // Best-effort: sync to Supabase
  if (supabase && typeof supabase.from === 'function') {
    for (const photo of newPhotos) {
      // Only insert if we have the Supabase event ID
      if (!photo.supabaseEventId) {
        console.warn(`Photo ${photo.id} has no supabaseEventId; skipping Supabase sync. Event must be created in Supabase first.`);
        continue;
      }

      try {
        // Don't pass the local ID - let Supabase generate UUID
        const { data, error } = await supabase
          .from('photos')
          .insert({
            event_id: photo.supabaseEventId, // Use Supabase event UUID
            url: photo.url,
            thumbnail_url: photo.thumbnail,
            alt_text: '',
            display_order: 0,
            width: photo.width || null,
            height: photo.height || null,
            orientation: photo.orientation || null,
            file_size: photo.fileSize || null,
            mime_type: photo.mimeType || null,
          })
          .select()
          .single();
        
        if (error) {
          console.error(`Failed to sync photo ${photo.id} to Supabase:`, error.message);
        } else {
          console.log(`Synced photo ${photo.id} to Supabase with UUID ${data?.id} for event ${photo.supabaseEventId}`);
          // Store the Supabase UUID back in local storage
          if (data?.id) {
            photo.supabasePhotoId = data.id;
            // Update the photo in localStorage with the new supabasePhotoId
            const allPhotos = getPhotos();
            const photoIndex = allPhotos.findIndex(p => p.id === photo.id);
            if (photoIndex !== -1) {
              allPhotos[photoIndex].supabasePhotoId = data.id;
              savePhotos(allPhotos);
              console.log(`Saved supabasePhotoId ${data.id} for photo ${photo.id}`);
            }
          }
        }
      } catch (err: any) {
        console.error(`Failed to sync photo ${photo.id} to Supabase:`, err?.message || err);
      }
    }
  } else {
    console.warn('Supabase not configured; photos saved locally only');
  }
}

export function addPhoto(photo: Photo): void {
  const photos = getPhotos();
  photos.push(photo);
  savePhotos(photos);
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

// Helper to derive thumbnail URL from main image URL
// Upload creates thumbnails with pattern: folder/timestamp-thumb-filename.webp
function deriveThumbnailUrl(mainUrl: string): string | null {
  if (!mainUrl || !mainUrl.startsWith('http')) return null;
  
  // Pattern: https://domain.com/folder/1234567890-filename.webp
  // Thumbnail: https://domain.com/folder/1234567890-thumb-filename.webp
  const match = mainUrl.match(/^(.+\/)(\d+-)(.+)$/);
  if (match) {
    return `${match[1]}${match[2]}thumb-${match[3]}`;
  }
  return null;
}

export async function deletePhoto(photoId: string, photoUrl?: string, thumbnailUrl?: string): Promise<void> {
  const photos = getPhotos();
  const photoToDelete = photos.find(p => p.id === photoId);
  const urlToDelete = photoUrl || photoToDelete?.url;
  
  // Check for thumbnail in multiple possible properties (thumbnail, thumbnail_url)
  // Also support deriving thumbnail from main URL if not explicitly provided
  let thumbToDelete = thumbnailUrl || 
    photoToDelete?.thumbnail || 
    (photoToDelete as any)?.thumbnail_url;
  
  // If no thumbnail found, try to derive it from the main URL
  if (!thumbToDelete && urlToDelete) {
    thumbToDelete = deriveThumbnailUrl(urlToDelete);
    if (thumbToDelete) {
      console.log(`Derived thumbnail URL from main URL: ${thumbToDelete}`);
    }
  }
  
  const supabasePhotoId = photoToDelete?.supabasePhotoId;
  
  // Remove from local storage
  const filtered = photos.filter(p => p.id !== photoId);
  savePhotos(filtered);

  // Delete main photo from R2 if we have a URL
  if (urlToDelete && urlToDelete.startsWith('http')) {
    console.log(`Deleting photo from R2: ${urlToDelete}`);
    await deleteFromR2Api(urlToDelete);
  }

  // Delete thumbnail from R2 if we have a URL and it's different from main
  if (thumbToDelete && thumbToDelete.startsWith('http') && thumbToDelete !== urlToDelete) {
    console.log(`Deleting thumbnail from R2: ${thumbToDelete}`);
    await deleteFromR2Api(thumbToDelete);
  }

  // Delete from Supabase using the Supabase UUID (not local ID)
  if (supabase && supabasePhotoId) {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', supabasePhotoId);
      if (error) {
        console.warn(`Failed to delete photo ${supabasePhotoId} from Supabase:`, error.message);
      } else {
        console.log(`Deleted photo ${supabasePhotoId} from Supabase`);
      }
    } catch (err: any) {
      console.warn(`Failed to delete photo ${supabasePhotoId} from Supabase:`, err?.message || err);
    }
  } else if (supabase && urlToDelete) {
    // Fallback: try to delete by URL if we don't have the Supabase ID
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('url', urlToDelete);
      if (error) {
        console.warn(`Failed to delete photo by URL from Supabase:`, error.message);
      } else {
        console.log(`Deleted photo by URL from Supabase`);
      }
    } catch (err: any) {
      console.warn(`Failed to delete photo by URL from Supabase:`, err?.message || err);
    }
  }
}

export function getPhotosByEvent(eventId: string): Photo[] {
  const photos = getPhotos();
  return photos.filter(photo => photo.eventId === eventId);
}

export function updatePhoto(updatedPhoto: Photo): void {
  const photos = getPhotos();
  const index = photos.findIndex(p => p.id === updatedPhoto.id);
  if (index !== -1) {
    photos[index] = updatedPhoto;
    savePhotos(photos);
  }
}

/**
 * Fetch photos with event and category information from Supabase
 * Returns photos with enriched event context
 */
export async function getPhotosWithEventContext(): Promise<any[]> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('photos_with_event_details')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos with event context:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getPhotosWithEventContext:', err);
    return [];
  }
}

/**
 * Fetch photos for a specific event with category information
 */
export async function getEventPhotosWithCategory(eventId: string): Promise<any[]> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .rpc('get_event_photos_with_category', { event_uuid: eventId });

    if (error) {
      console.error('Error fetching event photos with category:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getEventPhotosWithCategory:', err);
    return [];
  }
}

/**
 * Get photo statistics grouped by category
 */
export async function getPhotosByCategory(): Promise<any[]> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .rpc('get_photos_by_category');

    if (error) {
      console.error('Error fetching photos by category:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getPhotosByCategory:', err);
    return [];
  }
}

/**
 * Get all photos from Supabase
 * Returns photos from database, falling back to localStorage if Supabase fails
 */
export async function getPhotosFromSupabase(): Promise<Photo[]> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured, using localStorage');
    return getPhotos();
  }

  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos from Supabase:', error);
      return getPhotos();
    }

    // Map Supabase data to Photo format
    return (data || []).map((photo: any) => ({
      id: photo.id,
      url: photo.url,
      thumbnail: photo.thumbnail_url || photo.url,
      eventId: photo.event_id || '',
      supabaseEventId: photo.event_id,
      supabasePhotoId: photo.id,
      uploadedAt: photo.created_at || new Date().toISOString(),
      width: photo.width,
      height: photo.height,
    }));
  } catch (err) {
    console.error('Error in getPhotosFromSupabase:', err);
    return getPhotos();
  }
}

/**
 * Get photo count from Supabase
 */
export async function getPhotoCount(): Promise<number> {
  if (!supabase || typeof supabase.from !== 'function') {
    return getPhotos().length;
  }

  try {
    const { count, error } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting photo count:', error);
      return getPhotos().length;
    }

    return count || 0;
  } catch (err) {
    console.error('Error in getPhotoCount:', err);
    return getPhotos().length;
  }
}
