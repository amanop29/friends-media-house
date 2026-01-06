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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    // Use public endpoint for certain folders, admin endpoint for others
    const endpoint = ['banners', 'logos', 'avatars', 'reviews', 'team'].includes(folder)
      ? '/api/upload/public'
      : '/api/upload';

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }

    return {
      success: true,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file',
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
  // If file is already small enough, upload directly
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return uploadToR2(file, folder);
  }

  // Compress the image
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 1920px width/height for banners, 800px for others)
        const maxDimension = folder === 'banners' ? 1920 : 800;
        let width = img.width;
        let height = img.height;
        
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
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob and upload
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              resolve({
                success: false,
                error: 'Failed to compress image',
              });
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            const result = await uploadToR2(compressedFile, folder);
            resolve(result);
          },
          'image/jpeg',
          0.8
        );
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
