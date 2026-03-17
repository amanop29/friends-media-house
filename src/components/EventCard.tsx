"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { GlassCard } from './GlassCard';
import { Event } from '../lib/mock-data';
import { EventCoverPlaceholder } from './EventCoverPlaceholder';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getPhotosByEvent } from '../lib/photos-store';
import { formatEventType } from '../lib/utils';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const rawCategory = ((event as any).custom_category || (event as any).customCategory || event.category || '').toString().trim();
  const displayCategory = formatEventType(rawCategory);
  const router = useRouter();
  const href = `/events/${event.slug || event.id}`;
  const eventCoverFallback = (
    <EventCoverPlaceholder
      title={event.title}
      subtitle={event.coupleNames}
      className="h-full w-full"
    />
  );

  useEffect(() => {
    // Keep local photos store warm for event pages that derive counts from local cache.
    getPhotosByEvent(event.id);
  }, [event.id]);

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
            {event.coverImage && !imageLoaded && (
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]" />
            )}
            <ImageWithFallback
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onLoad={() => setImageLoaded(true)}
              fallback={eventCoverFallback}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            {event.coverImage ? (
              <div className="absolute bottom-0 left-0 right-0 p-5 text-center">
                <h3
                  className="text-white"
                  style={{ textShadow: '0 2px 14px rgba(0, 0, 0, 0.9)' }}
                >
                  {event.title}
                </h3>
              </div>
            ) : null}
            {displayCategory && (
              <div className="absolute top-4 right-4 z-20">
                <span className="px-3 py-1 rounded-full text-xs text-white backdrop-blur-lg bg-[#C5A572]/80 border border-white/20">
                  {displayCategory}
                </span>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </Link>
  );
}