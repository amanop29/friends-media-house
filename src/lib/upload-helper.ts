/**
 * Client-side upload helper for uploading images to R2
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  key?: string;
  error?: string;
}

export interface ThumbnailGenerationResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

const DIRECT_UPLOAD_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function buildJpegFileName(originalName: string): string {
  const base = originalName.replace(/\.[^/.]+$/, '');
  return `${base || 'image'}.jpg`;
}

async function convertImageToJpeg(file: File): Promise<File | null> {
  // Keep non-image files untouched; the server will reject them with a clear error.
  if (!file.type || !file.type.startsWith('image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const image = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;

        if (!width || !height) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              resolve(null);
              return;
            }

            resolve(
              new File([blob], buildJpegFileName(file.name), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
            );
          },
          'image/jpeg',
          0.9
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

async function normalizeFileForDirectImageUpload(file: File): Promise<File | null> {
  if (DIRECT_UPLOAD_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  return convertImageToJpeg(file);
}

function getUploadEndpoint(
  folder: 'banners' | 'logos' | 'avatars' | 'events' | 'gallery' | 'reviews' | 'videos' | 'team'
): string {
  return ['banners', 'logos', 'avatars', 'reviews', 'team'].includes(folder)
    ? '/api/upload/public'
    : '/api/upload';
}

  /**
   * Resize an image to at most `maxWidth` px using the browser Canvas API.
   * Returns a WebP Blob (or JPEG as fallback for browsers that do not support canvas WebP).
   * Runs entirely on the client — no server round-trip, typically < 200 ms per image.
   */
  async function generateClientThumbnail(file: File, maxWidth = 640): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, w, h);
        // Prefer WebP; fall back to JPEG for older Safari
        const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
          ? 'image/webp'
          : 'image/jpeg';
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob produced null'))),
          mimeType,
          0.78
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for thumbnail generation'));
      };
      img.src = objectUrl;
    });
  }

  async function uploadWithPresignedUrl(
  file: File,
  folder: 'banners' | 'logos' | 'avatars' | 'events' | 'gallery' | 'reviews' | 'videos' | 'team'
): Promise<UploadResult> {
  const endpoint = getUploadEndpoint(folder);

    // For event/gallery uploads request a paired thumbnail presigned URL so both
    // the original and the client-generated thumbnail can be slotted in one round-trip.
    const wantsThumb = folder === 'events' || folder === 'gallery';
    const presignRes = await fetch(
      `${endpoint}?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}&folder=${folder}${wantsThumb ? '&withThumb=true' : ''}`,
      { method: 'GET' }
    );

  if (!presignRes.ok) {
    const errorText = await presignRes.text();
    console.error('Presign request failed:', errorText);
    return { success: false, error: `Failed to get upload URL: ${presignRes.status}` };
  }

  const presign = await presignRes.json();
  if (!presign?.uploadUrl) {
    console.error('Invalid presign response:', presign);
    return { success: false, error: presign?.error || 'Failed to get upload URL' };
  }

    if (wantsThumb && presign.thumbUploadUrl) {
      // Generate thumbnail client-side while uploading the original — both happen in parallel.
      const [putRes, thumbnailBlob] = await Promise.all([
        fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file }),
        generateClientThumbnail(file).catch(() => null),
      ]);

      if (!putRes.ok) {
        const errorText = await putRes.text();
        console.error('R2 original upload failed:', errorText);
        return { success: false, error: `Upload failed (${putRes.status})` };
      }

      // Upload the client-generated thumbnail (small WebP, done in < 1 s)
      let thumbnailUrl = presign.url; // fallback: use original if thumbnail upload fails
      if (thumbnailBlob) {
        const thumbPut = await fetch(presign.thumbUploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': thumbnailBlob.type },
          body: thumbnailBlob,
        });
        if (thumbPut.ok) thumbnailUrl = presign.thumbUrl;
      }

      return {
        success: true,
        url: presign.url,
        thumbnailUrl,
        key: presign.key,
      };
    }

    // Default path (non-event folders — no thumbnail needed)
    const putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      console.error('R2 upload failed:', errorText);
      return { success: false, error: `Upload failed (${putRes.status})` };
    }

    return {
      success: true,
      url: presign.url,
      thumbnailUrl: presign.url,
      key: presign.key,
    };
}

export async function uploadEventPhotoOriginalToR2(file: File): Promise<UploadResult> {
  try {
    const normalizedFile = await normalizeFileForDirectImageUpload(file);

    if (!normalizedFile) {
      return {
        success: false,
        error: 'Unsupported image format. Please use JPG, PNG, or WebP.',
      };
    }

    // Try presigned URL first: client uploads directly to R2 (fastest path, no server bottleneck).
    // Thumbnail is generated client-side via Canvas in parallel with the upload.
    const presignResult = await uploadWithPresignedUrl(normalizedFile, 'events');
    if (presignResult.success) return presignResult;

    // If presigned PUT was blocked (CORS not yet configured on the R2 bucket) fall back to the
    // server-POST path which proxies through Next.js and avoids CORS entirely.
    console.warn('[upload] Presigned PUT failed, retrying via server POST:', presignResult.error);
    return await uploadToR2(normalizedFile, 'events');
  } catch (error) {
    console.error('Event photo upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

export async function generatePhotoThumbnail(
  key: string,
  photoId?: string
): Promise<ThumbnailGenerationResult> {
  if (!key) {
    return {
      success: false,
      error: 'Missing storage key for thumbnail generation',
    };
  }

  try {
    const response = await fetch('/api/upload/thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, photoId }),
      signal: AbortSignal.timeout(180000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Thumbnail generation request failed:', response.status, errorText);
      return {
        success: false,
        error: `Thumbnail generation failed (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      thumbnailUrl: data.thumbnailUrl,
    };
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate thumbnail',
    };
  }
}

/**
 * Delete a file from R2 storage
 * @param url - The URL of the file to delete
 * @returns Promise<boolean> - true if deleted successfully
 */
export async function deleteFromR2(url: string): Promise<boolean> {
  if (!url) {
    console.warn('⚠️  deleteFromR2: No URL provided');
    return false;
  }
  
  try {
    console.log('🗑️  Deleting from R2:', url);
    
    const response = await fetch('/api/upload/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to delete from R2:', response.status, data);
      return false;
    }

    console.log('✅ Successfully deleted from R2:', url);
    return true;
  } catch (error) {
    console.error('❌ Error deleting from R2:', error);
    return false;
  }
}

/**
 * Upload a file to R2 storage
 * @param file - The file to upload
 * @param folder - The folder to upload to (banners, logos, avatars, events, gallery, reviews, videos)
 * @returns Promise with upload result
 */
export async function uploadToR2(
  file: File,
  folder: 'banners' | 'logos' | 'avatars' | 'events' | 'gallery' | 'reviews' | 'videos' | 'team' = 'gallery'
): Promise<UploadResult> {
  try {
    // Use presigned uploads only for larger files to avoid request timeouts and 413 errors.
    // For event/gallery images, force server POST so thumbnails are generated at upload time.
    const fourMB = 4 * 1024 * 1024;
    const supportsThumbnailPipeline = folder === 'events' || folder === 'gallery';
    const shouldUsePresignedUpload = file.size > fourMB && !supportsThumbnailPipeline;

    if (shouldUsePresignedUpload) {
      return uploadWithPresignedUrl(file, folder);
    }

    // For smaller files, use FormData with Sharp processing
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const endpoint = getUploadEndpoint(folder);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(300000), // 5 min — enough for any image + Sharp WebP encode
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload request failed:', response.status, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      return {
        success: false,
        error: errorData.error || `Upload failed (${response.status})`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl,
      key: data.key,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

/**
 * Compress and upload image
 * @param file - The file to compress and upload
 * @param folder - The folder to upload to
 * @param maxSizeMB - Maximum size in MB before compression (default: 2MB)
 * @returns Promise with upload result
 */
export async function compressAndUploadImage(
  file: File,
  folder: 'banners' | 'logos' | 'avatars' | 'events' | 'gallery' | 'reviews' | 'videos' | 'team',
  maxSizeMB: number = 2
): Promise<UploadResult> {
  // For very small files (< 500KB), upload directly without compression
  const halfMB = 0.5 * 1024 * 1024;
  if (file.size <= halfMB) {
    console.log('File is small, uploading directly without compression');
    return uploadToR2(file, folder);
  }

  // If file is reasonably sized, upload directly
  if (file.size <= maxSizeMB * 1024 * 1024) {
    console.log('File size acceptable, uploading without compression');
    return uploadToR2(file, folder);
  }

  console.log('File is large, compressing before upload...');
  
  // Compress the image
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read image file',
      });
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to load image',
        });
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { 
            alpha: false, // Faster rendering without alpha channel
            willReadFrequently: false 
          });
          
          if (!ctx) {
            resolve({
              success: false,
              error: 'Failed to get canvas context',
            });
            return;
          }
          
          // Calculate new dimensions - less aggressive for faster processing
          const maxDimension = folder === 'banners' ? 1920 : 1200; // Increased from 800
          let width = img.width;
          let height = img.height;
          
          // Only resize if significantly larger
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              if (width > maxDimension) {
                height *= maxDimension / width;
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width *= maxDimension / height;
                height = maxDimension;
              }
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Use better image smoothing for faster but decent quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium'; // Changed from default 'high'
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with better compression ratio for speed
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                resolve({
                  success: false,
                  error: 'Failed to compress image',
                });
                return;
              }
              
              try {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                
                console.log(`Compressed ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                
                const result = await uploadToR2(compressedFile, folder);
                resolve(result);
              } catch (uploadError) {
                console.error('Upload error during compression:', uploadError);
                resolve({
                  success: false,
                  error: uploadError instanceof Error ? uploadError.message : 'Upload failed',
                });
              }
            },
            'image/jpeg',
            0.85 // Slightly better quality (0.8 -> 0.85) for faster processing
          );
        } catch (canvasError) {
          console.error('Canvas processing error:', canvasError);
          resolve({
            success: false,
            error: 'Failed to process image',
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Direct upload to R2 (alias for uploadToR2 for backward compatibility)
 */
export const uploadToR2Direct = uploadToR2;
