"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Star, Trash2, Eye, EyeOff, Plus, Upload } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { AvatarIcon } from '../../components/AvatarIcon';
import { defaultAvatars } from '../../lib/mock-data';
import { getReviews, addReview, deleteReview, toggleReviewVisibility, updateReview, type Review } from '../../lib/reviews-store';
import { toast } from 'sonner';
import { compressAndUploadImage } from '../../lib/upload-helper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';

export function ManageReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatars[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({
    name: '',
    email: '',
    rating: 5,
    text: '',
    eventName: '',
  });

  useEffect(() => {
    const fetchReviews = async () => {
      const storedReviews = await getReviews();
      setReviews(storedReviews || []);
    };
    fetchReviews();
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

  const handleToggleVisibility = async (id: string) => {
    await toggleReviewVisibility(id);
    // Refresh reviews from database
    const updatedReviews = await getReviews();
    setReviews(updatedReviews || []);
    const review = reviews.find((r) => r.id === id);
    if (review) {
      toast.success(review.hidden ? 'Review shown' : 'Review hidden');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      await deleteReview(id);
      // Refresh reviews from database
      const updatedReviews = await getReviews();
      setReviews(updatedReviews || []);
      toast.success('Review deleted');
    }
  };

  const handleAddReview = async () => {
    if (!newReview.name || !newReview.text || !newReview.eventName) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Determine which avatar to use - save ID for icon avatars, full data URL for uploaded images
    let finalAvatar = uploadedImage || selectedAvatar.id;

    const review = {
      id: `review-${Date.now()}`,
      name: newReview.name,
      email: newReview.email,
      rating: newReview.rating,
      text: newReview.text,
      eventName: newReview.eventName,
      avatar: finalAvatar,
      date: new Date().toISOString(),
      hidden: false,
    };

    setReviews((prev) => [review, ...prev]);
    await addReview(review);
    // Refresh reviews from database
    const updatedReviews = await getReviews();
    setReviews(updatedReviews || []);
    setNewReview({ name: '', email: '', rating: 5, text: '', eventName: '' });
    setSelectedAvatar(defaultAvatars[0]);
    setUploadedImage(null);
    setIsDialogOpen(false);
    toast.success('Review added successfully');
  };

  const filteredReviews = reviews.filter((review) => {
    if (filter === 'visible') return !review.hidden;
    if (filter === 'hidden') return review.hidden;
    return true;
  });

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-[#2B2B2B] dark:text-white mb-6 md:mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
          Manage Reviews
        </h1>

        {/* Filter Buttons */}
        <div className="flex gap-3 md:gap-4 mb-6 md:mb-8 flex-wrap items-center justify-between">
          <div className="flex gap-3 md:gap-4 flex-wrap">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'default' : 'outline'}
              className={
                filter === 'all'
                  ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full'
                  : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
              }
            >
              All Reviews ({reviews.length})
            </Button>
            <Button
              onClick={() => setFilter('visible')}
              variant={filter === 'visible' ? 'default' : 'outline'}
              className={
                filter === 'visible'
                  ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full'
                  : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
              }
            >
              Visible ({reviews.filter((r) => !r.hidden).length})
            </Button>
            <Button
              onClick={() => setFilter('hidden')}
              variant={filter === 'hidden' ? 'default' : 'outline'}
              className={
                filter === 'hidden'
                  ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full'
                  : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
              }
            >
              Hidden ({reviews.filter((r) => r.hidden).length})
            </Button>
          </div>

          {/* Add Review Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full gap-2">
                <Plus className="w-4 h-4" />
                Add Review
              </Button>
            </DialogTrigger>
            <DialogContent className="backdrop-blur-xl bg-white/90 dark:bg-black/80 border border-black/20 dark:border-white/20 sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#2B2B2B] dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Add New Review
                </DialogTitle>
                <DialogDescription className="text-[#707070] dark:text-white/70">
                  Add a new customer review manually
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name" className="text-[#1A1A1A] dark:text-[#FAFAFA] mb-2 block">
                    Customer Name *
                  </Label>
                  <Input
                    id="name"
                    value={newReview.name}
                    onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                    placeholder="Enter customer name"
                    className="rounded-lg bg-white dark:bg-[#2B2B2B] border-[#E5E5E5] dark:border-[#404040] focus:border-[#C5A572] dark:focus:border-[#C5A572] text-[#1A1A1A] dark:text-[#FAFAFA] placeholder:text-[#A0A0A0] dark:placeholder:text-[#707070]"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-[#1A1A1A] dark:text-[#FAFAFA] mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newReview.email}
                    onChange={(e) => setNewReview({ ...newReview, email: e.target.value })}
                    placeholder="Enter customer email"
                    className="rounded-lg bg-white dark:bg-[#2B2B2B] border-[#E5E5E5] dark:border-[#404040] focus:border-[#C5A572] dark:focus:border-[#C5A572] text-[#1A1A1A] dark:text-[#FAFAFA] placeholder:text-[#A0A0A0] dark:placeholder:text-[#707070]"
                  />
                </div>

                <div>
                  <Label htmlFor="eventName" className="text-[#1A1A1A] dark:text-[#FAFAFA] mb-2 block">
                    Event Name *
                  </Label>
                  <Input
                    id="eventName"
                    value={newReview.eventName}
                    onChange={(e) => setNewReview({ ...newReview, eventName: e.target.value })}
                    placeholder="e.g., Priya & Rahul Wedding"
                    className="rounded-lg bg-white dark:bg-[#2B2B2B] border-[#E5E5E5] dark:border-[#404040] focus:border-[#C5A572] dark:focus:border-[#C5A572] text-[#1A1A1A] dark:text-[#FAFAFA] placeholder:text-[#A0A0A0] dark:placeholder:text-[#707070]"
                  />
                </div>

                <div>
                  <Label className="text-[#1A1A1A] dark:text-[#FAFAFA] mb-2 block">
                    Rating *
                  </Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating })}
                        className="transition-colors hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            rating <= newReview.rating
                              ? 'fill-[#C5A572] text-[#C5A572]'
                              : 'text-[#D0D0D0] dark:text-[#505050]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="text" className="text-[#1A1A1A] dark:text-[#FAFAFA] mb-2 block">
                    Review Text *
                  </Label>
                  <Textarea
                    id="text"
                    value={newReview.text}
                    onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                    placeholder="Enter review content"
                    rows={4}
                    className="rounded-lg bg-white dark:bg-[#2B2B2B] border-[#E5E5E5] dark:border-[#404040] focus:border-[#C5A572] dark:focus:border-[#C5A572] text-[#1A1A1A] dark:text-[#FAFAFA] placeholder:text-[#A0A0A0] dark:placeholder:text-[#707070]"
                  />
                </div>

                {/* Avatar Selection */}
                <div>
                  <Label className="text-[#1A1A1A] dark:text-[#FAFAFA] mb-2 block">
                    Avatar
                  </Label>
                  <p className="text-xs text-[#707070] dark:text-[#A0A0A0] mb-3">
                    Select a default avatar or upload a custom image
                  </p>
                  
                  {/* Default Avatars Grid */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    {defaultAvatars.map((avatar) => (
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
                            : 'border-[#E5E5E5] dark:border-[#404040] hover:border-[#C5A572]/50'
                        }`}
                      >
                        <AvatarIcon avatar={avatar} size="md" />
                      </button>
                    ))}
                  </div>

                  {/* Custom Avatar Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="customAvatar" className="text-[#1A1A1A] dark:text-[#FAFAFA] text-sm">
                      Or upload custom avatar
                    </Label>
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="customAvatar"
                        className="cursor-pointer px-4 py-2 rounded-lg bg-white dark:bg-[#2B2B2B] border border-[#E5E5E5] dark:border-[#404040] hover:border-[#C5A572] transition-colors flex items-center gap-2 text-[#1A1A1A] dark:text-[#FAFAFA]"
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

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white dark:border-[#C5A572] dark:text-[#C5A572] dark:hover:bg-[#C5A572] dark:hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddReview}
                    className="flex-1 bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full"
                  >
                    Add Review
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reviews Table */}
        <div className="space-y-4">
          {filteredReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-start gap-6">
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
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg text-[#2B2B2B] dark:text-white mb-1">
                          {review.name}
                        </h3>
                        {review.email && (
                          <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-1">
                            {review.email}
                          </p>
                        )}
                        <div className="flex gap-1 mb-1">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-4 h-4 fill-[#C5A572] text-[#C5A572]"
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.hidden ? (
                          <span className="px-3 py-1 rounded-full text-xs text-white bg-gray-500">
                            Hidden
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs text-white bg-green-500">
                            Visible
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[#707070] dark:text-[#A0A0A0] mb-3">
                      "{review.text}"
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-[#707070] dark:text-[#A0A0A0]">
                        <span className="text-[#C5A572]">{review.eventName}</span>
                        <span className="mx-2">•</span>
                        <span>
                          {new Date(review.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleVisibility(review.id)}
                          className={`rounded-full gap-2 ${
                            review.hidden
                              ? 'hover:bg-green-500/20 hover:text-green-500'
                              : 'hover:bg-gray-500/20 hover:text-gray-500'
                          }`}
                        >
                          {review.hidden ? (
                            <>
                              <Eye className="w-4 h-4" />
                              Show
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hide
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(review.id)}
                          className="rounded-full gap-2 hover:bg-red-500/20 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {filteredReviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              No reviews found in this category.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}