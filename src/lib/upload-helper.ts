/**
 * Client-side upload helper for uploading images to R2
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Delete a file from R2 storage
 * @param url - The URL of the file to delete
 * @returns Promise<boolean> - true if deleted successfully
 */
export async function deleteFromR2(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    const response = await fetch('/api/upload/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.error('Failed to delete from R2:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error);
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
    // For large files (>4MB), use presigned URL to avoid 413 errors
    const fourMB = 4 * 1024 * 1024;
    if (file.size > fourMB) {
      // Get presigned URL
      const endpoint = ['banners', 'logos', 'avatars', 'reviews', 'team'].includes(folder)
        ? '/api/upload/public'
        : '/api/upload';
      
      const presignRes = await fetch(
        `${endpoint}?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}&folder=${folder}`,
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

      // Upload directly to R2
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

      return { success: true, url: presign.url, thumbnailUrl: presign.url };
    }

    // For smaller files, use FormData with Sharp processing
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const endpoint = ['banners', 'logos', 'avatars', 'reviews', 'team'].includes(folder)
      ? '/api/upload/public'
      : '/api/upload';

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000),
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
