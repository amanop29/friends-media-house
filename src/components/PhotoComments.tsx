"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import * as LucideIcons from 'lucide-react';
import { MessageCircle, Send, User, Clock, Upload } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { PhotoComment, defaultAvatars } from '../lib/mock-data';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { AvatarIcon } from './AvatarIcon';
import { getCommentsByPhoto, addComment } from '../lib/comments-store';
import { uploadToR2 } from '../lib/upload-helper';
import { toast } from 'sonner';

interface PhotoCommentsProps {
  photoId: string | null;
  photoUrl?: string;
  eventTitle?: string;
  onCommentAdded?: () => void;
}

export function PhotoComments({ photoId, photoUrl, eventTitle, onCommentAdded }: PhotoCommentsProps) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [isCommenting, setIsCommenting] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatars[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    comment: '',
  });
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  // Early return if no photoId
  if (!photoId) {
    return null;
  }

  useEffect(() => {
    // Load comments from API
    const loadComments = async () => {
      setIsLoadingComments(true);
      try {
        console.log('📝 Loading comments for photo:', photoId, 'url:', photoUrl?.substring(0, 50));
        // Build query with both photoId and photoUrl for better matching
        const params = new URLSearchParams();
        if (photoId) params.append('photoId', photoId);
        if (photoUrl) params.append('photoUrl', photoUrl);
        
        const response = await fetch(`/api/comments?${params.toString()}`);
        
        if (!response.ok) {
          console.warn('⚠️ Comments API returned status:', response.status);
          const errorData = await response.json().catch(() => ({}));
          console.warn('⚠️ Error details:', errorData);
          throw new Error(`Failed to fetch comments: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Loaded', data?.length || 0, 'comments');
        // API returns array directly, not wrapped in comments property
        setComments(Array.isArray(data) ? data : (data.comments || []));
      } catch (error) {
        console.error('❌ Error loading comments from API:', error);
        // Fallback to localStorage
        console.log('📂 Falling back to localStorage for comments');
        setComments(getCommentsByPhoto(photoId));
      } finally {
        setIsLoadingComments(false);
      }
    };

    loadComments();

    // Listen for comment updates
    const handleCommentsUpdate = (event: CustomEvent) => {
      console.log('🔄 Comments update event received for photo:', photoId);
      loadComments(); // Reload from API
    };

    window.addEventListener('commentsUpdated', handleCommentsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('commentsUpdated', handleCommentsUpdate as EventListener);
    };
  }, [photoId, photoUrl]);

  const visibleComments = comments.filter(c => !c.hidden);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      // Upload to R2
      const loadingToast = toast.loading('Uploading avatar...');
      try {
        const result = await uploadToR2(file, 'avatars');
        
        if (result.success && result.url) {
          setUploadedImage(result.url);
          toast.success('Avatar uploaded!', { id: loadingToast });
        } else {
          toast.error('Failed to upload avatar', { id: loadingToast });
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
        toast.error('Failed to upload avatar', { id: loadingToast });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.guestName || !formData.guestEmail || !formData.comment) {
      toast.error('Please fill in all fields');
      return;
    }

    const finalAvatar = uploadedImage || JSON.stringify(selectedAvatar);
    
    const newComment = {
      photoId,
      guestName: formData.guestName,
      guestEmail: formData.guestEmail,
      comment: formData.comment,
      avatar: finalAvatar,
      photoUrl: photoUrl || '',
      eventTitle: eventTitle || '',
    };
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newComment),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', data);
        const errorMsg = data.message || data.error || 'Failed to post comment';
        throw new Error(errorMsg);
      }
      
      if (!data.success && !data.comment) {
        console.error('Unexpected response format:', data);
        throw new Error('Invalid API response');
      }
      
      toast.success('Comment posted successfully!');
      
      // Add the comment to local state immediately
      const commentToAdd = data.comment || data;
      if (commentToAdd && commentToAdd.id) {
        setComments(prev => [commentToAdd, ...prev]);
      }
      
      setFormData({ guestName: '', guestEmail: '', comment: '' });
      setSelectedAvatar(defaultAvatars[0]);
      setUploadedImage(null);
      setIsCommenting(false);
      
      // Call the callback to update parent component
      if (onCommentAdded) {
        onCommentAdded();
      }
      
      // Dispatch event to notify other listeners
      window.dispatchEvent(new CustomEvent('commentsUpdated', { detail: { photoId } }));
      
      // Also reload from API to ensure sync
      try {
        const commentsResponse = await fetch(`/api/comments?photoId=${photoId}`);
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(Array.isArray(commentsData) ? commentsData : (commentsData.comments || []));
        }
      } catch (err) {
        console.warn('Failed to reload comments:', err);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error(`Failed to post comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatDate = (dateString: string) => {
    // Normalize timestamps that might lack timezone info and render in IST
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[#C5A572]" />
          <span className="text-[#1A1A1A] dark:text-white">
            Comments ({visibleComments.length})
          </span>
        </div>
        {!isCommenting && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCommenting(true)}
            className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white"
          >
            Add Comment
          </Button>
        )}
      </div>

      {/* Add Comment Form */}
      {isCommenting && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <GlassCard className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Your Name *"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                  required
                />
                <Input
                  type="email"
                  placeholder="Your Email *"
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                  required
                />
              </div>
              <Textarea
                placeholder="Write your comment... *"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572] resize-none"
                rows={3}
                required
              />
              
              {/* Avatar Selection */}
              <div>
                <Label className="text-[#2B2B2B] dark:text-white mb-2 block text-sm">
                  Select Avatar
                </Label>
                <div className="flex flex-wrap gap-3 mb-2">
                  {defaultAvatars.slice(0, 6).map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(avatar);
                        setUploadedImage(null);
                      }}
                      className={`group relative rounded-[999px] border-2 transition-all duration-200 flex-shrink-0 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#C5A572] focus:ring-offset-2 dark:focus:ring-offset-[#0F0F0F] ${
                        selectedAvatar.id === avatar.id && !uploadedImage
                          ? 'border-[#C5A572]'
                          : 'border-white/20 dark:border-white/10 hover:border-[#C5A572]/50'
                      }`}
                    >
                      <AvatarIcon avatar={avatar} size="sm" />
                    </button>
                  ))}
                </div>
                
                {/* Upload Option */}
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/10 hover:border-[#C5A572] transition-colors flex items-center gap-2 text-[#2B2B2B] dark:text-white text-sm"
                  >
                    <Upload className="w-3 h-3" />
                    Upload Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  {uploadedImage && (
                    <ImageWithFallback
                      src={uploadedImage}
                      alt="Uploaded Avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-[#C5A572]"
                    />
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCommenting(false);
                    setFormData({ guestName: '', guestEmail: '', comment: '' });
                    setSelectedAvatar(defaultAvatars[0]);
                    setUploadedImage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}

      {/* Comments List */}
      {isLoadingComments ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C5A572] border-t-transparent mx-auto mb-3" />
          <p className="text-[#707070] dark:text-[#A0A0A0] text-sm">Loading comments...</p>
        </div>
      ) : visibleComments.length > 0 ? (
        <div className="space-y-3">
          {visibleComments.map((comment) => {
            // Parse avatar - could be URL, JSON icon object, or undefined
            const renderCommentAvatar = () => {
              if (!comment.avatar) {
                return (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                );
              }
              
              // Check if it's a URL (uploaded image)
              if (comment.avatar.startsWith('http://') || comment.avatar.startsWith('https://')) {
                return (
                  <img
                    src={comment.avatar}
                    alt={comment.guestName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                );
              }
              
              // Try to parse as JSON (icon + color)
              try {
                const parsed = JSON.parse(comment.avatar);
                // Hide deprecated Sparkles icon by using a User fallback
                if (parsed.icon === 'Sparkles') {
                  return (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  );
                }
                if (parsed.icon) {
                  const IconComponent = (LucideIcons as any)[parsed.icon];
                  if (IconComponent) {
                    return (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: parsed.color || '#C5A572' }}
                      >
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                    );
                  }
                }
              } catch {
                // Not valid JSON, fallback to default
              }
              
              // Default fallback
              return (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              );
            };
            
            return (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-4">
                <div className="flex gap-3">
                  {renderCommentAvatar()}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[#2B2B2B] dark:text-white">
                        {comment.guestName}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-[#707070] dark:text-[#A0A0A0]">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(comment.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-[#707070] dark:text-[#A0A0A0] text-sm">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
          })}
        </div>
      ) : (
        !isCommenting && (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-[#707070] dark:text-[#A0A0A0] opacity-50" />
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              No comments yet. Be the first to comment!
            </p>
          </div>
        )
      )}
    </div>
  );
}