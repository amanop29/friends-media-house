"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Upload as UploadIcon, Image as ImageIcon, Trash2, Video as VideoIcon } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Progress } from '../../components/ui/progress';
import { VideoManager } from '../../components/VideoManager';
import { toast } from 'sonner';
import { getEvents, updateEvent } from '../../lib/events-store';
import { addPhotos } from '../../lib/photos-store';
import { Video } from '../../lib/mock-data';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { uploadToR2 } from '../../lib/upload-helper';
import { supabase } from '../../lib/supabase';

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
}

export function UploadMedia() {
  const [events, setEvents] = useState(getEvents());
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [eventVideos, setEventVideos] = useState<Video[]>([]);

  useEffect(() => {
    // Load events on mount
    setEvents(getEvents());

    // Listen for events updates
    const handleEventsUpdate = (event: CustomEvent) => {
      setEvents(event.detail);
    };

    window.addEventListener('eventsUpdated', handleEventsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('eventsUpdated', handleEventsUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    // Load videos for selected event
    if (selectedEvent) {
      const event = events.find(e => e.id === selectedEvent);
      setEventVideos(event?.videos || []);
    } else {
      setEventVideos([]);
    }
  }, [selectedEvent, events]);

  const handleVideosChange = (videos: Video[]) => {
    setEventVideos(videos);
    
    // Update event in store
    if (selectedEvent) {
      const event = events.find(e => e.id === selectedEvent);
      if (event) {
        updateEvent({ ...event, videos });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const newPhotos: UploadedPhoto[] = files.map((file, index) => ({
      id: `${crypto.randomUUID()}-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
      progress: 0,
    }));

    setUploadedPhotos((prev) => [...prev, ...newPhotos]);

    // Simulate upload progress
    newPhotos.forEach((photo, index) => {
      const interval = setInterval(() => {
        setUploadedPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  progress: Math.min(p.progress + 10, 100),
                  uploading: p.progress < 90,
                }
              : p
          )
        );
      }, 200 + index * 50);

      setTimeout(() => {
        clearInterval(interval);
      }, 2000 + index * 50);
    });
  };

  const removePhoto = (id: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSavePhotos = async () => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    if (uploadedPhotos.length === 0) {
      toast.error('No photos to save');
      return;
    }

    // Refresh events from localStorage to get latest supabaseId (in case event was just created)
    const freshEvents = getEvents();
    let event = freshEvents.find(e => e.id === selectedEvent);
    if (!event) {
      toast.error('Event not found');
      return;
    }

    // Ensure we have the Supabase event UUID before uploading photos
    if (!event.supabaseId && supabase) {
      try {
        // Try by slug first
        const { data, error } = await supabase
          .from('events')
          .select('id, slug')
          .eq('slug', event.slug)
          .maybeSingle();

        if (error) {
          console.warn('Failed to resolve Supabase event id for photos (by slug):', error);
        }

        if (data?.id) {
          event = { ...event, supabaseId: data.id };
          updateEvent(event);
        } else {
          // Fallback: grab most recent event by created_at if slug lookup fails
          const { data: latest, error: latestError } = await supabase
            .from('events')
            .select('id, slug')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestError) {
            console.warn('Fallback resolve Supabase event id failed:', latestError);
          }

          if (latest?.id) {
            event = { ...event, supabaseId: latest.id, slug: latest.slug || event.slug };
            updateEvent(event);
          }
        }
      } catch (err) {
        console.warn('Error resolving Supabase event id:', err);
      }
    }

    if (!event.supabaseId) {
      toast.error('Event is not yet in Supabase. Please create a new event or retry after it saves to Supabase.');
      return;
    }

    try {
      // Upload all photos to R2 first, then add to store
      const r2UploadResults = await Promise.all(
        uploadedPhotos.map(async (photo) => {
          try {
            const result = await uploadToR2(photo.file, 'events');
            return { id: photo.id, result };
          } catch (err) {
            console.error(`Failed to upload ${photo.file.name} to R2:`, err);
            return { id: photo.id, result: { success: false, error: String(err) } };
          }
        })
      );

      // Build photo objects with R2 URLs (not local previews)
      // Include both eventId (local) and supabaseEventId (for Supabase sync)
      const newPhotos = r2UploadResults
        .filter(({ result }) => result.success && result.url)
        .map(({ id, result }) => ({
          id,
          url: result.url!,
          thumbnail: result.thumbnailUrl || result.url!, // Use thumbnailUrl if available
          eventId: selectedEvent,
          supabaseEventId: event.supabaseId,
          uploadedAt: new Date().toISOString(),
        }));

      if (newPhotos.length === 0) {
        const failed = r2UploadResults.filter(({ result }) => !result.success);
        console.error('R2 upload failed:', failed);
        toast.error(`Failed to upload ${failed.length} photo(s) to R2. Check console for details.`);
        return;
      }

      // Update event (keep existing data)
      updateEvent({ ...event });

      // Add photos to the photos store (also syncs to Supabase, best-effort)
      await addPhotos(newPhotos);

      toast.success(`${newPhotos.length} photo(s) uploaded successfully!`);
      setUploadedPhotos([]);
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
          Upload Media
        </h1>

        {/* Event Selection */}
        <GlassCard className="p-4 md:p-6 mb-6 md:mb-8 max-w-xl">
          <label htmlFor="event" className="block text-[#2B2B2B] dark:text-white mb-2">
            Select Event *
          </label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]">
              <SelectValue placeholder="Choose an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </GlassCard>

        {/* Upload Zone */}
        <GlassCard className="p-8 mb-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging
                ? 'border-[#C5A572] bg-[#C5A572]/10'
                : 'border-black/20 dark:border-white/10'
            }`}
          >
            <UploadIcon className="w-16 h-16 text-[#C5A572] mx-auto mb-4" />
            <h3 className="text-xl text-[#2B2B2B] dark:text-white mb-2">
              Drag & Drop Photos Here
            </h3>
            <p className="text-[#707070] dark:text-[#A0A0A0] mb-4">
              or click to browse files
            </p>
            <label htmlFor="fileInput">
              <Button
                type="button"
                className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-8"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                Browse Files
              </Button>
            </label>
            <input
              id="fileInput"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </GlassCard>

        {/* Video Manager */}
        {selectedEvent && (
          <div className="mb-8">
            <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6">
              Event Videos
            </h2>

            <VideoManager
              videos={eventVideos}
              onChange={handleVideosChange}
            />
          </div>
        )}

        {/* Uploaded Photos */}
        {uploadedPhotos.length > 0 && (
          <div>
            <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6">
              Uploaded Photos ({uploadedPhotos.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uploadedPhotos.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="overflow-hidden">
                    <div className="relative h-48">
                      <img
                        src={photo.preview}
                        alt="Upload preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur-lg bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div className="p-4">
                      {photo.uploading ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[#707070] dark:text-[#A0A0A0]">
                              Uploading...
                            </span>
                            <span className="text-sm text-[#707070] dark:text-[#A0A0A0]">
                              {photo.progress}%
                            </span>
                          </div>
                          <Progress value={photo.progress} className="h-2" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#707070] dark:text-[#A0A0A0] text-sm">
                          <ImageIcon className="w-4 h-4" />
                          <span>Upload complete</span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Save Photos Button */}
            <div className="mt-8">
              <Button
                onClick={handleSavePhotos}
                className="bg-gradient-to-r from-[#C5A572] to-[#8B7355] hover:from-[#B39563] hover:to-[#7A6344] text-white rounded-full px-8 gap-2"
              >
                <UploadIcon className="w-5 h-5" />
                Save Photos
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}