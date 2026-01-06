"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Upload, Plus, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { GlassCard } from './GlassCard';
import { Event } from '../lib/mock-data';
import { getCategories, addCategory, getCategoryDisplayName } from '../lib/categories-store';
import { uploadToR2 } from '../lib/upload-helper';
import { toast } from 'sonner';

interface EditEventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: Event) => void;
}

export function EditEventModal({ event, isOpen, onClose, onSave }: EditEventModalProps) {
  const [formData, setFormData] = useState<Event | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({ 
        ...event,
        isFeatured: event.isFeatured || false
      });
      setCoverImagePreview(event.coverImage);
      setCoverImageFile(null);
    }
    setCategories(getCategories());
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (!formData.coupleNames.trim()) {
      toast.error('Please enter couple names');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Please enter a location');
      return;
    }
    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    setIsUploading(true);
    
    try {
      let finalCoverImage = formData.coverImage;
      let finalCoverThumbnail = formData.coverThumbnail;
      
      // If a new cover image file is selected, upload it to R2
      if (coverImageFile) {
        toast.loading('Uploading cover image...');
        const uploadResult = await uploadToR2(coverImageFile, 'events');
        if (uploadResult.success && uploadResult.url) {
          finalCoverImage = uploadResult.url;
          finalCoverThumbnail = uploadResult.thumbnailUrl; // Store thumbnail URL
          toast.dismiss();
          toast.success('Cover image uploaded!');
        } else {
          toast.dismiss();
          toast.error(uploadResult.error || 'Failed to upload cover image');
          setIsUploading(false);
          return;
        }
      }

      // If cover image file is selected, use its preview URL
      const updatedFormData = {
        ...formData,
        coverImage: finalCoverImage,
        coverThumbnail: finalCoverThumbnail,
      };

      onSave(updatedFormData);
      toast.success('Event updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (field: keyof Event, value: string | number | boolean) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory);
      setCategories(getCategories());
      setNewCategory('');
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassCard className="overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-white/10">
                  <h2 className="text-2xl text-[#2B2B2B] dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Edit Event
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                  {/* Event Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-[#2B2B2B] dark:text-white">
                      Event Title
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="e.g., Priya & Rahul Wedding"
                      className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                      required
                    />
                  </div>

                  {/* Couple Names */}
                  <div className="space-y-2">
                    <Label htmlFor="coupleNames" className="text-[#2B2B2B] dark:text-white">
                      Couple Names
                    </Label>
                    <Input
                      id="coupleNames"
                      value={formData.coupleNames}
                      onChange={(e) => handleChange('coupleNames', e.target.value)}
                      placeholder="e.g., Priya Sharma & Rahul Verma"
                      className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                      required
                    />
                  </div>

                  {/* Date and Category Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-[#2B2B2B] dark:text-white">
                        Event Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-[#2B2B2B] dark:text-white">
                        Category
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => handleChange('category', value)}
                      >
                        <SelectTrigger className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {getCategoryDisplayName(category)}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">
                            <div className="flex items-center">
                              <Plus className="w-4 h-4 mr-2" />
                              Add New Category
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.category === 'new' && (
                        <div className="mt-2">
                          <Input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Enter new category"
                            className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                          />
                          <Button
                            type="button"
                            className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-6 mt-2"
                            onClick={handleAddCategory}
                          >
                            Add Category
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-[#2B2B2B] dark:text-white">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="e.g., The Grand Palace, Mumbai"
                      className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                      required
                    />
                  </div>

                  {/* Upload Cover Image */}
                  <div className="space-y-2">
                    <Label htmlFor="coverImageFile" className="text-[#2B2B2B] dark:text-white">
                      Cover Image
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center transition-all border-black/20 dark:border-white/10 hover:border-[#C5A572]">
                      {coverImagePreview && (
                        <div className="mb-4">
                          <img
                            src={coverImagePreview}
                            alt="Cover Image Preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <Upload className="w-12 h-12 text-[#C5A572] mx-auto mb-3" />
                      <p className="text-[#707070] dark:text-[#A0A0A0] mb-3">
                        Click to upload or drag & drop
                      </p>
                      <label htmlFor="coverImageFile">
                        <Button
                          type="button"
                          className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-6"
                          onClick={() => document.getElementById('coverImageFile')?.click()}
                        >
                          Browse Files
                        </Button>
                      </label>
                      <input
                        id="coverImageFile"
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Featured Event Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFeatured"
                      checked={formData.isFeatured || false}
                      onCheckedChange={(checked) => handleChange('isFeatured', checked as boolean)}
                      className="border-black/20 dark:border-white/10 data-[state=checked]:bg-[#C5A572] data-[state=checked]:border-[#C5A572]"
                    />
                    <label
                      htmlFor="isFeatured"
                      className="text-sm font-medium text-[#2B2B2B] dark:text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Feature this event on homepage
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onClose}
                      className="flex-1 rounded-lg"
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUploading}
                      className="flex-1 !bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-lg disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}