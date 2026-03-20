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

    // Vercel serverless functions cap request bodies at ~4.5 MB (FUNCTION_PAYLOAD_TOO_LARGE).
    // To keep processing strictly lossless, do not apply lossy client-side fallback compression.
    const VERCEL_SAFE_SIZE = 3 * 1024 * 1024; // 3 MB — comfortable margin below the 4.5 MB cap
    if (normalizedFile.size > VERCEL_SAFE_SIZE) {
      return {
        success: false,
        error:
          'Direct upload is unavailable and this file is too large for server fallback while preserving lossless quality. Please retry after enabling R2 CORS or use a smaller image.',
      };
    }
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
    // Keep image uploads on server POST so large files go through lossless optimization.
    // Event/gallery still get thumbnails generated server-side.
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
  const thresholdBytes = maxSizeMB * 1024 * 1024;
  if (file.size > thresholdBytes) {
    console.log(
      `[upload] Large image detected (${(file.size / 1024 / 1024).toFixed(2)}MB). Using server-side lossless optimization.`
    );
  }

  return uploadToR2(file, folder);
}

/**
 * Direct upload to R2 (alias for uploadToR2 for backward compatibility)
 */
export const uploadToR2Direct = uploadToR2;
