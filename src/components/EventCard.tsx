"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Image as ImageIcon, Video } from 'lucide-react';
import { motion } from "framer-motion";
import { GlassCard } from './GlassCard';
import { Event } from '../lib/mock-data';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getPhotosByEvent } from '../lib/photos-store';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const [photoCount, setPhotoCount] = useState(event.photoCount || 0);
  const [videoCount, setVideoCount] = useState(event.videoCount || 0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();
  const href = `/events/${event.slug || event.id}`;

  useEffect(() => {
    // Use counts from event object if available (from Supabase)
    if (event.photoCount !== undefined && event.photoCount > 0) {
      setPhotoCount(event.photoCount);
    } else {
      // Fallback to localStorage photos store
      const photos = getPhotosByEvent(event.id);
      setPhotoCount(photos.length);
    }

    // Use videoCount from event object if available (from Supabase)
    if (event.videoCount !== undefined && event.videoCount > 0) {
      setVideoCount(event.videoCount);
    } else {
      // Fallback to event's videos array or legacy videoUrl
      const videos = event.videos?.length || (event.videoUrl ? 1 : 0);
      setVideoCount(videos);
    }
  }, [event.id, event.photoCount, event.videoCount, event.videos, event.videoUrl]);

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      onTouchStart={() => router.prefetch(href)}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <GlassCard hover className="overflow-hidden group">
          <div className="relative h-64 overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]" />
            )}
            <ImageWithFallback
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onLoad={() => setImageLoaded(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full text-xs text-white backdrop-blur-lg bg-[#C5A572]/80 border border-white/20 capitalize">
                {event.category}
              </span>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-[#2B2B2B] dark:text-white mb-2">{event.title}</h3>
            <p className="text-[#707070] dark:text-[#A0A0A0] mb-4">{event.coupleNames}</p>

            <div className="flex flex-col gap-2 text-[#707070] dark:text-[#A0A0A0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{event.location}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">{photoCount} Photo{photoCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span className="text-sm">{videoCount} Video{videoCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </Link>
  );
}