"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Save, Upload as UploadIcon, X, Image as ImageIcon, Lock, Eye, EyeOff, Loader2, GripVertical } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { getSettings, saveSettings, fetchSettings, getHomeBannerUrls, DEFAULT_SETTINGS, type SiteSettings } from '../../lib/settings';
import { compressAndUploadImage, uploadToR2Direct, deleteFromR2 } from '../../lib/upload-helper';

export function Settings() {
  const [formData, setFormData] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [draggedBannerIndex, setDraggedBannerIndex] = useState<number | null>(null);
  const [logoImage, setLogoImage] = useState<string>('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [secondLogoImage, setSecondLogoImage] = useState<string>('');
  const [secondLogoPreview, setSecondLogoPreview] = useState<string>('');
  
  // Refs for file inputs to reset them after upload
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const secondLogoInputRef = React.useRef<HTMLInputElement>(null);
  
  // Admin credentials state
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  useEffect(() => {
    // Load settings from localStorage first for immediate render
    const savedSettings = getSettings();
    setFormData(savedSettings);
    
    // Set banner and logo from local settings first
    setBannerImages(getHomeBannerUrls(savedSettings));
    if (savedSettings.logoUrl) {
      setLogoImage(savedSettings.logoUrl);
      setLogoPreview(savedSettings.logoUrl);
    }
    if (savedSettings.secondLogoUrl) {
      setSecondLogoImage(savedSettings.secondLogoUrl);
      setSecondLogoPreview(savedSettings.secondLogoUrl);
    }
    
    // Then fetch from Supabase to get latest
    fetchSettings().then(settings => {
      setFormData(settings);
      // Update banner and logo from Supabase settings
      setBannerImages(getHomeBannerUrls(settings));
      if (settings.logoUrl) {
        setLogoImage(settings.logoUrl);
        setLogoPreview(settings.logoUrl);
      }
      if (settings.secondLogoUrl) {
        setSecondLogoImage(settings.secondLogoUrl);
        setSecondLogoPreview(settings.secondLogoUrl);
      }
    });
    
    // Load admin email
    const savedAdminEmail = localStorage.getItem('adminEmail') || 'admin@friendsmediahouse.com';
    setAdminEmail(savedAdminEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Save settings to localStorage and Supabase
      await saveSettings(formData);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate new password
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const loadingToast = toast.loading('Updating credentials...');
    
    try {
      // Get current admin session
      const sessionData = localStorage.getItem('admin_session');
      if (!sessionData) {
        toast.error('Session not found. Please login again.', { id: loadingToast });
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Try to update in Supabase first (if database is configured)
      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: session.id,
            currentPassword,
            newPassword
          })
        });

        const data = await response.json();

        if (data.success) {
          // Database update successful
          if (adminEmail.trim()) {
            localStorage.setItem('adminEmail', adminEmail.trim().toLowerCase());
          }
          localStorage.setItem('adminPassword', newPassword);
          
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          
          toast.success('Admin credentials updated successfully!', { id: loadingToast });
          return;
        }

        // If API returns error (except 503 - database not configured), show it
        if (response.status !== 503) {
          toast.error(data.error || 'Failed to update credentials', { id: loadingToast });
          return;
        }

        // Fall through to localStorage auth if database is not configured
      } catch (apiError) {
        console.warn('API update failed, using localStorage fallback:', apiError);
      }

      // Fallback: localStorage-only authentication (for development)
      const savedPassword = localStorage.getItem('adminPassword') || 'FMH@2024Admin';
      
      // Validate current password
      if (currentPassword !== savedPassword) {
        toast.error('Current password is incorrect', { id: loadingToast });
        return;
      }
      
      // Save new credentials to localStorage
      if (adminEmail.trim()) {
        localStorage.setItem('adminEmail', adminEmail.trim().toLowerCase());
      }
      localStorage.setItem('adminPassword', newPassword);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast.success('Admin credentials updated successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Credential update error:', error);
      toast.error('An error occurred while updating credentials', { id: loadingToast });
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload image files only');
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Each banner must be 10MB or smaller.');
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        return;
      }
    }

    const loadingToast = toast.loading(`Uploading ${files.length} banner${files.length > 1 ? 's' : ''}...`);

    try {
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          const result = await compressAndUploadImage(file, 'banners', 5);

          if (!result.success || !result.url) {
            throw new Error(result.error || `Failed to upload ${file.name}`);
          }

          return result.url;
        })
      );

      const updatedBannerUrls = [...bannerImages, ...uploadResults];
      await persistBannerImages(updatedBannerUrls);

      toast.success('Banner images uploaded successfully!', { id: loadingToast });
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    } catch (error) {
      console.error('Banner upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload banner images', { id: loadingToast });
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleRemoveBanner = async (bannerUrl: string) => {
    if (!bannerUrl) {
      toast.error('No banner to remove');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to remove the banner image?');
    if (!confirmDelete) return;

    const loadingToast = toast.loading('Removing banner...');

    try {
      // Delete from R2 if exists
      if (bannerUrl.startsWith('http')) {
        console.log('🗑️  Deleting banner from R2:', bannerUrl);
        const deleted = await deleteFromR2(bannerUrl);
        if (!deleted) {
          console.warn('⚠️  Failed to delete banner from R2');
          toast.warning('Banner removed from site, but failed to delete from storage', { id: loadingToast });
        }
      }

      const updatedBannerUrls = bannerImages.filter((imageUrl) => imageUrl !== bannerUrl);
      await persistBannerImages(updatedBannerUrls);
      
      toast.success('Banner image removed successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Error removing banner:', error);
      toast.error('Failed to remove banner', { id: loadingToast });
    }
  };

  const persistBannerImages = async (updatedBannerUrls: string[]) => {
    setBannerImages(updatedBannerUrls);

    const updatedSettings = {
      ...formData,
      homeBannerUrls: updatedBannerUrls,
      homeBannerUrl: updatedBannerUrls[0],
    };

    setFormData(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleBannerDragStart = (index: number) => {
    setDraggedBannerIndex(index);
  };

  const handleBannerDrop = async (targetIndex: number) => {
    if (draggedBannerIndex === null || draggedBannerIndex === targetIndex) {
      setDraggedBannerIndex(null);
      return;
    }

    const reorderedBannerUrls = [...bannerImages];
    const [movedBanner] = reorderedBannerUrls.splice(draggedBannerIndex, 1);
    reorderedBannerUrls.splice(targetIndex, 0, movedBanner);

    try {
      await persistBannerImages(reorderedBannerUrls);
      toast.success('Banner order updated');
    } catch (error) {
      console.error('Error reordering banners:', error);
      toast.error('Failed to update banner order');
    } finally {
      setDraggedBannerIndex(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (allow SVG for logos)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPG, PNG, WebP, GIF, or SVG)');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Uploading logo...');

    try {
      // Store previous logo URL for deletion
      const previousLogoUrl = logoImage;

      // For SVG files, upload directly without compression
      let result;
      if (file.type === 'image/svg+xml') {
        result = await uploadToR2Direct(file, 'logos');
      } else {
        result = await compressAndUploadImage(file, 'logos', 2);
      }
      
      if (!result.success || !result.url) {
        toast.error(result.error || 'Failed to upload logo', { id: loadingToast });
        return;
      }

      // Delete previous logo from R2 if exists
      if (previousLogoUrl && previousLogoUrl.startsWith('http')) {
        console.log('🗑️  Deleting previous logo:', previousLogoUrl);
        const deleted = await deleteFromR2(previousLogoUrl);
        if (deleted) {
          console.log('✅ Previous logo deleted successfully');
        } else {
          console.warn('⚠️  Failed to delete previous logo, but continuing with upload');
        }
      }

      // Save URL to state and Supabase settings
      const logoUrl = result.url;
      setLogoPreview(logoUrl);
      setLogoImage(logoUrl);
      
      // Update formData and save to Supabase
      const updatedSettings = { ...formData, logoUrl: logoUrl };
      setFormData(updatedSettings);
      await saveSettings(updatedSettings);
      
      toast.success('Logo uploaded successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo', { id: loadingToast });
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoImage) {
      toast.error('No logo to remove');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to remove the logo?');
    if (!confirmDelete) return;

    const loadingToast = toast.loading('Removing logo...');

    try {
      // Delete from R2 if exists
      if (logoImage.startsWith('http')) {
        console.log('🗑️  Deleting logo from R2:', logoImage);
        const deleted = await deleteFromR2(logoImage);
        if (!deleted) {
          console.warn('⚠️  Failed to delete logo from R2');
          toast.warning('Logo removed from site, but failed to delete from storage', { id: loadingToast });
        }
      }

      setLogoImage('');
      setLogoPreview('');
      
      // Update formData and save to Supabase
      const updatedSettings = { ...formData, logoUrl: undefined };
      setFormData(updatedSettings);
      await saveSettings(updatedSettings);
      
      toast.success('Logo removed successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo', { id: loadingToast });
    }
  };

  const handleSecondLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPG, PNG, WebP, GIF, or SVG)');
      if (secondLogoInputRef.current) secondLogoInputRef.current.value = '';
      return;
    }

    const loadingToast = toast.loading('Uploading second logo...');

    try {
      const previousSecondLogoUrl = secondLogoImage;

      let result;
      if (file.type === 'image/svg+xml') {
        result = await uploadToR2Direct(file, 'logos');
      } else {
        result = await compressAndUploadImage(file, 'logos', 2);
      }

      if (!result.success || !result.url) {
        toast.error(result.error || 'Failed to upload second logo', { id: loadingToast });
        if (secondLogoInputRef.current) secondLogoInputRef.current.value = '';
        return;
      }

      if (previousSecondLogoUrl && previousSecondLogoUrl.startsWith('http')) {
        const deleted = await deleteFromR2(previousSecondLogoUrl);
        if (!deleted) {
          console.warn('Failed to delete previous second logo, but continuing with upload');
        }
      }

      const secondLogoUrl = result.url;
      setSecondLogoPreview(secondLogoUrl);
      setSecondLogoImage(secondLogoUrl);

      const updatedSettings = { ...formData, secondLogoUrl };
      setFormData(updatedSettings);
      await saveSettings(updatedSettings);

      toast.success('Second logo uploaded successfully!', { id: loadingToast });
      if (secondLogoInputRef.current) secondLogoInputRef.current.value = '';
    } catch (error) {
      console.error('Second logo upload error:', error);
      toast.error('Failed to upload second logo', { id: loadingToast });
      if (secondLogoInputRef.current) secondLogoInputRef.current.value = '';
    }
  };

  const handleRemoveSecondLogo = async () => {
    if (!secondLogoImage) {
      toast.error('No second logo to remove');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to remove the second logo?');
    if (!confirmDelete) return;

    const loadingToast = toast.loading('Removing second logo...');

    try {
      if (secondLogoImage.startsWith('http')) {
        const deleted = await deleteFromR2(secondLogoImage);
        if (!deleted) {
          toast.warning('Second logo removed from site, but failed to delete from storage', { id: loadingToast });
        }
      }

      setSecondLogoImage('');
      setSecondLogoPreview('');

      const updatedSettings = { ...formData, secondLogoUrl: undefined };
      setFormData(updatedSettings);
      await saveSettings(updatedSettings);

      toast.success('Second logo removed successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Error removing second logo:', error);
      toast.error('Failed to remove second logo', { id: loadingToast });
    }
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-[#2B2B2B] dark:text-white mb-6 md:mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
          Settings
        </h1>

        <div className="max-w-3xl space-y-6 md:space-y-8">
          {/* Site Information */}
          <GlassCard className="p-4 md:p-8">
            <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6">
              Site Information
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="siteName" className="block text-[#2B2B2B] dark:text-white mb-2">
                  Site Name
                </label>
                <Input
                  id="siteName"
                  type="text"
                  value={formData.siteName}
                  onChange={(e) =>
                    setFormData({ ...formData, siteName: e.target.value })
                  }
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>

              <div>
                <label htmlFor="tagline" className="block text-[#2B2B2B] dark:text-white mb-2">
                  Tagline
                </label>
                <Input
                  id="tagline"
                  type="text"
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-[#2B2B2B] dark:text-white mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-[#2B2B2B] dark:text-white mb-2">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-[#2B2B2B] dark:text-white mb-2">
                  Address
                </label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="instagram" className="block text-[#2B2B2B] dark:text-white mb-2">
                    Instagram Handle
                  </label>
                  <Input
                    id="instagram"
                    type="text"
                    value={formData.instagram}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram: e.target.value })
                    }
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                </div>

                <div>
                  <label htmlFor="youtube" className="block text-[#2B2B2B] dark:text-white mb-2">
                    YouTube Channel
                  </label>
                  <Input
                    id="youtube"
                    type="text"
                    value={formData.youtube}
                    onChange={(e) =>
                      setFormData({ ...formData, youtube: e.target.value })
                    }
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-8 gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </GlassCard>

          {/* Hero Banner Upload */}
          <GlassCard className="p-4 md:p-8">
            <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6">
              Home Page Banner
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[#2B2B2B] dark:text-white mb-2">
                  Hero Banner Images
                </label>
                <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-4">
                  Upload multiple high-resolution images for the home page carousel (recommended: 1920x1080px each, max 10MB per image).
                </p>
                <p className="text-xs text-[#707070] dark:text-[#A0A0A0] mb-4">
                  You can select multiple files at once. Drag banner cards below to reorder them. The first banner is used first in the home carousel and for social preview.
                </p>

                {/* Preview */}
                {bannerImages.length > 0 && (
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    {bannerImages.map((bannerUrl, index) => (
                      <div
                        key={bannerUrl}
                        draggable
                        onDragStart={() => handleBannerDragStart(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => void handleBannerDrop(index)}
                        onDragEnd={() => setDraggedBannerIndex(null)}
                        className={`relative rounded-lg overflow-hidden border-2 transition ${draggedBannerIndex === index ? 'border-[#C5A572] opacity-70' : 'border-[#C5A572]/30'}`}
                      >
                        <img
                          src={bannerUrl}
                          alt={`Banner Preview ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute left-2 bottom-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs text-white cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-3 h-3" />
                          Drag to reorder
                        </div>
                        <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
                          {index === 0 ? 'Banner 1 • Primary' : `Banner ${index + 1}`}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBanner(bannerUrl)}
                          className="absolute top-2 right-2 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                          title="Remove banner"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="bannerUpload"
                    className="flex items-center gap-3 px-6 py-3 rounded-lg backdrop-blur-lg bg-white/10 dark:bg-black/20 border-2 border-dashed border-black/20 dark:border-white/10 cursor-pointer hover:border-[#C5A572] transition-colors"
                  >
                    <UploadIcon className="w-5 h-5 text-[#C5A572]" />
                    <span className="text-[#2B2B2B] dark:text-white">
                      {bannerImages.length > 0 ? 'Add More / Upload Multiple Banners' : 'Upload Multiple Banners'}
                    </span>
                  </label>
                  <input
                    id="bannerUpload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={bannerInputRef}
                    onChange={handleBannerUpload}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Brand Assets */}
          <GlassCard className="p-4 md:p-8">
            <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6">
              Brand Assets
            </h2>

            <div>
              <label className="block text-[#2B2B2B] dark:text-white mb-2">
                Primary Logo
              </label>
              <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-4">
                Used across the site footer and as the first logo in the navbar switcher.
              </p>
              <div className="space-y-4">
                {logoPreview && (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="h-20 w-auto object-contain rounded-lg border-2 border-[#C5A572]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="logoUpload"
                    className="flex items-center gap-3 px-6 py-3 rounded-lg backdrop-blur-lg bg-white/10 dark:bg-black/20 border-2 border-dashed border-black/20 dark:border-white/10 cursor-pointer hover:border-[#C5A572] transition-colors"
                  >
                    <UploadIcon className="w-5 h-5 text-[#C5A572]" />
                    <span className="text-[#2B2B2B] dark:text-white">
                      Choose Logo File
                    </span>
                  </label>
                  <input 
                    id="logoUpload" 
                    type="file" 
                    accept="image/*,.svg,image/svg+xml"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    className="hidden" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-[#2B2B2B] dark:text-white mb-2">
                Secondary Logo
              </label>
              <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-4">
                Shown alongside the primary logo in the footer and auto-switches in the navbar every 3 seconds.
              </p>
              <div className="space-y-4">
                {secondLogoPreview && (
                  <div className="relative inline-block">
                    <img
                      src={secondLogoPreview}
                      alt="Second Logo Preview"
                      className="h-20 w-auto object-contain rounded-lg border-2 border-[#C5A572]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveSecondLogo}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="secondLogoUpload"
                    className="flex items-center gap-3 px-6 py-3 rounded-lg backdrop-blur-lg bg-white/10 dark:bg-black/20 border-2 border-dashed border-black/20 dark:border-white/10 cursor-pointer hover:border-[#C5A572] transition-colors"
                  >
                    <UploadIcon className="w-5 h-5 text-[#C5A572]" />
                    <span className="text-[#2B2B2B] dark:text-white">
                      Choose Second Logo File
                    </span>
                  </label>
                  <input
                    id="secondLogoUpload"
                    type="file"
                    accept="image/*,.svg,image/svg+xml"
                    ref={secondLogoInputRef}
                    onChange={handleSecondLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </GlassCard>
          
          {/* Admin Credentials */}
          <GlassCard className="p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl text-[#2B2B2B] dark:text-white">
                Admin Credentials
              </h2>
            </div>
            
            <form onSubmit={handleUpdateCredentials} className="space-y-6">
              <div>
                <label className="block text-[#2B2B2B] dark:text-white mb-2">
                  Admin Email
                </label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>
              
              <div className="h-px bg-white/10 my-4" />
              
              <p className="text-sm text-gray-400 mb-4">
                To change your password, enter your current password and your new password below.
              </p>
              
              <div>
                <label className="block text-[#2B2B2B] dark:text-white mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-12 rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[#2B2B2B] dark:text-white mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-12 rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[#2B2B2B] dark:text-white mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-lg px-8 py-3 h-auto disabled:opacity-50"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Update Credentials
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      </motion.div>
    </div>
  );
}