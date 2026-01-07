"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import * as LucideIcons from 'lucide-react';
import { MessageCircle, Eye, EyeOff, Trash2, Search } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { mockPhotos, mockEvents, PhotoComment } from '../../lib/mock-data';
import { getComments, toggleCommentVisibility, deleteComment } from '../../lib/comments-store';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';

interface PhotoData {
  id: string;
  url: string;
  thumbnail?: string;
  event_id?: string;
  event_title?: string;
}

export function ManageComments() {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComments();
    loadPhotos();
    
    // Listen for comments updates
    const handleCommentsUpdate = () => {
      loadComments();
    };

    window.addEventListener('commentsUpdated', handleCommentsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('commentsUpdated', handleCommentsUpdate as EventListener);
    };
  }, []);

  const loadPhotos = async () => {
    try {
      // Fetch photos with event info from galleries API
      const response = await fetch('/api/galleries/all');
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/comments');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        setComments(Array.isArray(data) ? data : []);
      } else {
        // Fallback to local storage
        const localComments = getComments();
        setComments(Array.isArray(localComments) ? localComments : []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
      const localComments = getComments();
      setComments(Array.isArray(localComments) ? localComments : []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShow = async (id: string) => {
    try {
      await toggleCommentVisibility(id, false);
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, hidden: false } : c))
      );
      toast.success('Comment is now visible');
    } catch (error) {
      toast.error('Failed to show comment');
      console.error(error);
    }
  };

  const handleHide = async (id: string) => {
    try {
      await toggleCommentVisibility(id, true);
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, hidden: true } : c))
      );
      toast.success('Comment hidden');
    } catch (error) {
      toast.error('Failed to hide comment');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(id);
        setComments((prev) => prev.filter((c) => c.id !== id));
        toast.success('Comment deleted');
      } catch (error) {
        toast.error('Failed to delete comment');
        console.error(error);
      }
    }
  };

  const filteredComments = comments.filter((comment) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'visible' && !comment.hidden) ||
      (filter === 'hidden' && comment.hidden);

    const matchesSearch =
      searchQuery === '' ||
      comment.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.guestEmail.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getPhoto = (photoId: string) => {
    // First try to find in Supabase photos
    const supabasePhoto = photos.find((p) => p.id === photoId);
    if (supabasePhoto) return supabasePhoto;
    // Fallback to mock photos
    return mockPhotos.find((p) => p.id === photoId || p.supabasePhotoId === photoId);
  };

  const getEvent = (eventId: string) => {
    return mockEvents.find((e) => e.id === eventId);
  };

  const getAvatarContent = (avatarStr?: string) => {
    if (!avatarStr) return { type: 'initials', color: '#C5A572' };
    try {
      // Check if it's a URL (uploaded to R2)
      if (avatarStr.startsWith('http://') || avatarStr.startsWith('https://')) {
        return { type: 'image', url: avatarStr };
      }
      // Otherwise try to parse as JSON (icon + color)
      const parsed = JSON.parse(avatarStr);
      // Hide deprecated Sparkles icon by falling back to initials
      if (parsed.icon === 'Sparkles') {
        return { type: 'initials', color: parsed.color || '#C5A572' };
      }
      return { type: 'icon', icon: parsed.icon, color: parsed.color };
    } catch {
      return { type: 'initials', color: '#C5A572' };
    }
  };

  const renderAvatarIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-5 h-5" />;
  };

  const formatDate = (dateString: string) => {
    // Normalize timestamps (with or without timezone) and show in IST
    if (!dateString) return '';
    const hasOffset = /[+-]\d{2}:?\d{2}$/.test(dateString) || dateString.endsWith('Z');
    const normalized = hasOffset ? dateString : `${dateString}Z`;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(normalized));
  };

  const hiddenCount = comments.filter((c) => c.hidden).length;

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-[#2B2B2B] dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Manage Photo Comments
            </h1>
            {hiddenCount > 0 && (
              <p className="text-[#C5A572] text-sm mt-1">
                {hiddenCount} comment{hiddenCount !== 1 ? 's' : ''} hidden
              </p>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <GlassCard className="p-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/50 dark:bg-black/20 border border-black/20 dark:border-white/10 focus-within:border-[#C5A572] transition-colors">
            <Search className="w-5 h-5 text-[#707070] dark:text-[#A0A0A0] flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search comments by name, email, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[#1A1A1A] dark:text-white placeholder:text-[#707070] dark:placeholder:text-[#A0A0A0]"
            />
          </div>
        </GlassCard>

        {/* Filter Buttons */}
        <div className="flex gap-3 md:gap-4 mb-6 md:mb-8 flex-wrap">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            className={
              filter === 'all'
                ? '!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full'
                : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
            }
          >
            All Comments ({comments.length})
          </Button>
          <Button
            onClick={() => setFilter('hidden')}
            variant={filter === 'hidden' ? 'default' : 'outline'}
            className={
              filter === 'hidden'
                ? '!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full'
                : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
            }
          >
            Hidden ({hiddenCount})
          </Button>
          <Button
            onClick={() => setFilter('visible')}
            variant={filter === 'visible' ? 'default' : 'outline'}
            className={
              filter === 'visible'
                ? '!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full'
                : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
            }
          >
            Visible ({comments.filter((c) => !c.hidden).length})
          </Button>
        </div>

        {/* Comments List */}
        {isLoading ? (
          <div className="text-center py-12 text-[#707070] dark:text-[#A0A0A0]">
            Loading comments...
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-[#707070] dark:text-[#A0A0A0]" />
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              {searchQuery ? 'No comments match your search' : 'No comments yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComments.map((comment, index) => {
            // Use photo URL and event title directly from comment if available
            const photo = getPhoto(comment.photoId);
            const photoUrl = (comment as any).photoUrl || (photo as any)?.thumbnail || (photo as any)?.url;
            const eventTitle = (comment as any).eventTitle || (photo as any)?.event_title || (photo ? getEvent((photo as any).eventId || (photo as any).event_id)?.title : null);
            const avatarContent = getAvatarContent(comment.avatar);
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <GlassCard className="p-4 md:p-6">
                  <div className="flex gap-4 md:gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="w-12 h-12 border-2 border-[#C5A572] flex items-center justify-center">
                        {avatarContent.type === 'image' ? (
                          <AvatarImage src={avatarContent.url} alt={comment.guestName} />
                        ) : avatarContent.type === 'icon' ? (
                          <div style={{ backgroundColor: avatarContent.color || '#C5A572' }} className="w-full h-full flex items-center justify-center text-white rounded-full">
                            {renderAvatarIcon(avatarContent.icon)}
                          </div>
                        ) : (
                          <AvatarFallback style={{ backgroundColor: avatarContent.color || '#C5A572' }} className="text-white">
                            {comment.guestName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>

                    {/* Photo Thumbnail */}
                    {photoUrl && (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                        <img
                          src={photoUrl}
                          alt="Photo"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image failed to load:', photoUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Comment Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[#2B2B2B] dark:text-white font-semibold">
                              {comment.guestName}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                comment.hidden
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-green-500/10 text-green-600 dark:text-green-400'
                              }`}
                            >
                              {comment.hidden ? 'Hidden' : 'Visible'}
                            </span>
                          </div>
                          <p className="text-xs text-[#707070] dark:text-[#A0A0A0] mb-2">
                            {comment.guestEmail}
                          </p>

                          {/* Event Info */}
                          {eventTitle && (
                            <p className="text-xs text-[#C5A572] font-medium mb-2">
                              📸 {eventTitle}
                            </p>
                          )}

                          <p className="text-[#2B2B2B] dark:text-white text-sm mb-2">
                            "{comment.comment}"
                          </p>
                          <p className="text-xs text-[#707070] dark:text-[#A0A0A0]">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                          {comment.hidden && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleShow(comment.id)}
                              className="rounded-full text-green-600 hover:bg-green-500/10"
                              title="Show"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {!comment.hidden && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleHide(comment.id)}
                              className="rounded-full text-red-600 hover:bg-red-500/10"
                              title="Hide"
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(comment.id)}
                            className="rounded-full text-red-500 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
          </div>
        )}
      </motion.div>
    </div>
  );
}