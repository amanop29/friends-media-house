import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Check if R2 is configured
const isR2Configured = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

// Only create S3 client if R2 is configured
const s3Client = isR2Configured 
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export interface UploadResult {
  url: string;
  key: string;
  thumbnailUrl?: string;
}

export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: 'events' | 'gallery' | 'reviews' | 'avatars' | 'team' | 'banners' | 'logos' = 'gallery'
): Promise<UploadResult> {
  if (!s3Client || !isR2Configured) {
    throw new Error('R2 storage is not configured. Please set up environment variables.');
  }

  const key = `${folder}/${Date.now()}-${fileName}`;
  const bucketName = process.env.R2_BUCKET_NAME!;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3Client.send(command);

  // Ensure R2_PUBLIC_URL doesn't have trailing slash before appending key
  const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') || '';
  const publicUrl = `${baseUrl}/${key}`;

  return {
    url: publicUrl,
    key,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!s3Client || !isR2Configured) {
    throw new Error('R2 storage is not configured. Please set up environment variables.');
  }

  const bucketName = process.env.R2_BUCKET_NAME!;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}

export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: 'events' | 'gallery' | 'reviews' | 'avatars' | 'team' | 'banners' | 'logos' = 'gallery'
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  if (!s3Client || !isR2Configured) {
    throw new Error('R2 storage is not configured. Please set up environment variables.');
  }

  const key = `${folder}/${Date.now()}-${fileName}`;
  const bucketName = process.env.R2_BUCKET_NAME!;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  // Ensure R2_PUBLIC_URL doesn't have trailing slash before appending key
  const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') || '';
  const publicUrl = `${baseUrl}/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

// Export helper to check if R2 is available
export function isR2Available(): boolean {
  return isR2Configured;
}
