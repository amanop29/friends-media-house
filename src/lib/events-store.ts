// Events Store - Centralized event management with localStorage persistence

import { Event, mockEvents } from './mock-data';
import { supabase } from './supabase';
import { getPhotosByEvent } from './photos-store';
import { syncEventVideos, deleteVideo, getEventVideos } from './videos-store';

const EVENTS_KEY = 'events';

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

export type { Event };

// Generate URL-friendly slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getEvents(): Event[] {
  if (typeof window === 'undefined') {
    return mockEvents;
  }

  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    if (stored) {
      const events = JSON.parse(stored);
      // Ensure all events have slugs (migration)
      let needsUpdate = false;
      const updatedEvents = events.map((event: Event) => {
        if (!event.slug) {
          needsUpdate = true;
          return { ...event, slug: generateSlug(event.title) };
        }
        return event;
      });
      
      if (needsUpdate) {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
        return updatedEvents;
      }
      
      return events;
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }

  // Initialize with mock events if nothing stored
  localStorage.setItem(EVENTS_KEY, JSON.stringify(mockEvents));
  return mockEvents;
}

export function saveEvents(events: Event[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Clean up any base64 images before saving (they should be R2 URLs)
    const cleanedEvents = events.map(event => {
      // If coverImage is a base64 data URL, it's too large - replace with placeholder
      if (event.coverImage && event.coverImage.startsWith('data:')) {
        console.warn(`Event "${event.title}" has base64 image. This should be an R2 URL.`);
        // Keep the base64 but truncate if it's causing issues
        // In production, this should never happen as images should go to R2
      }
      return event;
    });
    
    localStorage.setItem(EVENTS_KEY, JSON.stringify(cleanedEvents));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('eventsUpdated', { detail: cleanedEvents }));
  } catch (error: any) {
    console.error('Error saving events:', error);
    
    // Handle quota exceeded error
    if (error?.name === 'QuotaExceededError' || error?.code === 22) {
      console.error('localStorage quota exceeded. Attempting to clean up...');
      
      // Try to clean up base64 images and retry
      const cleanedEvents = events.map(event => ({
        ...event,
        // Remove base64 images that are causing the quota issue
        coverImage: event.coverImage?.startsWith('data:') 
          ? 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800' // Fallback image
          : event.coverImage
      }));
      
      try {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(cleanedEvents));
        window.dispatchEvent(new CustomEvent('eventsUpdated', { detail: cleanedEvents }));
        console.log('Successfully saved events after cleanup');
      } catch (retryError) {
        console.error('Still failed after cleanup:', retryError);
        throw new Error('Storage quota exceeded. Please delete some events or clear browser data.');
      }
    } else {
      throw error;
    }
  }
}

export function addEvent(event: Event): void {
  // Auto-generate slug if not provided
  if (!event.slug) {
    event.slug = generateSlug(event.title);
  }
  
  const events = getEvents();
  events.unshift(event); // Add to beginning
  saveEvents(events);
}

export async function updateEvent(updatedEvent: Event, oldCoverImageUrl?: string, oldCoverThumbnailUrl?: string): Promise<void> {
  // Regenerate slug if not provided
  if (!updatedEvent.slug) {
    updatedEvent.slug = generateSlug(updatedEvent.title);
  }
  
  const events = getEvents();
  const index = events.findIndex(e => e.id === updatedEvent.id);
  
  // Get old cover image and thumbnail URLs before updating if not passed
  const previousCoverImage = oldCoverImageUrl || (index !== -1 ? events[index].coverImage : undefined);
  const previousCoverThumbnail = oldCoverThumbnailUrl || (index !== -1 ? events[index].coverThumbnail : undefined);
  
  if (index !== -1) {
    events[index] = updatedEvent;
    saveEvents(events);
  }

  // Delete old cover image from R2 if it changed
  // The delete API will validate that the URL belongs to R2
  if (previousCoverImage && 
      previousCoverImage !== updatedEvent.coverImage && 
      previousCoverImage.startsWith('http')) {
    console.log(`Cover image changed, deleting old cover from R2: ${previousCoverImage}`);
    await deleteFromR2Api(previousCoverImage);
    
    // Delete the stored thumbnail URL if available
    if (previousCoverThumbnail && previousCoverThumbnail.startsWith('http')) {
      console.log(`Deleting old cover thumbnail from R2: ${previousCoverThumbnail}`);
      await deleteFromR2Api(previousCoverThumbnail);
    }
  }

  // Best-effort: sync to Supabase
  if (supabase && updatedEvent.supabaseId) {
    try {
      // Map category to valid event_type enum values
      const categoryMap: Record<string, string> = {
        'wedding': 'wedding',
        'pre-wedding': 'pre-wedding',
        'prewedding': 'pre-wedding',
        'engagement': 'engagement',
        'reception': 'reception',
        'jainism': 'jainism',
        'birthday': 'birthday',
        'corporate': 'corporate',
        'event': 'event',
        'events': 'event',
        'film': 'film',
        'films': 'film',
      };
      const normalizedCategory = updatedEvent.category?.toLowerCase() || 'event';
      const mappedCategory = categoryMap[normalizedCategory] || 'other';
      
      // Determine if this is a custom category
      const isCustomCategory = !categoryMap[normalizedCategory];

      await supabase
        .from('events')
        .update({
          title: updatedEvent.title,
          slug: updatedEvent.slug,
          couple_names: updatedEvent.coupleNames,
          date: updatedEvent.date || new Date().toISOString().split('T')[0],
          location: updatedEvent.location || '',
          category: mappedCategory,
          custom_category: isCustomCategory ? normalizedCategory : null, // Store custom category name
          cover_image_url: updatedEvent.coverImage,
          is_visible: updatedEvent.isVisible ?? true,
          is_featured: updatedEvent.isFeatured ?? false,
        })
        .eq('id', updatedEvent.supabaseId);
      
      console.log(`Updated event ${updatedEvent.supabaseId} in Supabase`);
      
      // Sync videos to Supabase
      if (updatedEvent.videos && updatedEvent.videos.length >= 0) {
        try {
          await syncEventVideos(updatedEvent.supabaseId, updatedEvent.videos);
        } catch (videoErr) {
          console.warn('Failed to sync videos:', videoErr);
        }
      }
    } catch (err: any) {
      console.warn('Failed to update event in Supabase:', err?.message || err);
    }
  }
}

// Delete event locally + Supabase + R2 (best effort)
export async function deleteEvent(event: Event): Promise<void> {
  // 1) Get all photos for this event BEFORE deleting from stores
  // Check both local eventId and supabaseEventId to catch all photos
  let allPhotos = getPhotosByEvent(event.id);
  if (event.supabaseId) {
    const supabasePhotos = getPhotosByEvent(event.supabaseId);
    allPhotos = [...new Set([...allPhotos, ...supabasePhotos])]; // Deduplicate
  }
  console.log(`Found ${allPhotos.length} photos to delete for event ${event.id} (Supabase: ${event.supabaseId})`);

  // 1b) Get all videos for this event
  let allVideos = event.videos || [];
  if (event.supabaseId) {
    try {
      const supabaseVideos = await getEventVideos(event.supabaseId);
      allVideos = [...allVideos, ...supabaseVideos];
    } catch (err) {
      console.warn('Failed to fetch videos from Supabase:', err);
    }
  }
  console.log(`Found ${allVideos.length} videos to delete for event ${event.id}`);

  // 2) Delete all photo files from R2 in parallel (the delete API validates URL ownership)
  const photoDeletePromises = allPhotos.flatMap(photo => {
    const promises = [];
    if (photo.url && photo.url.startsWith('http')) {
      console.log(`Deleting photo from R2: ${photo.url}`);
      promises.push(deleteFromR2Api(photo.url));
    }
    // Also delete thumbnail if available
    const thumbUrl = photo.thumbnail || (photo as any).thumbnail_url;
    if (thumbUrl && thumbUrl.startsWith('http') && thumbUrl !== photo.url) {
      console.log(`Deleting photo thumbnail from R2: ${thumbUrl}`);
      promises.push(deleteFromR2Api(thumbUrl));
    }
    return promises;
  });

  // 2b) Delete all video files from R2 in parallel
  const videoDeletePromises = allVideos.flatMap(video => {
    const promises = [];
    if (video.type === 'upload' && video.url && video.url.startsWith('http')) {
      console.log(`Deleting video from R2: ${video.url}`);
      promises.push(deleteFromR2Api(video.url));
    }
    // Delete video thumbnail from R2 (if not a YouTube thumbnail)
    if (video.thumbnail && video.thumbnail.startsWith('http') && 
        !video.thumbnail.includes('youtube.com') && !video.thumbnail.includes('ytimg.com')) {
      console.log(`Deleting video thumbnail from R2: ${video.thumbnail}`);
      promises.push(deleteFromR2Api(video.thumbnail));
    }
    return promises;
  });

  // 3) Delete cover image from R2 in parallel (the delete API validates URL ownership)
  const coverDeletePromises = [];
  if (event.coverImage && event.coverImage.startsWith('http')) {
    console.log(`Deleting cover image from R2: ${event.coverImage}`);
    coverDeletePromises.push(deleteFromR2Api(event.coverImage));
    
    // Delete stored cover thumbnail
    if (event.coverThumbnail && event.coverThumbnail.startsWith('http')) {
      console.log(`Deleting cover thumbnail from R2: ${event.coverThumbnail}`);
      coverDeletePromises.push(deleteFromR2Api(event.coverThumbnail));
    }
  }

  // Delete all R2 files in parallel
  await Promise.allSettled([...photoDeletePromises, ...videoDeletePromises, ...coverDeletePromises]);

  // 4) Delete photos from Supabase (both by event_id and using supabaseEventId)
  try {
    if (supabase && event.supabaseId) {
      // Delete all photos with matching event_id
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('event_id', event.supabaseId);
      if (error) {
        console.warn('Supabase photos delete failed:', error);
      } else {
        console.log(`Deleted ${allPhotos.length} photos from Supabase for event ${event.supabaseId}`);
      }
    }
  } catch (err) {
    console.warn('Error deleting photos in Supabase:', err);
  }

  // 4b) Delete videos from Supabase (cascade should handle this, but be explicit)
  try {
    if (supabase && event.supabaseId) {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('event_id', event.supabaseId);
      if (error) {
        console.warn('Supabase videos delete failed:', error);
      } else {
        console.log(`Deleted ${allVideos.length} videos from Supabase for event ${event.supabaseId}`);
      }
    }
  } catch (err) {
    console.warn('Error deleting videos in Supabase:', err);
  }

  // 5) Delete event from Supabase
  try {
    if (supabase) {
      const query = supabase.from('events');
      const target = event.supabaseId ? { id: event.supabaseId } : event.slug ? { slug: event.slug } : { slug: generateSlug(event.title) };
      const { error } = await query.delete().match(target);
      if (error) {
        console.warn('Supabase event delete failed:', error);
      } else {
        console.log(`Deleted event from Supabase: ${event.title}`);
      }
    }
  } catch (err) {
    console.warn('Error deleting event in Supabase:', err);
  }

  // 6) Remove photos from local store (by both eventId and supabaseEventId)
  try {
    const PHOTOS_KEY = 'event_photos';
    const storedPhotos = localStorage.getItem(PHOTOS_KEY);
    if (storedPhotos) {
      const allStoredPhotos = JSON.parse(storedPhotos);
      const remainingPhotos = allStoredPhotos.filter((p: any) => 
        p.eventId !== event.id && p.supabaseEventId !== event.supabaseId
      );
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(remainingPhotos));
      console.log(`Removed ${allStoredPhotos.length - remainingPhotos.length} photos from localStorage`);
    }
  } catch (err) {
    console.warn('Error removing photos from localStorage:', err);
  }

  // 7) Remove event from local store
  const events = getEvents();
  const filtered = events.filter(e => e.id !== event.id);
  saveEvents(filtered);
  console.log(`Event "${event.title}" deleted successfully`);
}

export async function toggleEventVisibility(eventId: string, newVisibility?: boolean): Promise<void> {
  const events = getEvents();
  const event = events.find(e => e.id === eventId);
  if (event) {
    event.isVisible = newVisibility !== undefined ? newVisibility : !event.isVisible;
    saveEvents(events);
    
    // Sync to Supabase if available
    if (supabase && event.supabaseId) {
      try {
        const { error } = await supabase
          .from('events')
          .update({ is_visible: event.isVisible })
          .eq('id', event.supabaseId);
        
        if (error) {
          console.warn('Failed to sync visibility to Supabase:', error);
        } else {
          console.log(`Event visibility updated in Supabase: ${event.supabaseId} -> ${event.isVisible}`);
        }
      } catch (err) {
        console.warn('Error syncing visibility to Supabase:', err);
      }
    }
  }
}

/**
 * Get all events from Supabase
 * Returns events from database, falling back to localStorage if Supabase fails
 */
export async function getEventsFromSupabase(): Promise<Event[]> {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured, using localStorage');
    return getEvents();
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events from Supabase:', error);
      return getEvents();
    }

    // Map Supabase data to Event format
    return (data || []).map((event: any) => ({
      id: event.id,
      supabaseId: event.id,
      title: event.title,
      slug: event.slug,
      coupleNames: event.couple_names || '',
      date: event.date,
      location: event.location || '',
      category: event.custom_category || event.category || 'other', // Use custom category if available
      coverImage: event.cover_image_url || '',
      description: event.description || '',
      isVisible: event.is_visible ?? true,
      isFeatured: event.is_featured ?? false,
      photoCount: event.photo_count || 0,
      videos: [],
    }));
  } catch (err) {
    console.error('Error in getEventsFromSupabase:', err);
    return getEvents();
  }
}

/**
 * Get event count from Supabase
 */
export async function getEventCount(): Promise<number> {
  if (!supabase || typeof supabase.from !== 'function') {
    return getEvents().length;
  }

  try {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting event count:', error);
      return getEvents().length;
    }

    return count || 0;
  } catch (err) {
    console.error('Error in getEventCount:', err);
    return getEvents().length;
  }
}