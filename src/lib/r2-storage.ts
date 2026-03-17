import { GetObjectCommand } from '@aws-sdk/client-s3';
// Fetch an object from R2 (returns { body, contentType } or null)
export async function getR2Object(key: string): Promise<{ body: Buffer, contentType: string } | null> {
  if (!s3Client || !isR2Configured) return null;
  const bucketName = process.env.R2_BUCKET_NAME!;
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  try {
    const res = await s3Client.send(command);
    const stream = res.Body;
    const contentType = res.ContentType || 'application/octet-stream';
    // Convert stream to Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) {
      chunks.push(Buffer.from(chunk));
    }
    return { body: Buffer.concat(chunks), contentType };
  } catch (e) {
    return null;
  }
}
import { S3Client, PutObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

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

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file';
}

function createImmutableKey(folder: string, fileName: string): string {
  const safeName = sanitizeFileName(fileName);
  return `${folder}/${Date.now()}-${randomUUID()}-${safeName}`;
}

function getPublicUrlForKey(key: string): string {
  const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') || '';
  return `${baseUrl}/${key}`;
}

export async function uploadToR2ByKey(
  file: Buffer,
  key: string,
  contentType: string,
  cacheControl: string = 'public, max-age=31536000, immutable'
): Promise<UploadResult> {
  if (!s3Client || !isR2Configured) {
    throw new Error('R2 storage is not configured. Please set up environment variables.');
  }

  const bucketName = process.env.R2_BUCKET_NAME!;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  await s3Client.send(command);

  return {
    url: getPublicUrlForKey(key),
    key,
  };
}

export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: 'events' | 'gallery' | 'reviews' | 'avatars' | 'team' | 'banners' | 'logos' = 'gallery'
): Promise<UploadResult> {
  const key = createImmutableKey(folder, fileName);
  return uploadToR2ByKey(file, key, contentType);
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

  const key = createImmutableKey(folder, fileName);
  const bucketName = process.env.R2_BUCKET_NAME!;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = getPublicUrlForKey(key);

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

  /** Presign a PUT for an already-known storage key (e.g. a derived thumbnail key). */
  export async function getPresignedUrlForKey(
    key: string,
    contentType: string
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!s3Client || !isR2Configured) {
      throw new Error('R2 storage is not configured.');
    }
    const bucketName = process.env.R2_BUCKET_NAME!;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { uploadUrl, publicUrl: getPublicUrlForKey(key) };
  }

// Export helper to check if R2 is available
export function isR2Available(): boolean {
  return isR2Configured;
}

/**
 * Configure CORS on the R2 bucket so browsers can PUT directly via presigned URLs.
 * Idempotent — safe to call on every admin page load.
 */
export async function configureR2Cors(): Promise<void> {
  if (!s3Client || !isR2Configured) {
    throw new Error('R2 storage is not configured.');
  }
  const command = new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 86400,
        },
      ],
    },
  });
  await s3Client.send(command);
}
