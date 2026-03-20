import sharp from 'sharp';

export interface LosslessOptimizeResult {
  buffer: Buffer;
  contentType: string;
  optimized: boolean;
}

const LOSSLESS_MIN_BYTES = 2 * 1024 * 1024;

/**
 * Applies lossless optimization to large raster images.
 * JPEG is intentionally skipped to preserve a strict lossless guarantee.
 */
export async function optimizeImageLosslessly(
  buffer: Buffer,
  contentType: string,
  minBytes: number = LOSSLESS_MIN_BYTES
): Promise<LosslessOptimizeResult> {
  if (buffer.length < minBytes) {
    return { buffer, contentType, optimized: false };
  }

  if (contentType === 'image/png') {
    const optimizedBuffer = await sharp(buffer)
      .rotate()
      .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      contentType: 'image/png',
      optimized: optimizedBuffer.length < buffer.length,
    };
  }

  if (contentType === 'image/webp') {
    const optimizedBuffer = await sharp(buffer)
      .rotate()
      .webp({ lossless: true, effort: 6 })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      contentType: 'image/webp',
      optimized: optimizedBuffer.length < buffer.length,
    };
  }

  return { buffer, contentType, optimized: false };
}
