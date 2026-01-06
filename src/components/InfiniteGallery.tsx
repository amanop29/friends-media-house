'use client';

import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { OptimizedImage } from './OptimizedImage';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  blur_data_url?: string;
  alt_text?: string;
  width: number;
  height: number;
}

interface InfiniteGalleryProps {
  galleryId: string;
  initialPhotos: Photo[];
  pageSize?: number;
}

export function InfiniteGallery({
  galleryId,
  initialPhotos,
  pageSize = 24,
}: InfiniteGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPhotos.length >= pageSize);
  const [loading, setLoading] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/galleries/${galleryId}/photos?page=${page + 1}&limit=${pageSize}`
      );
      const data = await response.json();

      if (data.photos && data.photos.length > 0) {
        setPhotos((prev) => [...prev, ...data.photos]);
        setPage((prev) => prev + 1);
        setHasMore(data.photos.length >= pageSize);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore();
    }
  }, [inView]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
          >
            <OptimizedImage
              src={photo.thumbnail_url || photo.url}
              alt={photo.alt_text || 'Gallery photo'}
              fill
              blurDataURL={photo.blur_data_url}
              className="object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
            />
          </div>
        ))}
      </div>

      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          {loading && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more...
            </Button>
          )}
        </div>
      )}

      {!hasMore && photos.length > 0 && (
        <p className="text-center text-muted-foreground py-8">
          You've reached the end of the gallery
        </p>
      )}
    </div>
  );
}
