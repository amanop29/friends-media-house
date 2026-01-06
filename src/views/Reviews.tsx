"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Star, Send, Upload } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { AvatarIcon } from '../components/AvatarIcon';
import { defaultAvatars } from '../lib/mock-data';
import { getReviews, addReview } from '../lib/reviews-store';
import { ReviewCardSkeleton } from '../components/SkeletonComponents';
import { NoReviewsEmpty } from '../components/EmptyStates';
import { toast } from 'sonner';
import { compressAndUploadImage } from '../lib/upload-helper';

export function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load reviews on client side only
  useEffect(() => {
    const loadReviews = async () => {
      const loadedReviews = await getReviews();
      setReviews(loadedReviews || []); // Ensure it's always an array
      setMounted(true);
    };
    loadReviews();
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const visibleReviews = Array.isArray(reviews) ? reviews.filter((r) => !r.hidden) : [];
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatars[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    eventName: '',
    review: '',
  });

  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    
    // Load reviews on mount
    const loadReviewsData = async () => {
      const loadedReviews = await getReviews();
      setReviews(loadedReviews || []); // Ensure it's always an array
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    };
    loadReviewsData();

    // Listen for reviews updates
    const handleReviewsUpdate = (event: CustomEvent) => {
      setReviews(event.detail);
    };

    window.addEventListener('reviewsUpdated', handleReviewsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('reviewsUpdated', handleReviewsUpdate as EventListener);
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading toast
    const loadingToast = toast.loading('Uploading avatar...');

    try {
      // Upload to R2
      const result = await compressAndUploadImage(file, 'avatars', 2);
      
      if (!result.success || !result.url) {
        toast.error(result.error || 'Failed to upload avatar', { id: loadingToast });
        return;
      }

      setUploadedImage(result.url);
      toast.success('Avatar uploaded successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar', { id: loadingToast });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating) {
      toast.error('Please select a rating');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!formData.review.trim()) {
      toast.error('Please write your review');
      return;
    }

    // Add review to store
    await addReview({
      id: `review-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      avatar: uploadedImage || selectedAvatar.id,
      rating: rating,
      text: formData.review,
      date: new Date().toISOString(),
      eventName: formData.eventName || 'General Review',
      hidden: false,
    });

    toast.success('Thank you for your review! It will be visible after approval.');
    
    // Refresh reviews
    const updatedReviews = await getReviews();
    setReviews(updatedReviews || []);
    
    // Reset form
    setFormData({ name: '', email: '', eventName: '', review: '' });
    setRating(0);
    setSelectedAvatar(defaultAvatars[0]);
    setUploadedImage(null);
    setShowWriteReview(false);
  };

  return (
    <div className="min-h-screen pt-[128px] pb-[48px] px-6 lg:px-8 pr-[32px] pl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl text-[#2B2B2B] dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Client Reviews
          </h1>
          <p className="text-[#707070] dark:text-[#A0A0A0] mb-6">
            Hear what our clients have to say about their experience
          </p>
          <Button
            onClick={() => setShowWriteReview(!showWriteReview)}
            className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full px-8"
          >
            {showWriteReview ? 'Close' : 'Write a Review'}
          </Button>
        </motion.div>

        {/* Write Review Form */}
        {showWriteReview && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-12"
          >
            <GlassCard className="p-8">
              <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                Share Your Experience
              </h2>
              
              <form onSubmit={handleSubmitReview} className="space-y-6">
                {/* Rating */}
                <div>
                  <Label className="text-[#2B2B2B] dark:text-white mb-2 block">
                    Your Rating <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= (hoverRating || rating)
                              ? 'fill-[#C5A572] text-[#C5A572]'
                              : 'text-[#707070] dark:text-[#A0A0A0]'
                          }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-4 text-[#707070] dark:text-[#A0A0A0] self-center">
                        {rating} out of 5 stars
                      </span>
                    )}
                  </div>
                </div>

                {/* Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-[#2B2B2B] dark:text-white mb-2 block">
                      Your Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-[#2B2B2B] dark:text-white mb-2 block">
                      Your Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                      required
                    />
                  </div>
                </div>

                {/* Event Name */}
                <div>
                  <Label htmlFor="eventName" className="text-[#2B2B2B] dark:text-white mb-2 block">
                    Event Name <span className="text-[#707070] dark:text-[#A0A0A0]">(Optional)</span>
                  </Label>
                  <Input
                    id="eventName"
                    value={formData.eventName}
                    onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                    placeholder="e.g., Priya & Rahul Wedding"
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                </div>

                {/* Review Text */}
                <div>
                  <Label htmlFor="review" className="text-[#2B2B2B] dark:text-white mb-2 block">
                    Your Review <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="review"
                    value={formData.review}
                    onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                    placeholder="Share your experience with Friends Media House..."
                    rows={5}
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572] resize-none"
                    required
                  />
                </div>

                {/* Avatar Selection */}
                <div>
                  <Label className="text-[#2B2B2B] dark:text-white mb-2 block">
                    Select Your Avatar
                  </Label>
                  <p className="text-xs text-[#707070] dark:text-[#A0A0A0] mb-3">
                    Choose a default avatar or upload your own image
                  </p>
                  
                  {/* Default Avatars Grid */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    {defaultAvatars.map((avatar, index) => (
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
                        <AvatarIcon avatar={avatar} size="md" />
                      </button>
                    ))}
                  </div>

                  {/* Custom Avatar Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="customAvatar" className="text-[#2B2B2B] dark:text-white text-sm">
                      Or upload your own image
                    </Label>
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="customAvatar"
                        className="cursor-pointer px-4 py-2 rounded-lg bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/10 hover:border-[#C5A572] transition-colors flex items-center gap-2 text-[#2B2B2B] dark:text-white"
                      >
                        <Upload className="w-4 h-4" />
                        Choose Image
                      </label>
                      <Input
                        id="customAvatar"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {uploadedImage && (
                        <div className="flex items-center gap-2">
                          <ImageWithFallback
                            src={uploadedImage}
                            alt="Uploaded Avatar"
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#C5A572]"
                          />
                          <button
                            type="button"
                            onClick={() => setUploadedImage(null)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#707070] dark:text-[#A0A0A0]">
                      Max file size: 5MB
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowWriteReview(false)}
                    className="rounded-lg text-[#2B2B2B] dark:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-lg gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Submit Review
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Overall Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <GlassCard className="p-8 text-center">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div>
                <div className="text-5xl text-[#C5A572] mb-2">
                  {visibleReviews.length > 0
                    ? (visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length).toFixed(1)
                    : '5.0'}
                </div>
                <div className="flex gap-1 mb-2 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-[#C5A572] text-[#C5A572]" />
                  ))}
                </div>
                <p className="text-[#707070] dark:text-[#A0A0A0]">Average Rating</p>
              </div>
              <div className="h-16 w-px bg-white/20 dark:bg-white/10 hidden md:block" />
              <div>
                <div className="text-5xl text-[#C5A572] mb-2">{visibleReviews.length}</div>
                <p className="text-[#707070] dark:text-[#A0A0A0]">Happy Clients</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            [...Array(3)].map((_, index) => (
              <ReviewCardSkeleton key={index} />
            ))
          ) : visibleReviews.length > 0 ? (
            visibleReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={index < 3 ? { opacity: 1, y: 0 } : undefined}
                whileInView={index >= 3 ? { opacity: 1, y: 0 } : undefined}
                viewport={index >= 3 ? { once: true } : undefined}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <GlassCard className="p-8 h-full flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    {review.avatar.startsWith('data:') || review.avatar.startsWith('http') ? (
                      <ImageWithFallback
                        src={review.avatar}
                        alt={review.name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0">
                        <AvatarIcon 
                          avatar={defaultAvatars.find(a => a.id === review.avatar) || defaultAvatars[0]} 
                          size="md" 
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-[#2B2B2B] dark:text-white mb-1">{review.name}</h3>
                      <div className="flex gap-1 mb-1">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-[#C5A572] text-[#C5A572]" />
                        ))}
                      </div>
                      <p className="text-[#707070] dark:text-[#A0A0A0] text-xs">
                        {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <p className="text-[#707070] dark:text-[#A0A0A0] mb-4 flex-1">
                    "{review.text}"
                  </p>

                  <div className="pt-4 border-t border-white/20 dark:border-white/10">
                    <p className="text-[#C5A572] text-sm">{review.eventName}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))
          ) : (
            <NoReviewsEmpty />
          )}
        </div>
      </div>
    </div>
  );
}