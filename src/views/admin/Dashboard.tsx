"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Image as ImageIcon, Calendar, Eye, TrendingUp, Video as VideoIcon, Star, Users, Mail, ArrowRight } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { getEvents, getEventsFromSupabase } from '../../lib/events-store';
import { getPhotos, getPhotosFromSupabase, getPhotoCount } from '../../lib/photos-store';
import { getReviews } from '../../lib/reviews-store';
import { getLeads } from '../../lib/leads-store';
import { getVideoCount } from '../../lib/videos-store';
import { formatEventType } from '../../lib/utils';
import { Event, Photo, Review, Lead, Video } from '../../lib/mock-data';

interface ActivityItem {
  event: string;
  details: string;
  time: string;
  timestamp: number;
}

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [videoCount, setVideoCount] = useState(0);
  
  // Load initial data
  const loadData = async () => {
    try {
      // Try to fetch from Supabase first, fall back to localStorage
      const [loadedEvents, loadedPhotos, loadedReviews, loadedLeads, loadedVideoCount] = await Promise.all([
        getEventsFromSupabase().catch(() => getEvents()),
        getPhotosFromSupabase().catch(() => getPhotos()),
        getReviews().catch(() => []),
        getLeads().catch(() => []),
        getVideoCount().catch(() => 0),
      ]);
      
      setEvents(loadedEvents);
      setPhotos(loadedPhotos);
      setReviews(loadedReviews || []);
      setLeads(loadedLeads || []);
      setVideoCount(loadedVideoCount);
      
      // Generate recent activity
      generateRecentActivity(loadedEvents, loadedPhotos, loadedReviews || [], loadedLeads || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to localStorage data
      const localEvents = getEvents();
      const localPhotos = getPhotos();
      setEvents(localEvents);
      setPhotos(localPhotos);
    }
  };

  useEffect(() => {
    // Initial load
    setIsLoading(true);
    loadData();
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    
    // Real-time sync event listeners
    const handleEventsUpdated = () => {
      loadData();
    };
    
    const handlePhotosUpdated = () => {
      loadData();
    };
    
    const handleReviewsUpdated = () => {
      loadData();
    };
    
    const handleLeadsUpdated = () => {
      loadData();
    };
    
    window.addEventListener('eventsUpdated', handleEventsUpdated);
    window.addEventListener('photosUpdated', handlePhotosUpdated);
    window.addEventListener('reviewsUpdated', handleReviewsUpdated);
    window.addEventListener('leadsUpdated', handleLeadsUpdated);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('eventsUpdated', handleEventsUpdated);
      window.removeEventListener('photosUpdated', handlePhotosUpdated);
      window.removeEventListener('reviewsUpdated', handleReviewsUpdated);
      window.removeEventListener('leadsUpdated', handleLeadsUpdated);
    };
  }, []);

  // Generate recent activity from real data
  const generateRecentActivity = (
    events: Event[], 
    photos: Photo[], 
    reviews: Review[], 
    leads: Lead[]
  ) => {
    const activities: ActivityItem[] = [];
    
    // Add recent events (created in last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Helper to get timestamp from various date formats
    const getTimestamp = (dateValue: any): number => {
      if (!dateValue) return 0;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    };
    
    events.forEach(event => {
      // Use created_at if available, otherwise use event date
      const eventTimestamp = getTimestamp((event as any).created_at) || getTimestamp(event.date);
      if (eventTimestamp > thirtyDaysAgo) {
        activities.push({
          event: 'New event created',
          details: event.title,
          time: formatTimeAgo(eventTimestamp),
          timestamp: eventTimestamp
        });
      }
    });
    
    // Add photo uploads (group by event)
    const photosByEvent: { [eventId: string]: Photo[] } = {};
    photos.forEach(photo => {
      const eventKey = photo.eventId || (photo as any).event_id || 'unknown';
      if (!photosByEvent[eventKey]) {
        photosByEvent[eventKey] = [];
      }
      photosByEvent[eventKey].push(photo);
    });
    
    Object.entries(photosByEvent).forEach(([eventId, eventPhotos]) => {
      const event = events.find(e => e.id === eventId || (e as any).supabaseId === eventId);
      if (eventPhotos.length > 0) {
        // Use most recent photo timestamp
        const mostRecentPhoto = eventPhotos.reduce((latest, photo) => {
          const photoTime = getTimestamp(photo.uploadedAt) || getTimestamp((photo as any).created_at);
          const latestTime = getTimestamp(latest.uploadedAt) || getTimestamp((latest as any).created_at);
          return photoTime > latestTime ? photo : latest;
        });
        const photoTimestamp = getTimestamp(mostRecentPhoto.uploadedAt) || getTimestamp((mostRecentPhoto as any).created_at);
        
        if (photoTimestamp > thirtyDaysAgo) {
          activities.push({
            event: 'Photos uploaded',
            details: `${eventPhotos.length} photos${event ? ` to ${event.title}` : ''}`,
            time: formatTimeAgo(photoTimestamp),
            timestamp: photoTimestamp
          });
        }
      }
    });
    
    // Add recent reviews
    reviews.forEach(review => {
      const reviewTimestamp = getTimestamp(review.date) || getTimestamp((review as any).created_at) || getTimestamp((review as any).submitted_at);
      if (reviewTimestamp > thirtyDaysAgo && !review.hidden) {
        activities.push({
          event: 'New review published',
          details: `From ${review.name}`,
          time: formatTimeAgo(reviewTimestamp),
          timestamp: reviewTimestamp
        });
      }
    });
    
    // Add recent leads
    leads.forEach(lead => {
      const leadTimestamp = getTimestamp((lead as any).created_at) || getTimestamp(lead.date);
      if (leadTimestamp > thirtyDaysAgo) {
        activities.push({
          event: lead.status === 'converted' ? 'Lead converted' : 'New lead received',
          details: `${lead.name} - ${formatEventType(lead.eventType)}`,
          time: formatTimeAgo(leadTimestamp),
          timestamp: leadTimestamp
        });
      }
    });
    
    // Sort by timestamp (most recent first) and take top 8
    activities.sort((a, b) => b.timestamp - a.timestamp);
    setRecentActivity(activities.slice(0, 8));
  };

  // Format timestamp to relative time
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
  };

  // Calculate stats
  const totalEvents = events.length;
  const totalPhotos = photos.length;
  const visibleReviews = reviews.filter(r => !r.hidden).length;
  
  // Use video count from Supabase, fall back to local calculation
  const totalVideos = videoCount > 0 ? videoCount : events.reduce((sum, event) => {
    return sum + ((event.videos || []) as Video[]).length;
  }, 0);
  
  // Leads stats
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const convertedLeads = leads.filter(l => l.status === 'converted').length;

  const stats = [
    { label: 'Total Events', value: totalEvents, icon: Calendar, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Photos', value: totalPhotos, icon: ImageIcon, color: 'from-green-500 to-green-600' },
    { label: 'Total Videos', value: totalVideos, icon: VideoIcon, color: 'from-purple-500 to-purple-600' },
    { label: 'Visible Reviews', value: visibleReviews, icon: Star, color: 'from-yellow-500 to-yellow-600' },
  ];

  // Calculate monthly data from photos (last 6 months)
  const getMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      
      // Count photos uploaded in this month
      const photoCount = photos.filter(photo => {
        // Try to get upload date from various sources
        let photoDate: Date | null = null;
        
        if (photo.uploadedAt) {
          photoDate = new Date(photo.uploadedAt);
        } else if ((photo as any).created_at) {
          photoDate = new Date((photo as any).created_at);
        } else {
          // Fallback: try to parse timestamp from photo ID
          const photoIdMatch = photo.id.match(/\d+/);
          if (photoIdMatch) {
            const timestamp = parseInt(photoIdMatch[0]);
            // Check if it's a valid timestamp (after year 2000)
            if (timestamp > 946684800000) {
              photoDate = new Date(timestamp);
            }
          }
        }
        
        if (!photoDate || isNaN(photoDate.getTime())) return false;
        
        return photoDate.getMonth() === date.getMonth() && 
               photoDate.getFullYear() === date.getFullYear();
      }).length;
      
      monthlyData.push({
        month: monthName,
        photos: photoCount
      });
    }
    
    return monthlyData;
  };

  const monthlyData = getMonthlyData();
  const maxPhotos = Math.max(...monthlyData.map(d => d.photos), 1); // Avoid division by zero

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-[#2B2B2B] dark:text-white mb-6 md:mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
          Dashboard
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <GlassCard className="p-4 md:p-6">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl text-[#2B2B2B] dark:text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-[#707070] dark:text-[#A0A0A0] text-sm">
                    {stat.label}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* Leads Overview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-6 md:mb-8"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl text-[#2B2B2B] dark:text-white">Leads Overview</h2>
                  <p className="text-sm text-[#707070] dark:text-[#A0A0A0]">Recent inquiries from potential clients</p>
                </div>
              </div>
              <Link href="/admin/leads">
                <Button 
                  variant="outline" 
                  className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white gap-2"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Leads Stats Mini Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-white/5 dark:bg-black/10 border border-black/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-[#2B2B2B] dark:text-white">{totalLeads}</p>
                    <p className="text-xs text-[#707070] dark:text-[#A0A0A0]">Total Leads</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/5 dark:bg-black/10 border border-black/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-[#2B2B2B] dark:text-white">{newLeads}</p>
                    <p className="text-xs text-[#707070] dark:text-[#A0A0A0]">New Leads</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/5 dark:bg-black/10 border border-black/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-[#2B2B2B] dark:text-white">{convertedLeads}</p>
                    <p className="text-xs text-[#707070] dark:text-[#A0A0A0]">Converted</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
          {/* Monthly Upload Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[#C5A572]" />
                <h2 className="text-xl text-[#2B2B2B] dark:text-white">Monthly Uploads</h2>
              </div>
              
              <div className="space-y-4">
                {monthlyData.map((data, index) => (
                  <div key={data.month} className="flex items-center gap-4">
                    <div className="w-12 text-[#707070] dark:text-[#A0A0A0] text-sm">
                      {data.month}
                    </div>
                    <div className="flex-1">
                      <div className="h-8 bg-white/10 dark:bg-black/20 rounded-lg overflow-hidden border border-black/20 dark:border-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(data.photos / maxPhotos) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                          className="h-full bg-gradient-to-r from-[#C5A572] to-[#8B7355] flex items-center justify-end pr-2"
                        >
                          {data.photos > 0 && (
                            <span className="text-white text-sm">{data.photos}</span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-xl text-[#2B2B2B] dark:text-white mb-6">Recent Activity</h2>
              
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex gap-4 pb-4 border-b border-black/20 dark:border-white/10 last:border-0 last:pb-0">
                      <div className="w-2 h-2 rounded-full bg-[#C5A572] mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[#2B2B2B] dark:text-white mb-1">
                          {activity.event}
                        </div>
                        <div className="text-[#707070] dark:text-[#A0A0A0] text-sm mb-1">
                          {activity.details}
                        </div>
                        <div className="text-[#707070] dark:text-[#A0A0A0] text-xs">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[#707070] dark:text-[#A0A0A0]">
                      No recent activity. Start creating events and uploading photos!
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}