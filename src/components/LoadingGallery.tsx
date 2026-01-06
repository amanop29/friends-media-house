import React from 'react';
import { Skeleton } from './ui/skeleton';
import { GlassCard } from './GlassCard';

interface LoadingGalleryProps {
  count?: number;
  variant?: 'grid' | 'masonry' | 'list';
}

export function LoadingGallery({ count = 12, variant = 'grid' }: LoadingGalleryProps) {
  if (variant === 'list') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <GlassCard key={i} className="p-4 md:p-6">
            <div className="flex gap-4 md:gap-6">
              <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 md:gap-6 ${
      variant === 'grid' 
        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
        : 'grid-cols-2 md:grid-cols-3'
    }`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton 
            className={`w-full rounded-lg ${
              variant === 'masonry' 
                ? i % 3 === 0 ? 'h-80' : i % 3 === 1 ? 'h-64' : 'h-96'
                : 'aspect-square'
            }`} 
          />
          {variant === 'masonry' && (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function LoadingEventCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <GlassCard key={i} hover className="overflow-hidden">
          <Skeleton className="w-full aspect-[4/5]" />
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
