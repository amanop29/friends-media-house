import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client with Cloudflare credentials
const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.R2_ENDPOINT || '',
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'friends-media-house';

export async function POST(request: NextRequest) {
  try {
    const { files, folder } = await request.json();

    // Validate input
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!['events', 'banners', 'logos'].includes(folder)) {
      return NextResponse.json(
        { error: 'Invalid folder' },
        { status: 400 }
      );
    }

    // Generate presigned URL for each file
    const presignedUrls = await Promise.all(
      files.map(async (file: { name: string; size: number; type: string; lastModified: number }) => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 11);
        const key = `${folder}/${timestamp}-${randomId}-${file.name}`;

        try {
          const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            ContentType: file.type || 'image/jpeg',
            ContentLength: file.size,
          });

          const presignedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600, // URL expires in 1 hour
          });

          return {
            fileName: file.name,
            key,
            presignedUrl,
            contentType: file.type || 'image/jpeg',
            fileSize: file.size,
          };
        } catch (err) {
          console.error(`Failed to generate presigned URL for ${file.name}:`, err);
          return {
            fileName: file.name,
            error: 'Failed to generate upload URL',
          };
        }
      })
    );

    return NextResponse.json({
      presignedUrls,
      bucket: R2_BUCKET,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Presign API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URLs' },
      { status: 500 }
    );
  }
}
