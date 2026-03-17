'use client';

import NextImage, { ImageProps as NextImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<NextImageProps, 'src'> {
  src: string;
  alt: string;
  blurDataURL?: string;
  fallbackSrc?: string;
}

const FALLBACK_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

export function OptimizedImage({
  src,
  alt,
  blurDataURL,
  fallbackSrc = FALLBACK_IMG_SRC,
  className,
  onLoadingComplete,
  onError,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <NextImage
        {...props}
        src={imgSrc}
        alt={alt}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        onLoadingComplete={(result) => {
          setIsLoading(false);
          onLoadingComplete?.(result);
        }}
        onError={(event) => {
          setImgSrc(fallbackSrc);
          setIsLoading(false);
          onError?.(event);
        }}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        loading={props.priority ? undefined : (props.loading || 'lazy')}
        quality={props.quality || 82}
        sizes={props.sizes || '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
      />
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-800" />
      )}
    </div>
  );
}
