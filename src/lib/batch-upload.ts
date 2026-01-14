/**
 * High-performance batch upload utility for direct R2 uploads
 * Uses presigned URLs and controlled concurrency for optimal performance
 */

export interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
  key?: string;
}

export interface BatchUploadOptions {
  folder: 'events' | 'banners' | 'logos';
  concurrency?: number;
  onProgress?: (current: number, total: number, fileProgress: Map<string, number>) => void;
  onFileComplete?: (fileId: string, success: boolean, url?: string) => void;
}

export interface PresignedUrlResponse {
  presignedUrls: Array<{
    fileName: string;
    key: string;
    presignedUrl: string;
    publicUrl: string;
    contentType: string;
    fileSize: number;
    error?: string;
  }>;
  bucket: string;
  publicUrl: string;
  timestamp: string;
}

class UploadQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private concurrency: number;
  private onProgress?: (current: number, total: number, fileProgress: Map<string, number>) => void;
  private fileProgress: Map<string, number> = new Map();
  private completedCount = 0;
  private totalCount = 0;

  constructor(concurrency = 6, onProgress?: (current: number, total: number, fileProgress: Map<string, number>) => void) {
    this.concurrency = concurrency;
    this.onProgress = onProgress;
  }

  add(task: () => Promise<void>, fileId?: string) {
    this.queue.push(task);
    if (fileId) {
      this.totalCount++;
    }
  }

  private updateProgress() {
    if (this.onProgress) {
      this.onProgress(this.completedCount, this.totalCount, new Map(this.fileProgress));
    }
  }

  async run() {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < this.concurrency; i++) {
      promises.push(this.processQueue());
    }

    await Promise.allSettled(promises);
  }

  private async processQueue() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeCount++;
      try {
        await task();
        this.completedCount++;
        this.updateProgress();
      } catch (error) {
        console.error('Queue task error:', error);
      } finally {
        this.activeCount--;
      }
    }
  }

  setFileProgress(fileId: string, progress: number) {
    this.fileProgress.set(fileId, progress);
    this.updateProgress();
  }

  getTotalProgress() {
    return {
      completed: this.completedCount,
      total: this.totalCount,
    };
  }
}

/**
 * Upload files directly to R2 using presigned URLs
 * Handles batching, concurrency, and progress tracking
 */
export async function batchUploadToR2(
  files: File[],
  options: BatchUploadOptions
): Promise<{
  successful: Array<{ fileName: string; url: string; key: string }>;
  failed: Array<{ fileName: string; error: string }>;
  stats: { totalFiles: number; successful: number; failed: number; duration: number };
}> {
  const startTime = Date.now();
  const successful: Array<{ fileName: string; url: string; key: string }> = [];
  const failed: Array<{ fileName: string; error: string }> = [];

  if (files.length === 0) {
    return { successful, failed, stats: { totalFiles: 0, successful: 0, failed: 0, duration: 0 } };
  }

  console.log(`🚀 Starting batch upload of ${files.length} files to ${options.folder}`);

  try {
    // Step 1: Request presigned URLs from backend
    console.log('📋 Requesting presigned URLs...');
    const fileMetadata = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'image/jpeg',
      lastModified: file.lastModified,
    }));

    console.log(`📝 File metadata prepared for ${fileMetadata.length} files`);
    
    const presignResponse = await fetch('/api/r2/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: fileMetadata,
        folder: options.folder,
      }),
    });

    if (!presignResponse.ok) {
      const errorText = await presignResponse.text();
      console.error('Presign API error response:', errorText);
      throw new Error(`Failed to get presigned URLs: ${presignResponse.status} ${presignResponse.statusText}`);
    }

    const presignData = (await presignResponse.json()) as PresignedUrlResponse;
    console.log(`✅ Got ${presignData.presignedUrls.length} presigned URLs`);

    // Step 2: Upload files directly to R2 with concurrency control
    const uploadQueue = new UploadQueue(options.concurrency || 6, options.onProgress);
    const uploadMap = new Map(presignData.presignedUrls.map((p) => [p.fileName, p]));

    files.forEach((file, index) => {
      const presigned = uploadMap.get(file.name);

      if (!presigned || presigned.error) {
        failed.push({
          fileName: file.name,
          error: presigned?.error || 'No presigned URL',
        });
        options.onFileComplete?.(file.name, false);
        return;
      }

      const fileId = file.name;
      uploadQueue.add(
        async () => {
          try {
            // Upload directly to R2
            const uploadResponse = await uploadFileToR2(
              file,
              presigned.presignedUrl,
              presigned.contentType,
              (progress) => {
                uploadQueue.setFileProgress(fileId, progress);
              }
            );

            if (!uploadResponse.ok) {
              throw new Error(`Upload failed with status ${uploadResponse.status}`);
            }

            // Use public URL from presign response
            const publicUrl = presigned.publicUrl;

            successful.push({
              fileName: file.name,
              url: publicUrl,
              key: presigned.key,
            });

            console.log(`✅ Uploaded: ${file.name}`);
            options.onFileComplete?.(fileId, true, publicUrl);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            failed.push({
              fileName: file.name,
              error: errorMsg,
            });
            console.error(`❌ Failed to upload ${file.name}:`, error);
            options.onFileComplete?.(fileId, false);
          }
        },
        fileId
      );
    });

    // Execute all uploads with concurrency control
    await uploadQueue.run();

    const duration = Date.now() - startTime;
    console.log(
      `📊 Batch upload complete: ${successful.length}/${files.length} successful in ${(duration / 1000).toFixed(2)}s`
    );

    return {
      successful,
      failed,
      stats: {
        totalFiles: files.length,
        successful: successful.length,
        failed: failed.length,
        duration,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Batch upload error:', error);

    return {
      successful,
      failed: files.map((f) => ({ fileName: f.name, error: errorMsg })),
      stats: {
        totalFiles: files.length,
        successful: successful.length,
        failed: files.length - successful.length,
        duration: Date.now() - startTime,
      },
    };
  }
}

/**
 * Upload a single file to R2 using presigned URL with progress tracking
 */
function uploadFileToR2(
  file: File,
  presignedUrl: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeout = setTimeout(() => {
      xhr.abort();
      reject(new Error('Upload timeout (60 seconds)'));
    }, 60000);

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      clearTimeout(timeout);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(
          new Response(null, {
            status: xhr.status,
            statusText: xhr.statusText,
          })
        );
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error(`Upload error for ${file.name}`));
    });

    xhr.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error(`Upload aborted for ${file.name}`));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

/**
 * Extract public R2 URL from a key
 */
export function getR2PublicUrl(key: string, bucketName: string): string {
  return `https://${bucketName}.r2.cloudflarecustomers.com/${key}`;
}
