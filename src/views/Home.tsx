"use client";
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import { motion } from "framer-motion";
import { Camera, Film, Heart, Award, ArrowRight } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getEvents } from '../lib/events-store';
import { getSettings, fetchSettings, type SiteSettings } from '../lib/settings';
import { supabase } from '../lib/supabase';

// Lazy load FAQSection for better performance
const FAQSection = lazy(() => import('../components/FAQSection').then(mod => ({ default: mod.FAQSection })));

interface FeaturedEvent {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  date: string;
  location?: string;
  category: string;
  coverImage: string;
  coupleNames: string;
  isFeatured: boolean;
}

export function Home() {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [bannerImage, setBannerImage] = useState<string>('');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load settings from localStorage first for immediate render
    const localSettings = getSettings();
    setSettings(localSettings);
    
    // Set banner from local settings first
    if (localSettings.homeBannerUrl) {
      setBannerImage(localSettings.homeBannerUrl);
    }
    
    // Then fetch from Supabase to get latest
    fetchSettings().then(supabaseSettings => {
      setSettings(supabaseSettings);
      // Update banner from Supabase settings
      if (supabaseSettings.homeBannerUrl) {
        setBannerImage(supabaseSettings.homeBannerUrl);
      }
    });

    // Fetch featured events - try Supabase first, then fallback to localStorage
    const fetchFeaturedEvents = async () => {
      console.log('🔄 Fetching featured events...');
      
      try {
        // Check if supabase is configured
        if (!supabase) {
          console.warn('⚠️ Supabase not configured, using localStorage');
          throw new Error('Supabase not configured');
        }

        // Try to fetch from Supabase first
        console.log('📡 Querying Supabase for featured events...');
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('is_featured', true)
          .eq('is_visible', true)
          .order('date', { ascending: false })
          .limit(6);

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }

        console.log('📦 Supabase returned:', data?.length || 0, 'events');

        // Use Supabase data even if empty (don't fallback to mock data)
        const featured = (data || []).map((event: any) => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          description: event.description,
          date: event.date,
          location: event.location,
          category: event.category,
          coverImage: event.cover_image || event.cover_image_url,
          coupleNames: event.couple_names,
          isFeatured: event.is_featured,
        }));
        console.log('✅ Using Supabase events:', featured.length);
        setFeaturedEvents(featured);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('❌ Error fetching events from Supabase:', error);
      }

      // Fallback to localStorage ONLY if Supabase failed
      console.log('📂 Falling back to localStorage...');
      const allEvents = getEvents();
      console.log('📂 LocalStorage events:', allEvents.length);
      const featured = allEvents
        .filter(event => event.isFeatured === true && event.isVisible !== false)
        .slice(0, 6)
        .map(event => ({
          ...event,
          isFeatured: true,
        }));
      console.log('✅ Using localStorage events:', featured.length);
      setFeaturedEvents(featured);
      setIsLoading(false);
    };

    fetchFeaturedEvents();
    setMounted(true);

    const handleSettingsUpdate = (event: CustomEvent) => {
      setSettings(event.detail);
      // Also update banner when settings are updated
      if (event.detail.homeBannerUrl) {
        setBannerImage(event.detail.homeBannerUrl);
      }
    };

    const handleEventsUpdate = () => {
      // Refetch featured events when events are updated
      fetchFeaturedEvents();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    window.addEventListener('eventsUpdated', handleEventsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
      window.removeEventListener('eventsUpdated', handleEventsUpdate as EventListener);
    };
  }, []);

  const services = [
    {
      icon: Heart,
      title: 'Weddings',
      description: 'Capture every precious moment of your special day with cinematic elegance.',
    },
    {
      icon: Camera,
      title: 'Pre-Weddings',
      description: 'Romantic shoots that tell your love story before the big day.',
    },
    {
      icon: Award,
      title: 'Events',
      description: 'Professional coverage for all your celebrations and milestones.',
    },
    {
      icon: Film,
      title: 'Films',
      description: 'Cinematic storytelling that brings your memories to life.',
    },
  ];

  // Show loading skeleton until mounted
  if (!mounted || !settings) {
    return (
      <div className="min-h-screen">
        {/* Hero Skeleton */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/40 dark:to-[#0F0F0F]" />
          <div className="relative z-10 text-center px-6 max-w-4xl">
            <div className="h-16 md:h-20 w-3/4 mx-auto bg-white/20 rounded mb-6 animate-pulse" />
            <div className="h-6 w-1/2 mx-auto bg-white/20 rounded mb-8 animate-pulse" />
            <div className="flex gap-4 justify-center">
              <div className="h-12 w-36 bg-white/20 rounded-full animate-pulse" />
              <div className="h-12 w-32 bg-white/20 rounded-full animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - Only render if banner image is loaded */}
      {bannerImage && (
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src={bannerImage}
            alt="Hero"
            className="w-full h-full object-cover"
            eager
            fetchPriority="high"
          />
          {/* Gradient overlay - fades from dark at top to page background at bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#FAFAFA] dark:to-[#0F0F0F]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              {settings.tagline}
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Crafting Visual Memories
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/gallery">
                <Button className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-8 py-6">
                  Explore Gallery
                </Button>
              </Link>
              <Link href="/contact">
                <Button className="bg-white !text-gray-900 hover:bg-white/90 rounded-full px-8 py-6 shadow-lg transition-all duration-200">
                  Book Now
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      )}



      {/* Featured Work */}
      <section className="py-[48px] lg:px-8 px-[32px]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Featured Work
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Explore some of our most memorable moments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className={`${index >= 3 ? 'hidden md:block' : ''}`}
                >
                  <GlassCard className="overflow-hidden">
                    <div className="relative h-80">
                      <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end p-6">
                        <div className="w-3/4 h-6 bg-white/20 rounded mb-2 animate-pulse" />
                        <div className="w-1/2 h-4 bg-white/20 rounded animate-pulse" />
                      </div>
                    </div>
                  </GlassCard>
                </div>
              ))
            ) : featuredEvents.length > 0 ? (
              featuredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={index >= 3 && !showAllEvents ? 'hidden md:block' : ''}
                >
                  <Link href={`/events/${event.slug || event.id}`}>
                    <GlassCard hover className="overflow-hidden group">
                      <div className="relative h-80 overflow-hidden">
                        {!loadedImages.has(event.id) && (
                          <div className="absolute inset-0 z-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]" />
                        )}
                        <ImageWithFallback
                          src={event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onLoad={() => setLoadedImages(prev => new Set(prev).add(event.id))}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-6">
                          <h3 className="text-white mb-2">{event.title}</h3>
                          <p className="text-white/80 text-sm">{event.coupleNames}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))
            ) : (
              // Empty state
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No featured events available</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            {/* Mobile: Show toggle button, Desktop: Show link to gallery */}
            <div className="md:hidden">
              {!showAllEvents ? (
                <Link href="/gallery">
                  <Button 
                    variant="outline" 
                    className="rounded-full px-8 border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white"
                  >
                    View Gallery <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/gallery">
                  <Button variant="outline" className="rounded-full px-8 border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white">
                    View Full Gallery <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="hidden md:block">
              <Link href="/gallery">
                <Button variant="outline" className="rounded-full px-8 border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white">
                  View All Events <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Lazy loaded for better performance */}
      <Suspense fallback={<div className="h-96 bg-gray-200 dark:bg-gray-800 animate-pulse" />}>
        <FAQSection limit={6} />
      </Suspense>

      {/* CTA Section */}
      <section className="md:py-6 lg:px-8 bg-[#FAFAFA] dark:bg-[#0F0F0F] px-[32px] py-[0px]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-8 md:p-12 lg:p-16 text-center">
              <h2 className="text-gray-900 dark:text-white mb-4 md:mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                Ready to Capture Your Special Moments?
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto">
                Let us create beautiful memories that you'll treasure for a lifetime. Book your event with Friends Media House today.
              </p>
              <Link href="/contact">
                <Button className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full px-6 md:px-8 py-4 md:py-6">
                  Book Your Event Now
                </Button>
              </Link>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </div>
  );
}