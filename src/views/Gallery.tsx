"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { EventCard } from '../components/EventCard';
import { getEvents } from '../lib/events-store';
import { getCategories, getCategoryDisplayName } from '../lib/categories-store';
import { Button } from '../components/ui/button';
import { EventCardSkeleton } from '../components/SkeletonComponents';
import { NoEventsEmpty, NoSearchResultsEmpty } from '../components/EmptyStates';
import { supabase } from '../lib/supabase';

export function Gallery() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [events, setEvents] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState<{id: string, label: string}[]>([]);

  // Load events and categories on client side only
  useEffect(() => {
    setIsLoading(true);
    
    const loadEvents = async () => {
      let loadedEvents: any[] = [];
      
      // Try Supabase first
      try {
        if (supabase) {
          console.log('📡 Gallery: Fetching events from Supabase...');
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_visible', true)
            .order('date', { ascending: false });
          
          if (!error && data && data.length > 0) {
            console.log('✅ Gallery: Got', data.length, 'events from Supabase');
            loadedEvents = data.map((event: any) => {
              // Use custom_category from Supabase if available, otherwise use category enum
              const actualCategory = event.custom_category || event.category;
              
              return {
                id: event.id,
                title: event.title,
                slug: event.slug,
                description: event.description,
                date: event.date,
                location: event.location,
                category: actualCategory, // Use custom category if available
                coverImage: event.cover_image || event.cover_image_url,
                coupleNames: event.couple_names,
                photoCount: event.photo_count || 0,
                videoCount: event.video_count || 0,
                isFeatured: event.is_featured,
                isVisible: event.is_visible,
              };
            });
          } else {
            console.warn('⚠️ Gallery: Supabase returned no events or error:', error);
          }
        }
      } catch (err) {
        console.error('❌ Gallery: Error fetching from Supabase:', err);
      }
      
      // Fallback to localStorage if Supabase failed
      if (loadedEvents.length === 0) {
        console.log('📂 Gallery: Falling back to localStorage...');
        loadedEvents = getEvents();
      }
      
      setEvents(loadedEvents);
      
      // Calculate categories from loaded events
      const visibleEvents = loadedEvents.filter(event => event.isVisible !== false);
      const uniqueCategories = new Set(visibleEvents.map(event => event.category));
      const allCategories = getCategories();
      const activeCategories = allCategories
        .filter(cat => uniqueCategories.has(cat))
        .map(cat => ({ id: cat, label: getCategoryDisplayName(cat) }));
      
      setDynamicCategories(activeCategories);
      setMounted(true);
      setIsLoading(false);
    };
    
    loadEvents();

    // Listen for events updates
    const handleEventsUpdate = () => {
      const updatedEvents = getEvents();
      setEvents(updatedEvents);
      // Update categories when events change (new category might be added)
      const visibleEvts = updatedEvents.filter(event => event.isVisible !== false);
      const uniqueCats = new Set(visibleEvts.map(event => event.category));
      const allCats = getCategories();
      setDynamicCategories(
        allCats
          .filter(cat => uniqueCats.has(cat))
          .map(cat => ({ id: cat, label: getCategoryDisplayName(cat) }))
      );
    };

    window.addEventListener('eventsUpdated', handleEventsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('eventsUpdated', handleEventsUpdate as EventListener);
    };
  }, []);

  const categories = [
    { id: 'all', label: 'All' },
    ...dynamicCategories,
  ];

  const filteredEvents =
    selectedCategory === 'all'
      ? events.filter(event => event.isVisible !== false)
      : events.filter((event) => event.category === selectedCategory && event.isVisible !== false);

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl text-[#2B2B2B] dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Event Gallery
          </h1>
          <p className="text-[#707070] dark:text-[#A0A0A0]">
            Browse through our collection of beautiful moments
          </p>
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex justify-center gap-4 mb-12 flex-wrap"
        >
          {categories.map((category) => (
            <Button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              className={
                selectedCategory === category.id
                  ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full'
                  : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
              }
            >
              {category.label}
            </Button>
          ))}
        </motion.div>

        {/* Event Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }, (_, index) => <EventCardSkeleton key={index} />)}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : selectedCategory === 'all' ? (
          <NoEventsEmpty />
        ) : (
          <NoSearchResultsEmpty />
        )}
      </div>
    </div>
  );
}