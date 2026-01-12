"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Search, Edit, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Upload, X, Video as VideoIcon, Image as ImageIcon, Filter } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { EditEventModal } from '../../components/EditEventModal';
import { AdminTableSkeleton } from '../../components/SkeletonComponents';
import { VideoManager } from '../../components/VideoManager';
import { Event, Photo, Video } from '../../lib/mock-data';
import { getEvents, saveEvents, deleteEvent as deleteEventFromStore, toggleEventVisibility, updateEvent } from '../../lib/events-store';
import { getPhotos, addPhotos, deletePhoto as deletePhotoFromStore, getPhotosByEvent } from '../../lib/photos-store';
import { getCategories, getCategoryDisplayName } from '../../lib/categories-store';
import { logActivity, getAdminEmail } from '../../lib/activity-log';
import { uploadToR2 } from '../../lib/upload-helper';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface UploadingPhoto {
  id: string;
  file: File;
  preview: string;
  progress: number;
  uploading: boolean;
  width?: number;
  height?: number;
}

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 4, height: 3 }); // Default fallback
    };
    img.src = URL.createObjectURL(file);
  });
};

export function ManageGalleries() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<{ [eventId: string]: UploadingPhoto[] }>({});
    const [uploadProgress, setUploadProgress] = useState<{ [eventId: string]: { current: number; total: number } }>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [photosVersion, setPhotosVersion] = useState(0); // Force re-render when photos change
  const [eventPhotosCache, setEventPhotosCache] = useState<{ [eventId: string]: Photo[] }>({}); // Cache photos from Supabase
  const [eventVideosCache, setEventVideosCache] = useState<{ [eventId: string]: Video[] }>({}); // Cache videos from Supabase

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      
      let loadedEvents: Event[] = [];
      
      // Try Supabase first
      try {
        if (supabase) {
          console.log('📡 ManageGalleries: Fetching events from Supabase...');
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!error && data && data.length > 0) {
            console.log('✅ ManageGalleries: Got', data.length, 'events from Supabase');
            loadedEvents = data.map((event: any) => ({
              id: event.id,
              supabaseId: event.id,
              title: event.title,
              slug: event.slug,
              description: event.description,
              date: event.date,
              location: event.location,
              category: event.custom_category || event.category, // Use custom category if available
              coverImage: event.cover_image || event.cover_image_url,
              coupleNames: event.couple_names,
              photoCount: event.photo_count || 0,
              videoCount: event.video_count || 0,
              isFeatured: event.is_featured,
              isVisible: event.is_visible,
              viewCount: event.view_count || 0,
            }));
          } else {
            console.warn('⚠️ ManageGalleries: Supabase returned no events or error:', error);
          }
        }
      } catch (err) {
        console.error('❌ ManageGalleries: Error fetching from Supabase:', err);
      }
      
      // Fallback to localStorage if Supabase failed
      if (loadedEvents.length === 0) {
        console.log('📂 ManageGalleries: Falling back to localStorage...');
        loadedEvents = await getEvents();
      }
      
      setEvents(loadedEvents);
      setIsLoading(false);
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const storedCategories = await getCategories();
      setCategories(storedCategories);
    };
    fetchCategories();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.coupleNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (eventId: string, eventTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      const target = events.find(e => e.id === eventId);
      if (!target) return;
      await deleteEventFromStore(target);
      setEvents(events.filter(e => e.id !== eventId));
      
      // Log activity
      try {
        await logActivity({
          entityType: 'event',
          entityId: target.supabaseId || target.id,
          action: 'delete',
          description: `Deleted event "${eventTitle}"`,
          adminEmail: getAdminEmail() || undefined,
        });
      } catch (logErr) {
        console.warn('Failed to log delete activity:', logErr);
      }
      
      toast.success('Event deleted successfully');
    }
  };

  const handleToggleVisibility = (eventId: string) => {
    setEvents(events.map(event => {
      if (event.id === eventId) {
        const newVisibility = !event.isVisible;
        toggleEventVisibility(eventId, newVisibility);
        toast.success(newVisibility ? 'Gallery is now visible on website' : 'Gallery is now hidden from website');
        return { ...event, isVisible: newVisibility };
      }
      return event;
    }));
  };

  const getEventPhotos = (eventId: string): Photo[] => {
    // Return cached photos from Supabase or localStorage fallback
    void photosVersion;
    if (eventPhotosCache[eventId]) {
      return eventPhotosCache[eventId];
    }
    // Fallback to localStorage while Supabase loads
    return getPhotosByEvent(eventId);
  };

  // Fetch photos from Supabase when event is expanded
  const fetchEventPhotos = async (eventId: string) => {
    if (!supabase) {
      return;
    }
    
    try {
      console.log('📷 Fetching photos from Supabase for event:', eventId);
      const { data: photos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      
      if (!error && photos) {
        console.log('✅ Got', photos.length, 'photos from Supabase for event:', eventId);
        const mappedPhotos: Photo[] = photos.map((photo: any) => ({
          id: photo.id,
          eventId: photo.event_id,
          url: photo.url,
          thumbnail: photo.thumbnail_url || photo.url,
          width: photo.width,
          height: photo.height,
          orientation: photo.orientation,
          supabasePhotoId: photo.id,
          supabaseEventId: photo.event_id,
        }));
        setEventPhotosCache(prev => ({ ...prev, [eventId]: mappedPhotos }));
      }
    } catch (err) {
      console.error('❌ Error fetching photos from Supabase:', err);
    }
  };

  // Fetch videos from Supabase when event is expanded
  const fetchEventVideos = async (eventId: string) => {
    if (!supabase) {
      return;
    }
    
    try {
      console.log('📹 Fetching videos from Supabase for event:', eventId);
      const { data: videos, error } = await supabase
        .from('videos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      
      if (!error && videos) {
        console.log('✅ Got', videos.length, 'videos from Supabase for event:', eventId);
        const mappedVideos: Video[] = videos.map((video: any) => ({
          id: video.id,
          url: video.url,
          thumbnail: video.thumbnail_url || '',
          title: video.title || '',
          type: video.type || 'youtube',
          uploadedAt: video.created_at || new Date().toISOString(),
        }));
        setEventVideosCache(prev => ({ ...prev, [eventId]: mappedVideos }));
        // Also update the event in state
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, videos: mappedVideos } : e));
      }
    } catch (err) {
      console.error('❌ Error fetching videos from Supabase:', err);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  const handleSaveEvent = async (updatedEvent: Event) => {
    // Get the old cover image and thumbnail before updating
    const oldEvent = events.find(e => e.id === updatedEvent.id);
    const oldCoverImage = oldEvent?.coverImage;
    const oldCoverThumbnail = oldEvent?.coverThumbnail;
    
    const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    
    // Also update in Supabase if needed (pass old cover image and thumbnail for R2 cleanup)
    try {
      await updateEvent(updatedEvent, oldCoverImage, oldCoverThumbnail);
    } catch (err) {
      console.warn('Failed to update event in store:', err);
    }
    
    // Log activity
    try {
      await logActivity({
        entityType: 'event',
        entityId: updatedEvent.supabaseId || updatedEvent.id,
        action: 'update',
        description: `Updated event "${updatedEvent.title}"`,
        adminEmail: getAdminEmail() || undefined,
      });
    } catch (logErr) {
      console.warn('Failed to log update activity:', logErr);
    }
    
    // Dispatch event to notify other components about the update
    window.dispatchEvent(new CustomEvent('eventsUpdated'));
    toast.success('Event updated successfully');
  };

  const handleDeletePhoto = async (photoId: string, eventId: string, eventTitle: string, photoUrl?: string, thumbnailUrl?: string) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      // Delete photo (from localStorage, R2, and Supabase) - includes thumbnail deletion
      await deletePhotoFromStore(photoId, photoUrl, thumbnailUrl);
      
      // Update the photos cache
      setEventPhotosCache(prev => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter(p => p.id !== photoId)
      }));
      
      setPhotosVersion(v => v + 1); // Force re-render to update photo list
      window.dispatchEvent(new CustomEvent('eventsUpdated')); // Notify other components
      
      // Log activity (use description instead of entityId for non-UUID)
      try {
        await logActivity({
          entityType: 'photo',
          action: 'delete',
          description: `Deleted photo (ID: ${photoId}) from event "${eventTitle}"`,
          adminEmail: getAdminEmail() || undefined,
        });
      } catch (logErr) {
        console.warn('Failed to log photo delete activity:', logErr);
      }
      
      toast.success('Photo deleted successfully');
    }
  };

  // Upload functionality
  const handleDragOver = (e: React.DragEvent, eventId: string) => {
    e.preventDefault();
    setIsDragging(eventId);
  };

  const handleDragLeave = () => {
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent, eventId: string) => {
    e.preventDefault();
    setIsDragging(null);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );
    handleFiles(files, eventId);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, eventId: string) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files, eventId);
    }
    // Reset input
    e.target.value = '';
  };

  const handleFiles = async (files: File[], eventId: string) => {
    // Get dimensions for all files
    const filesWithDimensions = await Promise.all(
      files.map(async (file, index) => {
        const dimensions = await getImageDimensions(file);
        return {
          id: `${Date.now()}-${index}`,
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          uploading: true,
          width: dimensions.width,
          height: dimensions.height,
        };
      })
    );
    const newPhotos: UploadingPhoto[] = filesWithDimensions;

    setUploadingPhotos(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), ...newPhotos]
    }));

    toast.success(`Uploading ${files.length} photo(s)...`);

    // Simulate upload progress
    newPhotos.forEach((photo, index) => {
      const interval = setInterval(() => {
        setUploadingPhotos((prev) => ({
          ...prev,
          [eventId]: (prev[eventId] || []).map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  progress: Math.min(p.progress + 10, 100),
                  uploading: p.progress < 90,
                }
              : p
          )
        }));
      }, 200 + index * 50);

      setTimeout(() => {
        clearInterval(interval);
        toast.success(`${photo.file.name} uploaded successfully!`);
      }, 2000 + index * 50);
    });
  };

  const removeUploadingPhoto = (eventId: string, photoId: string) => {
    setUploadingPhotos(prev => ({
      ...prev,
      [eventId]: (prev[eventId] || []).filter(p => p.id !== photoId)
    }));
  };

  const handleSavePhotos = async (eventId: string) => {
    const photos = uploadingPhotos[eventId] || [];
    
    if (photos.length === 0) {
      toast.error('No photos to save');
      return;
    }

    const event = events.find(e => e.id === eventId);
    if (!event) {
      toast.error('Event not found');
      return;
    }

    try {
      // Initialize progress tracking
      setUploadProgress(prev => ({
        ...prev,
        [eventId]: { current: 0, total: photos.length }
      }));

      const uploadToast = toast.loading(`Uploading 0/${photos.length} photos...`);

      // Upload photos one by one to track progress
      const r2UploadResults = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const result = await uploadToR2(photo.file, 'events');
          r2UploadResults.push({ id: photo.id, result });
          
          // Update progress
          const current = i + 1;
          setUploadProgress(prev => ({
            ...prev,
            [eventId]: { current, total: photos.length }
          }));
          toast.loading(`Uploading ${current}/${photos.length} photos...`, { id: uploadToast });
        } catch (err) {
          console.error(`Failed to upload ${photo.file.name} to R2:`, err);
          r2UploadResults.push({ id: photo.id, result: { success: false, error: String(err) } });
        }
      }
      
      toast.dismiss(uploadToast);

      // Build photo objects with R2 URLs (not local previews)
      const newPhotos = r2UploadResults
        .filter(({ result }) => result.success && result.url)
        .map(({ id, result }) => {
          // Find the original uploading photo to get dimensions
          const uploadingPhoto = photos.find(p => p.id === id);
          const width = uploadingPhoto?.width || 4;
          const height = uploadingPhoto?.height || 3;
          const orientation: 'portrait' | 'landscape' | 'square' = 
            width > height ? 'landscape' : width < height ? 'portrait' : 'square';
          
          return {
            id,
            url: result.url!,
            thumbnail: result.thumbnailUrl || result.url!, // Use thumbnailUrl if available
            eventId: eventId,
            supabaseEventId: event.supabaseId, // Required for Supabase sync
            tags: [],
            uploadedAt: new Date().toISOString(),
            width,
            height,
            orientation,
            fileSize: uploadingPhoto?.file.size || 0,
            mimeType: uploadingPhoto?.file.type || 'image/jpeg',
          };
        });

      if (newPhotos.length === 0) {
        const failed = r2UploadResults.filter(({ result }) => !result.success);
        console.error('R2 upload failed:', failed);
        toast.error(`Failed to upload ${failed.length} photo(s) to R2. Check console for details.`);
        return;
      }

      // Add photos to the store (also syncs to Supabase)
      await addPhotos(newPhotos);

      // Clear uploading photos and progress for this event
      setUploadingPhotos(prev => ({
        ...prev,
        [eventId]: []
      }));

      setUploadProgress(prev => {
        const newProg = { ...prev };
        delete newProg[eventId];
        return newProg;
      });

      // Update the photos cache with new photos
      setEventPhotosCache(prev => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), ...newPhotos]
      }));

      // Force re-render to update photo list
      setPhotosVersion(v => v + 1);

      // Also re-fetch from Supabase to get proper IDs
      setTimeout(() => fetchEventPhotos(eventId), 1000);

      toast.success(`${newPhotos.length} photo(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error saving photos:', error);
      toast.error(`Failed to save photos: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-[#2B2B2B] dark:text-white mb-6 md:mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
          Manage Galleries
        </h1>

        {/* Search Bar */}
        <GlassCard className="p-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/50 dark:bg-black/20 border border-black/20 dark:border-white/10 focus-within:border-[#C5A572] transition-colors">
            <Search className="w-5 h-5 text-[#707070] dark:text-[#A0A0A0] flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[#1A1A1A] dark:text-white placeholder:text-[#707070] dark:placeholder:text-[#A0A0A0]"
            />
          </div>
        </GlassCard>

        {/* Category Filter */}
        <GlassCard className="p-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/50 dark:bg-black/20 border border-black/20 dark:border-white/10 focus-within:border-[#C5A572] transition-colors">
            <Filter className="w-5 h-5 text-[#707070] dark:text-[#A0A0A0] flex-shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[#1A1A1A] dark:text-white placeholder:text-[#707070] dark:placeholder:text-[#A0A0A0]"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryDisplayName(category)}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        {/* Events List */}
        <div className="space-y-4">
          {isLoading ? (
            <AdminTableSkeleton />
          ) : (
            filteredEvents.map((event, index) => {
              const eventPhotos = getEventPhotos(event.id);
              const isExpanded = expandedEvent === event.id;
              const uploadPhotos = uploadingPhotos[event.id] || [];
              const isVisible = event.isVisible ?? true;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <GlassCard className="overflow-hidden">
                    {/* Event Header */}
                    <div className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <ImageWithFallback
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg md:text-xl text-[#2B2B2B] dark:text-white">
                              {event.title}
                            </h3>
                            {!isVisible && (
                              <span className="px-2 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-xs text-red-500">
                                Hidden
                              </span>
                            )}
                            {isVisible && (
                              <span className="px-2 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-xs text-green-500">
                                Visible
                              </span>
                            )}
                          </div>
                          <p className="text-[#707070] dark:text-[#A0A0A0] mb-2 text-sm md:text-base">
                            {event.coupleNames}
                          </p>
                          <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-[#707070] dark:text-[#A0A0A0]">
                            <span>
                              {new Date(event.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span>•</span>
                            <span className="truncate">{event.location}</span>
                            <span>•</span>
                            <span className="capitalize">{getCategoryDisplayName(event.category)}</span>
                            <span>•</span>
                            <span>{eventPhotos.length || event.photoCount || 0} photos</span>
                            <span>•</span>
                            <span>{event.videoCount || (event.videos || []).length || 0} videos</span>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0 self-start md:self-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newExpanded = isExpanded ? null : event.id;
                              setExpandedEvent(newExpanded);
                              // Fetch photos and videos from Supabase when expanding
                              if (newExpanded) {
                                fetchEventPhotos(event.id);
                                fetchEventVideos(event.id);
                              }
                            }}
                            className="rounded-full hover:bg-white/10 w-9 h-9 md:w-10 md:h-10"
                            title="Expand/Collapse"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />
                            ) : (
                              <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleVisibility(event.id)}
                            className={`rounded-full w-9 h-9 md:w-10 md:h-10 ${
                              isVisible
                                ? 'hover:bg-green-500/20 hover:text-green-500 text-green-500'
                                : 'hover:bg-red-500/20 hover:text-red-500 text-red-500'
                            }`}
                            title={isVisible ? 'Gallery Visible - Click to Hide' : 'Gallery Hidden - Click to Show'}
                          >
                            {isVisible ? (
                              <Eye className="w-4 h-4 md:w-5 md:h-5" />
                            ) : (
                              <EyeOff className="w-4 h-4 md:w-5 md:h-5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEvent(event)}
                            className="rounded-full hover:bg-[#C5A572]/20 hover:text-[#C5A572] w-9 h-9 md:w-10 md:h-10"
                            title="Edit Event"
                          >
                            <Edit className="w-4 h-4 md:w-5 md:h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(event.id, event.title)}
                            className="rounded-full hover:bg-red-500/20 hover:text-red-500 w-9 h-9 md:w-10 md:h-10"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-black/20 dark:border-white/10 overflow-hidden"
                        >
                          <div className="p-6 space-y-6">
                            {/* Upload Section */}
                            <div>
                              <h4 className="text-lg text-[#2B2B2B] dark:text-white mb-4">
                                Upload New Photos
                              </h4>
                              <div
                                onDragOver={(e) => handleDragOver(e, event.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, event.id)}
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                                  isDragging === event.id
                                    ? 'border-[#C5A572] bg-[#C5A572]/10'
                                    : 'border-black/20 dark:border-white/10'
                                }`}
                              >
                                <Upload className="w-12 h-12 text-[#C5A572] mx-auto mb-3" />
                                <p className="text-[#707070] dark:text-[#A0A0A0] mb-3">
                                  Drag & drop photos here or click to browse
                                </p>
                                <label htmlFor={`fileInput-${event.id}`}>
                                  <Button
                                    type="button"
                                    className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-6"
                                    onClick={() => document.getElementById(`fileInput-${event.id}`)?.click()}
                                  >
                                    Browse Files
                                  </Button>
                                </label>
                                <input
                                  id={`fileInput-${event.id}`}
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={(e) => handleFileInput(e, event.id)}
                                  className="hidden"
                                />
                              </div>
                            </div>

                            {/* Upload Progress */}
                            {uploadProgress[event.id]?.total ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-[#707070] dark:text-[#A0A0A0]">
                                    Uploading photos...
                                  </span>
                                  <span className="text-[#C5A572] font-medium">
                                    {uploadProgress[event.id]?.current ?? 0} / {uploadProgress[event.id]?.total ?? 0}
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${Math.min(100, Math.round(((uploadProgress[event.id]?.current || 0) / (uploadProgress[event.id]?.total || 1)) * 100))}%`
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full bg-gradient-to-r from-[#C5A572] to-[#B39563]"
                                  />
                                </div>
                              </div>
                            ) : null}

                            {/* Uploading Photos */}
                            {uploadPhotos.length > 0 && (
                              <div>
                                <h4 className="text-lg text-[#2B2B2B] dark:text-white mb-4">
                                  Uploading ({uploadPhotos.length})
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                  {uploadPhotos.map((photo) => (
                                    <motion.div
                                      key={photo.id}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="relative"
                                    >
                                      <div className="relative h-24 rounded-lg overflow-hidden bg-black/20">
                                        <img
                                          src={photo.preview}
                                          alt="Upload preview"
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          onClick={() => removeUploadingPhoto(event.id, photo.id)}
                                          className="absolute top-1 right-1 w-6 h-6 rounded-full backdrop-blur-lg bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors"
                                        >
                                          <X className="w-3 h-3 text-white" />
                                        </button>
                                        {photo.uploading && (
                                          <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60">
                                            <Progress value={photo.progress} className="h-1" />
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Existing Photos */}
                            <div>
                              <h4 className="text-lg text-[#2B2B2B] dark:text-white mb-4">
                                Event Photos ({eventPhotos.length})
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {eventPhotos.slice(0, 12).map((photo) => (
                                  <div
                                    key={photo.id}
                                    className="relative h-24 rounded-lg overflow-hidden group"
                                  >
                                    <ImageWithFallback
                                      src={photo.thumbnail}
                                      alt={`Photo ${photo.id}`}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => handleDeletePhoto(photo.id, event.id, event.title, photo.url, photo.thumbnail)}
                                        className="w-8 h-8 rounded-full backdrop-blur-lg bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4 text-white" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {eventPhotos.length > 12 && (
                                <div className="mt-4 text-center">
                                  <span className="text-sm text-[#707070] dark:text-[#A0A0A0]">
                                    + {eventPhotos.length - 12} more photos
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Save Photos Button */}
                            {uploadPhotos.length > 0 && (
                              <div className="mt-4">
                                <Button
                                  onClick={() => handleSavePhotos(event.id)}
                                  className="bg-gradient-to-r from-[#C5A572] to-[#8B7355] hover:from-[#B39563] hover:to-[#7A6344] text-white rounded-full px-6 gap-2"
                                >
                                  <Upload className="w-5 h-5" />
                                  Save Photos
                                </Button>
                              </div>
                            )}

                            {/* Video Management Section */}
                            <div>
                              <h4 className="text-lg text-[#2B2B2B] dark:text-white mb-4 flex items-center gap-2">
                                <VideoIcon className="w-5 h-5 text-[#C5A572]" />
                                Event Videos ({(eventVideosCache[event.id] || event.videos || []).length})
                              </h4>
                              
                              <VideoManager
                                videos={eventVideosCache[event.id] || event.videos || []}
                                onChange={(videos: Video[]) => {
                                  const updatedEvent = { ...event, videos };
                                  setEvents(events.map(e => e.id === event.id ? updatedEvent : e));
                                  setEventVideosCache(prev => ({ ...prev, [event.id]: videos }));
                                  updateEvent(updatedEvent);
                                  toast.success('Videos updated successfully!');
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })
          )}
        </div>

        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              No events found matching your search.
            </p>
          </div>
        )}
      </motion.div>

      {/* Edit Event Modal */}
      <EditEventModal
        event={editingEvent}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
      />
    </div>
  );
}