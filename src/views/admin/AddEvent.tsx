"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion } from "framer-motion";
import { Upload as UploadIcon, Save, Plus, Loader2, Trash2, ChevronDown, Check } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { getCategories, fetchCategories, addCategory, deleteCategory, getCategoryDisplayName, isDefaultCategory } from '../../lib/categories-store';
import { addEvent, generateSlug } from '../../lib/events-store';
import type { Event } from '../../lib/mock-data';
import { uploadToR2 } from '../../lib/upload-helper';
import { supabase } from '../../lib/supabase';
import { logActivity, getAdminEmail } from '../../lib/activity-log';
import { toast } from 'sonner';

export function AddEvent() {
  const [formData, setFormData] = useState({
    title: '',
    coupleNames: '',
    date: '',
    location: '',
    category: '',
    coverImage: null as File | null,
    isFeatured: false,
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    // Start with local/cache for instant render
    setCategories(getCategories());
    // Then hydrate from Supabase (best effort)
    fetchCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch((err) => console.warn('Failed to hydrate categories from Supabase:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, coverImage: file });
      // Create object URL for preview (doesn't bloat memory like base64)
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cover image
    if (!formData.coverImage) {
      toast.error('Please upload a cover image');
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload cover image to R2
      const uploadResult = await uploadToR2(formData.coverImage, 'events');
      
      if (!uploadResult.success || !uploadResult.url) {
        toast.error(uploadResult.error || 'Failed to upload cover image');
        setIsUploading(false);
        return;
      }
      
      // Create new event object with R2 URL (not base64)
      const baseSlug = generateSlug(formData.title);
      let uniqueSlug = baseSlug;
      const newEvent: Event = {
        id: `event-${Date.now()}`,
        title: formData.title,
        coupleNames: formData.coupleNames,
        date: formData.date,
        location: formData.location,
        category: formData.category,
        coverImage: uploadResult.url, // Use R2 URL instead of base64
        coverThumbnail: uploadResult.thumbnailUrl, // Store thumbnail URL
        photoCount: 0,
        isVisible: true,
        isFeatured: formData.isFeatured,
        slug: uniqueSlug,
        supabaseId: undefined,
      };

      // Ensure category exists in Supabase and get its ID before creating event
      let categoryId: string | null = null;
      if (supabase && formData.category) {
        try {
          // Upsert category first
          await supabase
            .from('categories')
            .upsert({ 
              slug: formData.category,
              label: getCategoryDisplayName(formData.category),
              is_default: isDefaultCategory(formData.category),
              is_active: true
            }, { onConflict: 'slug' });
          
          // Get category ID
          const { data: catData } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', formData.category)
            .single();
          
          if (catData?.id) {
            categoryId = catData.id;
          }
        } catch (catErr) {
          console.warn('Failed to sync category to Supabase:', catErr);
        }
      }

      // Save to Supabase (best-effort) if configured
      try {
        if (supabase) {
          let insertError: any = null;
          
          // Map category to valid event_type enum values
          const categoryMap: Record<string, string> = {
            'wedding': 'wedding',
            'pre-wedding': 'pre-wedding',
            'prewedding': 'pre-wedding',
            'event': 'event',
            'events': 'event',
            'film': 'film',
            'films': 'film',
          };
          const mappedCategory = categoryMap[newEvent.category?.toLowerCase()] || 'other';
          
          // Prepare insert data
          const insertData = {
            title: newEvent.title,
            slug: uniqueSlug,
            couple_names: newEvent.coupleNames || '',
            description: '',
            date: newEvent.date || new Date().toISOString().split('T')[0],
            location: newEvent.location || '',
            category: mappedCategory,
            cover_image_url: newEvent.coverImage,
            is_visible: newEvent.isVisible ?? true,
            is_featured: newEvent.isFeatured ?? false,
          };
          
          console.log('📤 Attempting Supabase insert with data:', insertData);
          
          for (let attempt = 0; attempt < 2; attempt++) {
            const { data, error } = await supabase
              .from('events')
              .insert(insertData)
              .select('id, slug')
              .single();

            console.log('📥 Supabase response:', { data, error });

            if (!error && data?.id) {
              newEvent.supabaseId = data.id;
              newEvent.slug = data.slug || uniqueSlug;
              insertError = null;
              console.log('✅ Event saved to Supabase with ID:', data.id);
              toast.success('Event saved to database!');
              break;
            }

            insertError = error;

            // Handle duplicate slug: regenerate and retry once
            if (error?.code === '23505') {
              uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
              newEvent.slug = uniqueSlug;
              continue;
            }

            // Other errors: stop
            break;
          }

          if (insertError) {
            console.error('Supabase event insert failed:', insertError?.message || insertError, insertError);
            toast.error(`Saved locally, but database insert failed: ${insertError?.message || 'Check Supabase policies/keys.'}`);
          }
        } else {
          console.warn('Supabase client not configured; event saved locally only.');
        }
      } catch (dbErr) {
        console.error('Error inserting event to Supabase:', dbErr);
        toast.error('Saved locally, but database insert failed.');
      }
      
      // Save to events store
      addEvent(newEvent);

      // Log activity AFTER event is saved (best effort)
      try {
        await logActivity({
          entityType: 'event',
          entityId: newEvent.supabaseId || newEvent.id,
          action: 'create',
          description: `Created event "${newEvent.title}" in category "${getCategoryDisplayName(newEvent.category)}"`,
          adminEmail: getAdminEmail() || undefined,
        });
      } catch (logErr) {
        console.warn('Failed to log activity:', logErr);
      }

      toast.success('Event created successfully!');
      
      // Clean up preview URL
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
      
      // Reset form
      setFormData({
        title: '',
        coupleNames: '',
        date: '',
        location: '',
        category: '',
        coverImage: null,
        isFeatured: false,
      });
      setPreviewImage(null);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    const success = addCategory(newCategoryName);
    if (success) {
      const normalizedCategoryName = newCategoryName.trim().toLowerCase();
      // Refresh from Supabase to ensure table gets the new category if possible
      const fresh = await fetchCategories();
      setCategories(fresh);
      setFormData({ ...formData, category: normalizedCategoryName });
      setNewCategoryName('');
      setShowNewCategoryDialog(false);
      toast.success(`Category "${newCategoryName}" added successfully!`);
    } else {
      toast.error('Category already exists');
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    // Close dropdown first if open
    setCategoryDropdownOpen(false);
    
    const success = await deleteCategory(categoryToDelete);
    if (success) {
      const fresh = await fetchCategories();
      setCategories(fresh);
      // Clear selection if the deleted category was selected
      if (formData.category === categoryToDelete) {
        setFormData({ ...formData, category: '' });
      }
      toast.success(`Category "${getCategoryDisplayName(categoryToDelete)}" deleted successfully!`);
    } else {
      toast.error('Cannot delete default categories');
    }
    setCategoryToDelete(null);
    setShowDeleteCategoryDialog(false);
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-[#2B2B2B] dark:text-white mb-6 md:mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
          Add New Event
        </h1>

        <GlassCard className="p-4 md:p-8 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-[#2B2B2B] dark:text-white mb-2">
                  Event Title *
                </label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  placeholder="e.g., Priya & Rahul Wedding"
                />
              </div>

              <div>
                <label htmlFor="coupleNames" className="block text-[#2B2B2B] dark:text-white mb-2">
                  Couple Names *
                </label>
                <Input
                  id="coupleNames"
                  type="text"
                  required
                  value={formData.coupleNames}
                  onChange={(e) => setFormData({ ...formData, coupleNames: e.target.value })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  placeholder="e.g., Priya Sharma & Rahul Verma"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-[#2B2B2B] dark:text-white mb-2">
                  Event Date *
                </label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-[#2B2B2B] dark:text-white mb-2">
                  Category *
                </label>
                {/* Custom dropdown with delete icons */}
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-lg bg-white/50 dark:bg-black/20 border border-black/20 dark:border-white/10 focus:border-[#C5A572] px-3 py-2 text-sm h-9 transition-colors"
                  >
                    <span className={formData.category ? 'text-[#2B2B2B] dark:text-white' : 'text-gray-400 dark:text-gray-600'}>
                      {formData.category ? getCategoryDisplayName(formData.category) : 'Select category'}
                    </span>
                    <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {categoryDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl max-h-60 overflow-y-auto">
                      {categories.map(category => (
                        <div
                          key={category}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group transition-colors"
                        >
                          <div
                            className="flex-1 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                            onClick={() => {
                              setFormData({ ...formData, category });
                              setCategoryDropdownOpen(false);
                            }}
                          >
                            {formData.category === category && (
                              <Check className="w-4 h-4 text-[#C5A572]" />
                            )}
                            <span className={formData.category === category ? 'text-[#C5A572] font-medium' : ''}>
                              {getCategoryDisplayName(category)}
                            </span>
                          </div>
                          {!isDefaultCategory(category) && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                // Use onMouseDown to prevent dropdown from closing before we can set state
                                e.stopPropagation();
                                e.preventDefault();
                                setCategoryToDelete(category);
                                setShowDeleteCategoryDialog(true);
                              }}
                              className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                              title={`Delete ${getCategoryDisplayName(category)}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {/* Add new category option */}
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-t border-gray-200 dark:border-gray-700 text-sm text-[#C5A572]"
                        onClick={() => {
                          setShowNewCategoryDialog(true);
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Add New Category
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="location" className="block text-[#2B2B2B] dark:text-white mb-2">
                Location *
              </label>
              <Input
                id="location"
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                placeholder="e.g., The Grand Palace, Mumbai"
              />
            </div>

            {/* Featured Event Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked as boolean })}
                className="border-black/20 dark:border-white/10 data-[state=checked]:bg-[#C5A572] data-[state=checked]:border-[#C5A572]"
              />
              <label
                htmlFor="isFeatured"
                className="text-sm font-medium text-[#2B2B2B] dark:text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Feature this event on homepage
              </label>
            </div>

            <div>
              <label htmlFor="coverImage" className="block text-[#2B2B2B] dark:text-white mb-2">
                Cover Image *
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="coverImage"
                    className="flex items-center gap-3 px-6 py-3 rounded-lg backdrop-blur-lg bg-white/10 dark:bg-black/20 border-2 border-dashed border-black/20 dark:border-white/10 cursor-pointer hover:border-[#C5A572] transition-colors"
                  >
                    <UploadIcon className="w-5 h-5 text-[#C5A572]" />
                    <span className="text-[#2B2B2B] dark:text-white">
                      Choose Cover Image
                    </span>
                  </label>
                  {formData.coverImage && (
                    <span className="text-[#707070] dark:text-[#A0A0A0] text-sm">
                      {formData.coverImage.name}
                    </span>
                  )}
                </div>
                <input
                  id="coverImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {previewImage && (
                  <div className="relative h-48 rounded-lg overflow-hidden">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={isUploading}
                className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-8 gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Event
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                className="rounded-full border-[#707070] text-[#707070] hover:bg-[#707070] hover:text-white"
                onClick={() => {
                  if (previewImage) {
                    URL.revokeObjectURL(previewImage);
                  }
                  setFormData({
                    title: '',
                    coupleNames: '',
                    date: '',
                    location: '',
                    category: '',
                    coverImage: null,
                    isFeatured: false,
                  });
                  setPreviewImage(null);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </GlassCard>
      </motion.div>

      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent className="sm:max-w-[425px] backdrop-blur-lg bg-white/90 dark:bg-black/80 border border-black/20 dark:border-white/20">
          <DialogHeader>
            <DialogTitle className="text-[#2B2B2B] dark:text-white">Add New Category</DialogTitle>
            <DialogDescription className="text-[#707070] dark:text-white/80">
              Enter a name for the new category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name"
              className="rounded-lg bg-white/50 dark:bg-white/10 border-black/20 dark:border-white/20 text-[#2B2B2B] dark:text-white placeholder:text-[#707070] dark:placeholder:text-white/50 focus:border-[#C5A572]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#707070] dark:border-white/40 text-[#2B2B2B] dark:text-white hover:bg-[#707070] dark:hover:bg-white/10 hover:text-white"
              onClick={() => setShowNewCategoryDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-8 gap-2"
              onClick={handleAddNewCategory}
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog 
        open={showDeleteCategoryDialog} 
        onOpenChange={(open) => {
          setShowDeleteCategoryDialog(open);
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] backdrop-blur-lg bg-white/90 dark:bg-black/80 border border-black/20 dark:border-white/20">
          <DialogHeader>
            <DialogTitle className="text-[#2B2B2B] dark:text-white">Delete Category</DialogTitle>
            <DialogDescription className="text-[#707070] dark:text-white/80">
              Are you sure you want to delete the category "{categoryToDelete ? getCategoryDisplayName(categoryToDelete) : ''}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#707070] dark:border-white/40 text-[#2B2B2B] dark:text-white hover:bg-[#707070] dark:hover:bg-white/10 hover:text-white"
              onClick={(e) => {
                e.preventDefault();
                setCategoryToDelete(null);
                setShowDeleteCategoryDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 gap-2"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCategory();
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}