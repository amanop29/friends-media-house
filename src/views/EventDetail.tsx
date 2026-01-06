"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from "framer-motion";
import { Calendar, MapPin, Download, Share2, Heart, X, ChevronLeft, ChevronRight, MessageCircle, CheckCircle2, Image, Video } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { PhotoComments } from '../components/PhotoComments';
import { ViewModeToggle, ViewMode, Orientation } from '../components/ViewModeToggle';
import { PhotoGridSkeleton } from '../components/SkeletonComponents';
import { mockPhotoComments } from '../lib/mock-data';
import { getEvents, type Event } from '../lib/events-store';
import { getPhotosByEvent, type Photo } from '../lib/photos-store';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import JSZip from 'jszip';

// Dynamic import for react-responsive-masonry to avoid SSR issues
const Masonry = dynamic(() => import('react-responsive-masonry').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><PhotoGridSkeleton /></div>
});

export function EventDetail({ slug }: { slug?: string }) {
  const params = useParams();
  const id = slug || params?.slug || params?.id;
  const [event, setEvent] = useState<Event | null>(null);
  const [eventPhotos, setEventPhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [density, setDensity] = useState(4); // Default to 4, will adjust on mount
  const [orientation, setOrientation] = useState<Orientation>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [photoLikes, setPhotoLikes] = useState<Map<string, { count: number; isLiked: boolean }>>(new Map());
  const [photoCommentCounts, setPhotoCommentCounts] = useState<Map<string, number>>(new Map());
  const [showComments, setShowComments] = useState(false);
  const [selectedPhotoForComments, setSelectedPhotoForComments] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const photoRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const [imageLoadingStates, setImageLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [photoDimensions, setPhotoDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

  // Helper function to load image dimensions dynamically
  const loadImageDimensions = (photo: Photo) => {
    if (photo.width && photo.height) {
      // Already has dimensions
      setPhotoDimensions(prev => {
        const newMap = new Map(prev);
        newMap.set(photo.id, { width: photo.width!, height: photo.height! });
        return newMap;
      });
      return;
    }
    
    const img = document.createElement('img');
    img.onload = () => {
      setPhotoDimensions(prev => {
        const newMap = new Map(prev);
        newMap.set(photo.id, { width: img.naturalWidth, height: img.naturalHeight });
        return newMap;
      });
    };
    img.src = photo.thumbnail || photo.url;
  };

  // Helper function to determine photo orientation
  const getPhotoOrientation = (photo: Photo): 'portrait' | 'landscape' | 'square' => {
    if (photo.orientation) return photo.orientation;
    
    const dims = photoDimensions.get(photo.id);
    if (dims) {
      if (dims.width > dims.height) return 'landscape';
      if (dims.width < dims.height) return 'portrait';
      return 'square';
    }
    
    if (photo.width && photo.height) {
      if (photo.width > photo.height) return 'landscape';
      if (photo.width < photo.height) return 'portrait';
      return 'square';
    }
    
    return 'landscape'; // default
  };

  // Filter photos by orientation
  const filteredPhotos = eventPhotos.filter(photo => {
    if (orientation === 'all') return true;
    return getPhotoOrientation(photo) === orientation;
  });

  // Set initial density based on screen size (client-side only)
  useEffect(() => {
    setDensity(window.innerWidth < 768 ? 2 : 4);
  }, []);

  // Load dimensions for photos that don't have them
  useEffect(() => {
    eventPhotos.forEach(photo => {
      if (!photoDimensions.has(photo.id)) {
        loadImageDimensions(photo);
      }
    });
  }, [eventPhotos]);

  useEffect(() => {
    // Load event and photos
    const loadEventAndPhotos = async () => {
      let currentEvent: Event | null = null;
      
      // Try Supabase first
      try {
        if (supabase) {
          console.log('📡 EventDetail: Fetching event from Supabase for slug/id:', id);
          
          // First try by slug
          let query = supabase
            .from('events')
            .select('*')
            .eq('slug', id)
            .single();
          
          let result = await query;
          
          // If not found by slug, try by ID
          if (result.error && result.error.code === 'PGRST116') {
            console.log('📡 EventDetail: Not found by slug, trying by ID...');
            query = supabase
              .from('events')
              .select('*')
              .eq('id', id)
              .single();
            result = await query;
          }
          
          const { data, error } = result;
          
          if (!error && data) {
            console.log('✅ EventDetail: Got event from Supabase:', data.title);
            currentEvent = {
              id: data.id,
              supabaseId: data.id,
              title: data.title,
              slug: data.slug,
              description: data.description,
              date: data.date,
              location: data.location,
              category: data.category,
              coverImage: data.cover_image || data.cover_image_url,
              coupleNames: data.couple_names,
              photoCount: data.photo_count || 0,
              videoCount: data.video_count || 0,
              isFeatured: data.is_featured,
              isVisible: data.is_visible,
              viewCount: data.view_count || 0,
              videos: [], // Initialize empty, will be populated below
            };
          } else {
            console.warn('⚠️ EventDetail: Supabase query failed:', error);
          }
        }
      } catch (err) {
        console.error('❌ EventDetail: Error fetching from Supabase:', err);
      }
      
      // Fallback to localStorage if Supabase failed
      if (!currentEvent) {
        console.log('📂 EventDetail: Falling back to localStorage...');
        const events = getEvents();
        currentEvent = events.find((e) => e.slug === id || e.id === id) || null;
      }
      
      if (currentEvent) {
        setEvent(currentEvent);
        
        // Get the Supabase event ID to query photos
        const supabaseEventId = currentEvent.supabaseId || currentEvent.id;
        
        let photos: Photo[] = [];
        
        // Try to load photos from Supabase first
        if (supabase) {
          try {
            console.log('📡 EventDetail: Fetching photos from Supabase for event:', supabaseEventId);
            const { data: supabasePhotos, error } = await supabase
              .from('photos')
              .select('*')
              .eq('event_id', supabaseEventId)
              .order('created_at', { ascending: true });
            
            if (!error && supabasePhotos && supabasePhotos.length > 0) {
              console.log('✅ EventDetail: Got', supabasePhotos.length, 'photos from Supabase');
              photos = supabasePhotos.map((photo: any) => ({
                id: photo.id,
                supabasePhotoId: photo.id,
                eventId: photo.event_id,
                url: photo.url,
                thumbnail: photo.thumbnail_url || photo.url,
                width: photo.width,
                height: photo.height,
                orientation: photo.orientation,
                likeCount: photo.like_count || 0,
              }));
            } else {
              console.warn('⚠️ EventDetail: No photos in Supabase or error:', error);
            }
          } catch (err) {
            console.error('❌ EventDetail: Error fetching photos from Supabase:', err);
          }
        }
        
        // Fallback to localStorage if Supabase returned nothing
        if (photos.length === 0) {
          console.log('📂 EventDetail: Falling back to localStorage for photos...');
          photos = getPhotosByEvent(currentEvent.id);
        }
        
        setEventPhotos(photos);
        setIsLoadingPhotos(false);
        
        // Set initial values from local data immediately (no loading delay)
        const initialLikesMap = new Map<string, { count: number; isLiked: boolean }>();
        const initialCommentsMap = new Map<string, number>();
        for (const photo of photos) {
          initialLikesMap.set(photo.id, { count: photo.likeCount || 0, isLiked: false });
          initialCommentsMap.set(photo.id, 0);
        }
        setPhotoLikes(initialLikesMap);
        setPhotoCommentCounts(initialCommentsMap);
        
        // Try to load like counts directly from Supabase photos table by event
        if (supabase) {
          try {
            const { data: supabasePhotos, error } = await supabase
              .from('photos')
              .select('id, url, like_count')
              .eq('event_id', supabaseEventId);
            
            if (!error && supabasePhotos && supabasePhotos.length > 0) {
              // Match Supabase photos with local photos by URL or ID
              const updatedLikesMap = new Map<string, { count: number; isLiked: boolean }>();
              for (const photo of photos) {
                // Try to find matching Supabase photo by supabasePhotoId, id, or url
                const matchingSupabasePhoto = supabasePhotos.find((sp: { id: string; url: string; like_count: number }) => 
                  sp.id === photo.supabasePhotoId || 
                  sp.id === photo.id ||
                  sp.url === photo.url
                );
                if (matchingSupabasePhoto) {
                  updatedLikesMap.set(photo.id, { 
                    count: matchingSupabasePhoto.like_count || 0, 
                    isLiked: false 
                  });
                } else {
                  updatedLikesMap.set(photo.id, { count: photo.likeCount || 0, isLiked: false });
                }
              }
              setPhotoLikes(updatedLikesMap);
            }
          } catch (err) {
            console.warn('Failed to fetch like counts from Supabase:', err);
          }

          // Load comment counts directly from Supabase
          try {
            const { data: comments, error } = await supabase
              .from('photo_comments')
              .select('photo_id')
              .eq('is_hidden', false);
            
            if (!error && comments) {
              // Count comments per photo
              const commentCounts: Record<string, number> = {};
              for (const comment of comments) {
                commentCounts[comment.photo_id] = (commentCounts[comment.photo_id] || 0) + 1;
              }
              
              // Match with local photos
              const updatedCommentsMap = new Map<string, number>();
              for (const photo of photos) {
                const count = commentCounts[photo.supabasePhotoId || ''] || 
                              commentCounts[photo.id] || 
                              0;
                updatedCommentsMap.set(photo.id, count);
              }
              setPhotoCommentCounts(updatedCommentsMap);
            }
          } catch (err) {
            console.warn('Failed to fetch comment counts from Supabase:', err);
          }
        }

        // Fetch videos from Supabase
        if (supabase && currentEvent.supabaseId) {
          try {
            console.log('📹 EventDetail: Fetching videos from Supabase for event:', currentEvent.supabaseId);
            const { data: supabaseVideos, error: videosError } = await supabase
              .from('videos')
              .select('*')
              .eq('event_id', currentEvent.supabaseId)
              .order('created_at', { ascending: true });
            
            if (!videosError && supabaseVideos && supabaseVideos.length > 0) {
              console.log('✅ EventDetail: Got', supabaseVideos.length, 'videos from Supabase');
              const videos = supabaseVideos.map((video: any) => ({
                id: video.id,
                url: video.url,
                type: video.type || 'youtube',
                thumbnail: video.thumbnail_url || '',
                title: video.title || '',
                uploadedAt: video.created_at || new Date().toISOString(),
              }));
              // Update the event with videos
              currentEvent.videos = videos;
              setEvent({ ...currentEvent, videos });
            } else if (!videosError) {
              console.log('📹 EventDetail: No videos found for event');
              currentEvent.videos = [];
            }
          } catch (err) {
            console.error('❌ EventDetail: Error fetching videos from Supabase:', err);
          }
        }

        // Increment view count in Supabase (best effort)
        if (currentEvent.supabaseId && supabase) {
          try {
            await supabase
              .from('events')
              .update({ view_count: (currentEvent.viewCount || 0) + 1 })
              .eq('id', currentEvent.supabaseId);
          } catch (err) {
            console.warn('Failed to update view count:', err);
          }
        }
      } else {
        // Event not found
        console.warn('⚠️ Event not found for slug/id:', id);
        setIsLoadingPhotos(false);
      }
    };

    loadEventAndPhotos();

    // Listen for photo updates
    const handlePhotosUpdate = () => {
      loadEventAndPhotos();
    };

    // Listen for comment updates to refresh counts
    const handleCommentsUpdate = async () => {
      // Reload comment counts for the selected photo
      if (selectedPhotoForComments) {
        const photo = eventPhotos.find(p => p.id === selectedPhotoForComments);
        if (photo) {
          const photoIdToUse = photo.supabasePhotoId || photo.id;
          try {
            const response = await fetch(`/api/comments?photoId=${photoIdToUse}`);
            if (response.ok) {
              const data = await response.json();
              const commentCount = Array.isArray(data) ? data.length : 0;
              setPhotoCommentCounts(prev => {
                const newMap = new Map(prev);
                newMap.set(selectedPhotoForComments, commentCount);
                return newMap;
              });
            }
          } catch (err) {
            console.warn('Failed to update comment count:', err);
          }
        }
      }
    };

    window.addEventListener('photosUpdated', handlePhotosUpdate);
    window.addEventListener('commentsUpdated', handleCommentsUpdate);
    
    return () => {
      window.removeEventListener('photosUpdated', handlePhotosUpdate);
      window.removeEventListener('commentsUpdated', handleCommentsUpdate);
    };
  }, [id]);

  const toggleLike = async (photoId: string) => {
    // Get the photo to find its Supabase ID
    const photo = eventPhotos.find(p => p.id === photoId);
    if (!photo) {
      toast.error('Photo not found');
      return;
    }

    // Use Supabase photo ID if available, otherwise use local ID
    const supabasePhotoId = photo.supabasePhotoId || photoId;
    
    const currentLike = photoLikes.get(photoId) || { isLiked: false, count: 0 };
    const isCurrentlyLiked = currentLike.isLiked;
    const newIsLiked = !isCurrentlyLiked;
    
    // Update UI immediately
    setPhotoLikes(prevLikes => {
      const newLikes = new Map(prevLikes);
      const prevLike = newLikes.get(photoId) || { isLiked: false, count: 0 };
      
      if (newIsLiked) {
        // Like - increment count
        newLikes.set(photoId, { isLiked: true, count: prevLike.count + 1 });
      } else {
        // Unlike - decrement count
        newLikes.set(photoId, { isLiked: false, count: Math.max(0, prevLike.count - 1) });
      }
      
      return newLikes;
    });
    
    // Persist to Supabase
    try {
      const action = newIsLiked ? 'like' : 'unlike';
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: supabasePhotoId, action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update like count');
      }

      const data = await response.json();
      
      // Update with server-confirmed count
      setPhotoLikes(prevLikes => {
        const newLikes = new Map(prevLikes);
        newLikes.set(photoId, { isLiked: newIsLiked, count: data.likeCount || 0 });
        return newLikes;
      });

      if (newIsLiked) {
        toast.success('Added to likes');
      } else {
        toast.success('Removed from likes');
      }
    } catch (error) {
      console.error('Error updating like count:', error);
      // Revert UI on error
      setPhotoLikes(prevLikes => {
        const newLikes = new Map(prevLikes);
        const prevLike = newLikes.get(photoId) || { isLiked: false, count: 0 };
        newLikes.set(photoId, { isLiked: !newIsLiked, count: newIsLiked ? Math.max(0, prevLike.count - 1) : prevLike.count - 1 });
        return newLikes;
      });
      toast.error('Failed to update like count');
    }
  };

  const updateCommentCount = (photoId: string) => {
    setPhotoCommentCounts(prev => {
      const newCounts = new Map(prev);
      newCounts.set(photoId, (newCounts.get(photoId) || 0) + 1);
      return newCounts;
    });
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(photoId)) {
        newSelected.delete(photoId);
      } else {
        newSelected.add(photoId);
      }
      return newSelected;
    });
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(new Set(eventPhotos.map(p => p.id)));
    toast.success(`Selected all ${eventPhotos.length} photos`);
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
    toast.info('Selection cleared');
  };

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) {
      toast.error('Please select photos to download');
      return;
    }

    const photosToDownload = eventPhotos.filter(p => selectedPhotos.has(p.id));
    
    // If only one photo, download directly
    if (photosToDownload.length === 1) {
      const loadingToast = toast.loading('Downloading photo...');
      // Use generic JPG filename since API converts to JPG
      const filename = `photo-${Date.now()}.jpg`;
      const success = await downloadImage(photosToDownload[0].url, filename);
      if (success) {
        toast.success('Photo downloaded!', { id: loadingToast });
      } else {
        toast.error('Failed to download photo', { id: loadingToast });
      }
      setSelectionMode(false);
      setSelectedPhotos(new Set());
      return;
    }

    // For multiple photos, create a ZIP file
    const loadingToast = toast.loading(`Preparing ${selectedPhotos.size} photos for download...`);
    
    try {
      const zip = new JSZip();
      const folder = zip.folder(event?.title || 'photos');
      
      if (!folder) throw new Error('Failed to create folder');

      // Fetch all images and add to zip with generic names in JPG format
      for (let i = 0; i < photosToDownload.length; i++) {
        const photo = photosToDownload[i];
        try {
          toast.loading(`Processing ${i + 1}/${photosToDownload.length}...`, { id: loadingToast });
          // Use proxy endpoint to avoid CORS issues
          const proxyUrl = `/api/download-image?url=${encodeURIComponent(photo.url)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`Failed to fetch image ${i + 1}`);
          
          // Get ArrayBuffer and create fresh blob
          const arrayBuffer = await response.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
          // Always use JPG format with generic names: img-1.jpg, img-2.jpg, etc.
          const filename = `img-${i + 1}.jpg`;
          folder.file(filename, blob);
        } catch (error) {
          console.error(`Failed to add photo ${i + 1}:`, error);
        }
      }

      // Generate and download zip
      toast.loading('Creating ZIP file...', { id: loadingToast });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `${event?.title || 'photos'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(zipUrl), 100);
      
      toast.success(`Downloaded ${photosToDownload.length} photos!`, { id: loadingToast });
    } catch (error) {
      console.error('Failed to create ZIP:', error);
      toast.error('Failed to download photos', { id: loadingToast });
    }
    
    // Exit selection mode after download
    setSelectionMode(false);
    setSelectedPhotos(new Set());
  };

  const currentPhotoIndex = lightboxPhoto
    ? eventPhotos.findIndex((p) => p.url === lightboxPhoto)
    : -1;

  const nextPhoto = () => {
    if (currentPhotoIndex < eventPhotos.length - 1) {
      setLightboxPhoto(eventPhotos[currentPhotoIndex + 1].url);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setLightboxPhoto(eventPhotos[currentPhotoIndex - 1].url);
    }
  };

  const downloadImage = async (url: string, filename?: string) => {
    try {
      // Use the proxy endpoint to avoid CORS issues - API converts to JPG
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        cache: 'no-store', // Skip cache for fresh download
      });
      if (!response.ok) throw new Error('Failed to fetch image');
      
      // Get ArrayBuffer and create blob in one go
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Use provided filename or generate one with .jpg extension
      let finalFilename = filename || `photo-${Date.now()}.jpg`;
      // Ensure .jpg extension
      if (!finalFilename.toLowerCase().endsWith('.jpg') && !finalFilename.toLowerCase().endsWith('.jpeg')) {
        finalFilename = finalFilename.replace(/\.[^/.]+$/, '') + '.jpg';
      }
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      return false;
    }
  };

  const shareAlbum = async () => {
    if (!event) return;

    const shareData = {
      title: event.title,
      text: `Check out ${event.coupleNames} - ${event.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        // Use native share API if available (mobile devices)
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } else {
        // Fallback: Copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled share or error occurred
      if (error instanceof Error && error.name !== 'AbortError') {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success('Link copied to clipboard!');
        } catch (clipboardError) {
          toast.error('Failed to share');
        }
      }
    }
  };

  // Handle responsive density changes
  useEffect(() => {
    const handleResize = () => {
      const newDensity = window.innerWidth < 768 ? 2 : 4;
      setDensity(newDensity);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Simulate photo loading
    setIsLoadingPhotos(true);
    setTimeout(() => {
      setIsLoadingPhotos(false);
    }, 800);
  }, [id]);

  // Early return if event not found
  if (!event) {
    return (
      <div className="min-h-screen pt-32 pb-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[#707070] dark:text-[#A0A0A0]">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Event Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard className="mb-12 overflow-hidden">
            <div className="relative h-96">
              <ImageWithFallback
                src={event?.coverImage}
                alt={event?.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h1 className="text-white text-4xl md:text-5xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {event?.title}
                </h1>
                <div className="flex flex-wrap gap-6 text-white/90">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>{new Date(event?.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{event?.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    <span>{eventPhotos.length} Photo{eventPhotos.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    <span>{event?.videoCount || event?.videos?.length || 0} Video{(event?.videoCount || event?.videos?.length || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Action Buttons & View Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex justify-between items-center gap-4 mb-8 flex-wrap"
        >
          <div className="flex gap-3 flex-wrap items-center">
            {!selectionMode ? (
              <>
                <Button
                  onClick={() => {
                    setSelectionMode(true);
                    toast.info('Selection mode enabled. Click photos to select.');
                  }}
                  className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Select Photos</span>
                </Button>
                <Button 
                  onClick={shareAlbum}
                  variant="outline" 
                  className="rounded-full gap-2 border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share Album</span>
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-2 backdrop-blur-lg bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-full">
                  <span className="text-[#2B2B2B] dark:text-white">
                    {selectedPhotos.size} selected
                  </span>
                </div>
                <Button
                  onClick={downloadSelectedPhotos}
                  disabled={selectedPhotos.size === 0}
                  className="w-full md:w-auto !bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full gap-2 disabled:!opacity-50 disabled:!cursor-not-allowed disabled:!bg-gray-400"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Selected ({selectedPhotos.size})</span>
                </Button>
                <Button
                  onClick={selectAllPhotos}
                  variant="outline"
                  className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white"
                >
                  Select All
                </Button>
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  className="rounded-full"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedPhotos(new Set());
                  }}
                  variant="outline"
                  className="rounded-full"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              density={density}
              onDensityChange={setDensity}
              orientation={orientation}
              onOrientationChange={setOrientation}
            />
          </div>
        </motion.div>

        {/* Media Type Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex justify-center gap-3 mb-8"
        >
          <Button
            onClick={() => setMediaFilter('all')}
            variant={mediaFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={
              mediaFilter === 'all'
                ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full'
                : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
            }
          >
            All Media
          </Button>
          <Button
            onClick={() => setMediaFilter('photos')}
            variant={mediaFilter === 'photos' ? 'default' : 'outline'}
            size="sm"
            className={
              mediaFilter === 'photos'
                ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full'
                : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
            }
          >
            <Image className="w-4 h-4 mr-1" />
            Photos Only
          </Button>
          <Button
            onClick={() => setMediaFilter('videos')}
            variant={mediaFilter === 'videos' ? 'default' : 'outline'}
            size="sm"
            className={
              mediaFilter === 'videos'
                ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full'
                : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
            }
          >
            <Video className="w-4 h-4 mr-1" />
            Videos Only
          </Button>
        </motion.div>

        {/* Photo Grid - Grid View */}
        {(mediaFilter === 'all' || mediaFilter === 'photos') && viewMode === 'grid' && (
          <div className={`grid gap-4 md:gap-6`} style={{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }}>
            {isLoadingPhotos ? (
              <PhotoGridSkeleton density={density} />
            ) : (
              filteredPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  ref={(el) => {
                    if (el) photoRefsMap.current.set(photo.id, el);
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlassCard className="overflow-hidden group relative">
                    <div
                      className="relative aspect-square cursor-pointer"
                      onClick={() => {
                        if (selectionMode) {
                          togglePhotoSelection(photo.id);
                        } else {
                          setLightboxPhoto(photo.url);
                        }
                      }}
                    >
                      {/* Skeleton loader */}
                      {!imageLoadingStates.get(photo.id) && (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]" style={{ animation: 'shimmer 1.5s infinite' }} />
                      )}
                      <ImageWithFallback
                        src={photo.thumbnail}
                        alt={`Photo ${photo.id}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onLoad={() => {
                          setImageLoadingStates(prev => {
                            const newStates = new Map(prev);
                            newStates.set(photo.id, true);
                            return newStates;
                          });
                        }}
                      />
                      {/* Selection Indicator */}
                      {selectionMode && (
                        <div className="absolute top-2 left-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              selectedPhotos.has(photo.id)
                                ? 'bg-[#C5A572]'
                                : 'bg-white/20 backdrop-blur-lg border-2 border-white'
                            }`}
                          >
                            {selectedPhotos.has(photo.id) && (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                        <span className="text-white text-sm">
                          {selectionMode ? 'Select Photo' : 'View Full Size'}
                        </span>
                      </div>
                      {!selectionMode && (
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(photo.id);
                            }}
                            className="h-8 px-2 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center gap-1 hover:bg-white/30 transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                photoLikes.get(photo.id)?.isLiked
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-white'
                              }`}
                            />
                            <span className="text-white text-xs font-medium">
                              {photoLikes.get(photo.id)?.count || 0}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhotoForComments(photo.id);
                              setShowComments(true);
                            }}
                            className="h-8 px-2 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center gap-1 hover:bg-white/30 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 text-white" />
                            <span className="text-white text-xs font-medium">
                              {photoCommentCounts.get(photo.id) || 0}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Photo Grid - Masonry View */}
        {(mediaFilter === 'all' || mediaFilter === 'photos') && viewMode === 'masonry' && (
          <Masonry columnsCount={density} gutter="1rem">
            {isLoadingPhotos ? (
              <PhotoGridSkeleton density={density} />
            ) : (
              filteredPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  ref={(el) => {
                    if (el) photoRefsMap.current.set(photo.id, el);
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlassCard className="overflow-hidden group relative">
                    <div
                      className="relative cursor-pointer"
                      onClick={() => {
                        if (selectionMode) {
                          togglePhotoSelection(photo.id);
                        } else {
                          setLightboxPhoto(photo.url);
                        }
                      }}
                    >
                      {/* Image with skeleton overlay */}
                      {(() => {
                        const dims = photoDimensions.get(photo.id) || { width: photo.width || 4, height: photo.height || 3 };
                        return (
                          <div 
                            className="relative w-full"
                            style={{ aspectRatio: `${dims.width}/${dims.height}` }}
                          >
                            {/* Skeleton loader - shows before image loads */}
                            {!imageLoadingStates.get(photo.id) && (
                              <div 
                                className="absolute inset-0 z-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer rounded-lg"
                                style={{ 
                                  backgroundSize: '200% 100%'
                                }}
                              />
                            )}
                            {/* Actual Image */}
                            <ImageWithFallback
                              src={photo.thumbnail}
                              alt={`Photo ${photo.id}`}
                              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 rounded-lg"
                              onLoad={() => {
                                setImageLoadingStates(prev => {
                                  const newStates = new Map(prev);
                                  newStates.set(photo.id, true);
                                  return newStates;
                                });
                              }}
                            />
                          </div>
                        );
                      })()}
                      {/* Selection Indicator */}
                      {selectionMode && (
                        <div className="absolute top-2 left-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              selectedPhotos.has(photo.id)
                                ? 'bg-[#C5A572]'
                                : 'bg-white/20 backdrop-blur-lg border-2 border-white'
                            }`}
                          >
                            {selectedPhotos.has(photo.id) && (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white text-sm">
                          {selectionMode ? 'Select Photo' : 'View Full Size'}
                        </span>
                      </div>
                      {!selectionMode && (
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(photo.id);
                            }}
                            className="h-8 px-2 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center gap-1 hover:bg-white/30 transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                photoLikes.get(photo.id)?.isLiked
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-white'
                              }`}
                            />
                            <span className="text-white text-xs font-medium">
                              {photoLikes.get(photo.id)?.count || 0}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhotoForComments(photo.id);
                              setShowComments(true);
                            }}
                            className="h-8 px-2 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center gap-1 hover:bg-white/30 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 text-white" />
                            <span className="text-white text-xs font-medium">
                              {photoCommentCounts.get(photo.id) || 0}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </Masonry>
        )}

        {/* Photo Grid - List View */}
        {(mediaFilter === 'all' || mediaFilter === 'photos') && viewMode === 'list' && (
          <div className="space-y-4">
            {isLoadingPhotos ? (
              <PhotoGridSkeleton density={density} />
            ) : (
              filteredPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  ref={(el) => {
                    if (el) photoRefsMap.current.set(photo.id, el);
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlassCard className="p-3 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      {/* Selection Checkbox for List View */}
                      {selectionMode && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => togglePhotoSelection(photo.id)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              selectedPhotos.has(photo.id)
                                ? 'bg-[#C5A572]'
                                : 'bg-white/50 dark:bg-white/20 backdrop-blur-lg border-2 border-[#C5A572]/60 dark:border-white/20'
                            }`}
                          >
                            {selectedPhotos.has(photo.id) && (
                              <CheckCircle2 className="w-6 h-6 text-white" />
                            )}
                          </button>
                        </div>
                      )}
                      <div
                        className="w-full md:w-48 h-48 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group"
                        onClick={() => {
                          if (selectionMode) {
                            togglePhotoSelection(photo.id);
                          } else {
                            setLightboxPhoto(photo.url);
                          }
                        }}
                      >
                        <ImageWithFallback
                          src={photo.thumbnail}
                          alt={`Photo ${photo.id}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h3 className="text-[#2B2B2B] dark:text-white mb-1 md:mb-2">Photo {index + 1}</h3>
                          <p className="text-[#707070] dark:text-[#A0A0A0] text-xs md:text-sm mb-2 md:mb-3">
                            {photo.width} × {photo.height} • {photo.orientation}
                          </p>
                        </div>
                        {!selectionMode && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => toggleLike(photo.id)}
                              variant={photoLikes.get(photo.id)?.isLiked ? 'default' : 'outline'}
                              className={photoLikes.get(photo.id)?.isLiked ? '!bg-red-500 hover:!bg-red-600 !text-white rounded-full' : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'}
                            >
                              <Heart className={`w-4 h-4 ${photoLikes.get(photo.id)?.isLiked ? 'fill-current' : ''}`} />
                              <span className="ml-1 md:ml-2 text-xs md:text-sm">
                                {photoLikes.get(photo.id)?.count || 0} {photoLikes.get(photo.id)?.count === 1 ? 'Like' : 'Likes'}
                              </span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPhotoForComments(photo.id);
                                setShowComments(true);
                              }}
                              className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="ml-1 md:ml-2 text-xs md:text-sm">
                                {photoCommentCounts.get(photo.id) || 0} {photoCommentCounts.get(photo.id) === 1 ? 'Comment' : 'Comments'}
                              </span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const loadingToast = toast.loading('Downloading image...');
                                const success = await downloadImage(photo.url, `photo-${Date.now()}.jpg`);
                                if (success) {
                                  toast.success('Image downloaded!', { id: loadingToast });
                                } else {
                                  toast.error('Failed to download image', { id: loadingToast });
                                }
                              }}
                              className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white"
                            >
                              <Download className="w-4 h-4" />
                              <span className="ml-1 md:ml-2 text-xs md:text-sm hidden sm:inline">Download</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>
        )}

        {eventPhotos.length === 0 && (mediaFilter === 'all' || mediaFilter === 'photos') && (
          <div className="text-center py-12">
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              {mediaFilter === 'photos' ? 'No photos available for this event.' : 'No photos found matching the current filters.'}
            </p>
          </div>
        )}

        {(!event?.videos || event.videos.length === 0) && !event?.videoUrl && (mediaFilter === 'all' || mediaFilter === 'videos') && (
          <div className="text-center py-12">
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              No videos available for this event.
            </p>
          </div>
        )}

        {/* Video Section */}
        {(mediaFilter === 'all' || mediaFilter === 'videos') && ((event?.videos && event.videos.length > 0) || event?.videoUrl) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12"
          >
            <h2 className="text-3xl text-[#2B2B2B] dark:text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              Cinematic Film{event.videos && event.videos.length > 1 ? 's' : ''}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New videos array */}
              {event.videos && event.videos.map((video: any) => (
                <GlassCard key={video.id} className="overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                  <div className="aspect-video relative">
                    {video.type === 'youtube' ? (
                      <iframe
                        src={video.url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={video.title || 'Wedding Video'}
                      />
                    ) : (
                      <video
                        src={video.url}
                        controls
                        poster={video.thumbnail}
                        className="w-full h-full object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                  <div className="p-4 border-t border-white/10 flex items-center justify-between">
                    <p className="text-[#2B2B2B] dark:text-white">{video.title || 'Video'}</p>
                    {video.type !== 'youtube' && (
                      <button
                        onClick={async () => {
                          const loadingToast = toast.loading('Downloading video...');
                          try {
                            // Use proxy endpoint to avoid CORS issues
                            const proxyUrl = `/api/download-video?url=${encodeURIComponent(video.url)}`;
                            const response = await fetch(proxyUrl);
                            if (!response.ok) throw new Error('Failed to fetch video');
                            const arrayBuffer = await response.arrayBuffer();
                            const blob = new Blob([arrayBuffer], { type: 'video/mp4' });
                            const blobUrl = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = blobUrl;
                            // Extract filename from URL or use generic name
                            const urlPath = new URL(video.url).pathname;
                            const originalFilename = decodeURIComponent(urlPath.split('/').pop() || '').replace(/^\d+-/, '') || `video-${Date.now()}.mp4`;
                            link.download = originalFilename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                            toast.success('Video downloaded!', { id: loadingToast });
                          } catch (error) {
                            console.error('Video download failed:', error);
                            toast.error('Failed to download video', { id: loadingToast });
                          }
                        }}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        title="Download Video"
                      >
                        <Download className="w-5 h-5 text-[#2B2B2B] dark:text-white" />
                      </button>
                    )}
                  </div>
                </GlassCard>
              ))}
              
              {/* Legacy videoUrl for backwards compatibility */}
              {event.videoUrl && (!event.videos || event.videos.length === 0) && (
                <GlassCard className="overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      src={event.videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Wedding Video"
                    />
                  </div>
                </GlassCard>
              )}
            </div>
          </motion.div>
        )}

        {/* Photo Comments Modal */}
        {showComments && selectedPhotoForComments && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <GlassCard variant="modal" className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[#1A1A1A] dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Photo Comments
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowComments(false);
                      setSelectedPhotoForComments(null);
                    }}
                    className="rounded-full text-[#1A1A1A] dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="mb-6">
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={eventPhotos.find(p => p.id === selectedPhotoForComments)?.thumbnail || ''}
                      alt="Selected photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <PhotoComments
                  photoId={selectedPhotoForComments ? (eventPhotos.find(p => p.id === selectedPhotoForComments)?.supabasePhotoId || selectedPhotoForComments) : null}
                  photoUrl={eventPhotos.find(p => p.id === selectedPhotoForComments)?.thumbnail || eventPhotos.find(p => p.id === selectedPhotoForComments)?.url}
                  eventTitle={event?.title}
                  onCommentAdded={() => {
                    if (selectedPhotoForComments) {
                      updateCommentCount(selectedPhotoForComments);
                    }
                  }}
                />
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* Lightbox */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            {/* Top right buttons container */}
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <button
                onClick={() => {
                  const currentPhoto = eventPhotos[currentPhotoIndex];
                  if (currentPhoto) {
                    toggleLike(currentPhoto.id);
                  }
                }}
                className={`h-12 px-4 rounded-full backdrop-blur-lg ${
                  eventPhotos[currentPhotoIndex] && photoLikes.get(eventPhotos[currentPhotoIndex].id)?.isLiked
                    ? 'bg-red-500/80 hover:bg-red-600/80'
                    : 'bg-white/20 hover:bg-white/30'
                } flex items-center justify-center gap-2 transition-colors`}
                title="Like"
              >
                <Heart
                  className={`w-6 h-6 text-white ${
                    eventPhotos[currentPhotoIndex] && photoLikes.get(eventPhotos[currentPhotoIndex].id)?.isLiked
                      ? 'fill-current'
                      : ''
                  }`}
                />
                <span className="text-white text-sm font-medium">
                  {eventPhotos[currentPhotoIndex] ? (photoLikes.get(eventPhotos[currentPhotoIndex].id)?.count || 0) : 0}
                </span>
              </button>

              <button
                onClick={() => {
                  const currentPhoto = eventPhotos[currentPhotoIndex];
                  if (currentPhoto) {
                    setSelectedPhotoForComments(currentPhoto.id);
                    setShowComments(true);
                    setLightboxPhoto(null);
                  }
                }}
                className="h-12 px-4 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
                title="Comments"
              >
                <MessageCircle className="w-6 h-6 text-white" />
                <span className="text-white text-sm font-medium">
                  {eventPhotos[currentPhotoIndex] ? (photoCommentCounts.get(eventPhotos[currentPhotoIndex].id) || 0) : 0}
                </span>
              </button>

              <button
                onClick={async () => {
                  const loadingToast = toast.loading('Downloading image...');
                  const success = await downloadImage(lightboxPhoto, `photo-${Date.now()}.jpg`);
                  if (success) {
                    toast.success('Image downloaded!', { id: loadingToast });
                  } else {
                    toast.error('Failed to download image', { id: loadingToast });
                  }
                }}
                className="w-12 h-12 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                title="Download Image"
              >
                <Download className="w-6 h-6 text-white" />
              </button>
              
              <button
                onClick={() => setLightboxPhoto(null)}
                className="w-12 h-12 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {currentPhotoIndex > 0 && (
              <button
                onClick={prevPhoto}
                className="absolute left-4 w-12 h-12 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {currentPhotoIndex < eventPhotos.length - 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-4 w-12 h-12 rounded-full backdrop-blur-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            <img
              src={lightboxPhoto}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}