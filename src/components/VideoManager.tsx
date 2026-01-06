"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Youtube, Upload, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileUpload } from './FileUpload';
import { Video } from '../lib/mock-data';
import { toast } from 'sonner';
import { compressAndUploadImage } from '../lib/upload-helper';
import { uploadVideoToR2, deleteVideo } from '../lib/videos-store';

interface VideoManagerProps {
  videos: Video[];
  onChange: (videos: Video[]) => void;
  eventId?: string; // Supabase event ID for syncing
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function VideoManager({ videos, onChange, eventId }: VideoManagerProps) {
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoType, setVideoType] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadedThumbnail, setUploadedThumbnail] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleAddYouTubeVideo = () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      toast.error('Invalid YouTube URL. Please check and try again.');
      return;
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const thumbnail = getYouTubeThumbnail(videoId);

    const newVideo: Video = {
      id: `video-${Date.now()}`,
      url: embedUrl,
      thumbnail,
      title: videoTitle || 'Wedding Video',
      type: 'youtube',
      uploadedAt: new Date().toISOString(),
    };

    onChange([...videos, newVideo]);
    toast.success('YouTube video added successfully!');
    resetForm();
  };

  const handleVideoUpload = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      toast.error('Video size should be less than 500MB');
      return;
    }

    const videoUrl = URL.createObjectURL(file);
    setUploadedVideo(videoUrl);
    setVideoFile(file);
    
    // Generate thumbnail from first frame (locally, don't upload yet)
    const video = document.createElement('video');
    video.src = videoUrl;
    video.onloadeddata = () => {
      try {
        video.currentTime = 1; // Get frame at 1 second
      } catch (e) {
        // Ignore errors trying to seek
      }
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 1920, 1920);
        canvas.height = video.videoHeight ? (canvas.width / video.videoWidth) * video.videoHeight : 1080;
        const ctx = canvas.getContext('2d');
        if (ctx && video.videoWidth) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailData = canvas.toDataURL('image/jpeg', 0.8);
          setUploadedThumbnail(thumbnailData);
        }
      } catch (error) {
        console.error('Error generating thumbnail:', error);
      }
    };

    toast.success('Video selected! Use custom thumbnail or proceed.');
  };

  const handleThumbnailUpload = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail size should be less than 5MB');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Processing thumbnail...');

    try {
      // Generate local thumbnail from file
      const reader = new FileReader();
      reader.onloadend = () => {
        const thumbnail = reader.result as string;
        setUploadedThumbnail(thumbnail);
        toast.success('Thumbnail selected!', { id: loadingToast });
      };
      reader.readAsDataURL(file);
      setThumbnailFile(file);
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      toast.error('Failed to process thumbnail', { id: loadingToast });
    }
  };

  const handleAddUploadedVideo = async () => {
    if (!videoFile) {
      toast.error('Please upload a video file');
      return;
    }

    if (!uploadedThumbnail) {
      toast.error('Please wait for thumbnail to generate or upload a custom thumbnail');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading video to cloud storage...');

    try {
      // Upload video to R2
      const videoUploadResult = await uploadVideoToR2(videoFile);
      
      if (!videoUploadResult.success || !videoUploadResult.url) {
        toast.error(videoUploadResult.error || 'Failed to upload video', { id: loadingToast });
        setIsUploading(false);
        return;
      }

      const finalVideoUrl = videoUploadResult.url;
      let finalThumbnailUrl = uploadedThumbnail;

      // If thumbnail is a data URL, upload it to R2
      if (uploadedThumbnail.startsWith('data:')) {
        try {
          toast.loading('Uploading thumbnail...', { id: loadingToast });
          
          // Convert data URL to file and upload
          const dataUrlParts = uploadedThumbnail.split(',');
          if (dataUrlParts.length !== 2) {
            throw new Error('Invalid data URL format');
          }
          
          // Clean the base64 string
          const base64String = dataUrlParts[1].trim();
          const bstr = atob(base64String);
          const n = bstr.length;
          const u8arr = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }
          const thumbnailFileToUpload = new File([u8arr], `video-thumbnail-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const thumbnailUploadResult = await compressAndUploadImage(thumbnailFileToUpload, 'videos', 2);
          
          if (thumbnailUploadResult.success && thumbnailUploadResult.url) {
            finalThumbnailUrl = thumbnailUploadResult.url;
          } else {
            console.warn('Thumbnail upload failed, using local copy');
          }
        } catch (uploadError) {
          console.error('Error uploading thumbnail:', uploadError);
          // Continue with local thumbnail if upload fails
        }
      }

      const newVideo: Video = {
        id: `video-${Date.now()}`,
        url: finalVideoUrl,
        thumbnail: finalThumbnailUrl,
        title: videoTitle || 'Wedding Video',
        type: 'upload',
        uploadedAt: new Date().toISOString(),
      };

      onChange([...videos, newVideo]);
      toast.success('Video uploaded and added successfully!', { id: loadingToast });
      resetForm();
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to upload video', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    const videoToRemove = videos.find(v => v.id === videoId);
    
    // Delete from R2 and Supabase if it's an uploaded video (not YouTube)
    if (videoToRemove && videoToRemove.type === 'upload') {
      try {
        // Try to delete from R2 - pass both video URL and thumbnail URL
        await deleteVideo(videoId, videoToRemove.url, videoToRemove.thumbnail);
      } catch (err) {
        console.warn('Failed to delete video from R2/Supabase:', err);
      }
    }
    
    onChange(videos.filter(v => v.id !== videoId));
    toast.success('Video removed');
  };

  const resetForm = () => {
    setShowAddVideo(false);
    setVideoType('youtube');
    setYoutubeUrl('');
    setVideoTitle('');
    setUploadedVideo(null);
    setUploadedThumbnail(null);
    setVideoFile(null);
    setThumbnailFile(null);
    setIsUploading(false);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[#2B2B2B] dark:text-white">Event Videos</Label>
        <Button
          type="button"
          onClick={() => setShowAddVideo(!showAddVideo)}
          variant="outline"
          className="rounded-full"
          size="sm"
        >
          {showAddVideo ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {showAddVideo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard className="p-6 space-y-4">
              {/* Video Type Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setVideoType('youtube')}
                  variant={videoType === 'youtube' ? 'default' : 'outline'}
                  className={
                    videoType === 'youtube'
                      ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full flex-1'
                      : 'rounded-full flex-1'
                  }
                >
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube URL
                </Button>
                <Button
                  type="button"
                  onClick={() => setVideoType('upload')}
                  variant={videoType === 'upload' ? 'default' : 'outline'}
                  className={
                    videoType === 'upload'
                      ? 'bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full flex-1'
                      : 'rounded-full flex-1'
                  }
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video
                </Button>
              </div>

              {/* Video Title */}
              <div>
                <Label htmlFor="video-title" className="text-[#2B2B2B] dark:text-white mb-2 block">
                  Video Title (Optional)
                </Label>
                <Input
                  id="video-title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g., Wedding Highlights, Ceremony Video"
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>

              {/* YouTube URL Input */}
              {videoType === 'youtube' && (
                <div>
                  <Label htmlFor="youtube-url" className="text-[#2B2B2B] dark:text-white mb-2 block">
                    YouTube URL *
                  </Label>
                  <Input
                    id="youtube-url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="rounded-lg bg-white/50 dark:bg-black/20 border-white/20 dark:border-white/10 focus:border-[#C5A572]"
                  />
                  <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mt-2">
                    Paste any YouTube video URL. Thumbnail will be fetched automatically.
                  </p>
                </div>
              )}

              {/* Video Upload */}
              {videoType === 'upload' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="video-file" className="text-[#2B2B2B] dark:text-white mb-2 block">
                      Upload Video File *
                    </Label>
                    <FileUpload
                      id="video-file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      value={videoFile}
                      placeholder="No video file selected"
                    />
                    <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mt-2">
                      Supported formats: MP4, MOV, AVI. Max size: 500MB
                    </p>
                  </div>

                  {uploadedVideo && (
                    <>
                      {/* Video Preview */}
                      <div>
                        <Label className="text-[#2B2B2B] dark:text-white mb-2 block">
                          Video Preview
                        </Label>
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <video
                            src={uploadedVideo}
                            controls
                            className="w-full h-full object-contain"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </div>

                      {/* Thumbnail Section */}
                      <div>
                        <Label htmlFor="thumbnail-file" className="text-[#2B2B2B] dark:text-white mb-2 block">
                          Custom Thumbnail (Optional)
                        </Label>
                        
                        {uploadedThumbnail && (
                          <div className="mb-3 aspect-video rounded-lg overflow-hidden">
                            <img
                              src={uploadedThumbnail}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <FileUpload
                          id="thumbnail-file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          value={thumbnailFile}
                          placeholder="No thumbnail image selected"
                        />
                        <p className="text-sm text-[#707070] dark:text-[#A0A0A0] mt-2">
                          {uploadedThumbnail ? 'Thumbnail ready ✓' : 'Auto-generating thumbnail from video...'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Add Button */}
              <Button
                type="button"
                onClick={videoType === 'youtube' ? handleAddYouTubeVideo : handleAddUploadedVideo}
                className="w-full bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Video
                  </>
                )}
              </Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Videos List */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-4">
                <div className="space-y-3">
                  {/* Thumbnail */}
                  <div className="aspect-video rounded-lg overflow-hidden bg-black/20 relative group">
                    <img
                      src={video.thumbnail}
                      alt={video.title || 'Video thumbnail'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {video.type === 'youtube' && (
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30"
                        >
                          <ExternalLink className="w-5 h-5 text-white" />
                        </a>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                      {video.type === 'youtube' ? (
                        <Youtube className="w-4 h-4 text-red-500" />
                      ) : (
                        <Upload className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2B2B2B] dark:text-white truncate">
                        {video.title || 'Untitled Video'}
                      </p>
                      <p className="text-xs text-[#707070] dark:text-[#A0A0A0]">
                        {video.type === 'youtube' ? 'YouTube' : 'Uploaded'} • {new Date(video.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleRemoveVideo(video.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {videos.length === 0 && !showAddVideo && (
        <div className="text-center py-8 text-[#707070] dark:text-[#A0A0A0]">
          <Youtube className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No videos added yet</p>
          <p className="text-sm mt-1">Click "Add Video" to get started</p>
        </div>
      )}
    </div>
  );
}