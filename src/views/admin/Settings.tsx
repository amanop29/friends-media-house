"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Save, Upload as UploadIcon, X, Image as ImageIcon, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { getSettings, saveSettings, fetchSettings, DEFAULT_SETTINGS, type SiteSettings } from '../../lib/settings';
import { compressAndUploadImage, uploadToR2Direct, deleteFromR2 } from '../../lib/upload-helper';

export function Settings() {
  const [formData, setFormData] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  const [bannerImage, setBannerImage] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [logoImage, setLogoImage] = useState<string>('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  // Refs for file inputs to reset them after upload
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  
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
    if (savedSettings.homeBannerUrl) {
      setBannerImage(savedSettings.homeBannerUrl);
      setBannerPreview(savedSettings.homeBannerUrl);
    }
    if (savedSettings.logoUrl) {
      setLogoImage(savedSettings.logoUrl);
      setLogoPreview(savedSettings.logoUrl);
    }
    
    // Then fetch from Supabase to get latest
    fetchSettings().then(settings => {
      setFormData(settings);
      // Update banner and logo from Supabase settings
      if (settings.homeBannerUrl) {
        setBannerImage(settings.homeBannerUrl);
        setBannerPreview(settings.homeBannerUrl);
      }
      if (settings.logoUrl) {
        setLogoImage(settings.logoUrl);
        setLogoPreview(settings.logoUrl);
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
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Banner upload started:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Uploading banner image...');

    try {
      // Store previous banner URL for deletion
      const previousBannerUrl = bannerImage;

      console.log('Starting compression and upload...');
      // Upload to R2
      const result = await compressAndUploadImage(file, 'banners', 5);
      
      console.log('Upload result:', result);
      
      if (!result.success || !result.url) {
        console.error('Upload failed:', result.error);
        toast.error(result.error || 'Failed to upload banner', { id: loadingToast });
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        return;
      }

      // Delete previous banner from R2 if exists
      if (previousBannerUrl && previousBannerUrl.startsWith('http')) {
        console.log('🗑️  Deleting previous banner:', previousBannerUrl);
        const deleted = await deleteFromR2(previousBannerUrl);
        if (deleted) {
          console.log('✅ Previous banner deleted successfully');
        } else {
          console.warn('⚠️  Failed to delete previous banner, but continuing with upload');
        }
      }

      // Save URL to state and Supabase settings
      const bannerUrl = result.url;
      setBannerPreview(bannerUrl);
      setBannerImage(bannerUrl);
      
      // Update formData and save to Supabase
      const updatedSettings = { ...formData, homeBannerUrl: bannerUrl };
      setFormData(updatedSettings);
      await saveSettings(updatedSettings);
      
      console.log('Banner uploaded successfully:', bannerUrl);
      toast.success('Banner image uploaded successfully!', { id: loadingToast });
      
      // Reset file input
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    } catch (error) {
      console.error('Banner upload error:', error);
      toast.error('Failed to upload banner image', { id: loadingToast });
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleRemoveBanner = async () => {
    if (!bannerImage) {
      toast.error('No banner to remove');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to remove the banner image?');
    if (!confirmDelete) return;

    const loadingToast = toast.loading('Removing banner...');

    try {
      // Delete from R2 if exists
      if (bannerImage.startsWith('http')) {
        console.log('🗑️  Deleting banner from R2:', bannerImage);
        const deleted = await deleteFromR2(bannerImage);
        if (!deleted) {
          console.warn('⚠️  Failed to delete banner from R2');
          toast.warning('Banner removed from site, but failed to delete from storage', { id: loadingToast });
        }
      }

      setBannerImage('');
      setBannerPreview('');
      
      // Update formData and save to Supabase
      const updatedSettings = { ...formData, homeBannerUrl: undefined };
      setFormData(updatedSettings);
      await saveSettings(updatedSettings);
      
      toast.success('Banner image removed successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Error removing banner:', error);
      toast.error('Failed to remove banner', { id: loadingToast });
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
                  Hero Banner Image
                </label>
                <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-4">
                  Upload a high-resolution image (recommended: 1920x1080px, max 5MB)
                </p>

                {/* Preview */}
                {bannerPreview && (
                  <div className="relative mb-4 rounded-lg overflow-hidden border-2 border-[#C5A572]/30">
                    <img
                      src={bannerPreview}
                      alt="Banner Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={handleRemoveBanner}
                      className="absolute top-2 right-2 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                      title="Remove banner"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
                      {bannerPreview ? 'Change Banner' : 'Upload Banner'}
                    </span>
                  </label>
                  <input
                    id="bannerUpload"
                    type="file"
                    accept="image/*"
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
                Upload Logo
              </label>
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