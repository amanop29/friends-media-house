import React from 'react';
import { GlassCard } from './GlassCard';
import { Skeleton } from './ui/skeleton';

// Event Card Skeleton
export function EventCardSkeleton() {
  return (
    <GlassCard className="overflow-hidden">
      <div className="relative h-80">
        <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end p-6">
          <div className="w-3/4 h-6 bg-white/20 rounded mb-2 animate-pulse" />
          <div className="w-1/2 h-4 bg-white/20 rounded animate-pulse" />
        </div>
      </div>
    </GlassCard>
  );
}

// Gallery Loading Skeleton
export function GalleryLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={i} 
          className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]"
        />
      ))}
    </div>
  );
}

// Photo Grid Skeleton
export function PhotoGridSkeleton({ density = 4 }: { density?: number }) {
  const skeletonCount = density * 3; // Show 3 rows
  return (
    <>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div key={i} className="w-full">
          <div 
            className="w-full rounded-lg overflow-hidden bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer bg-[length:200%_100%]" 
            style={{ 
              aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/3'
            }}
          />
        </div>
      ))}
    </>
  );
}

// Review Card Skeleton
export function ReviewCardSkeleton() {
  return (
    <GlassCard className="p-6">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-4 h-4" />
            ))}
          </div>
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-24 mt-4" />
    </GlassCard>
  );
}

// Reviews Loading Skeleton
export function ReviewsLoadingSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ReviewCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 backdrop-blur-lg bg-white/5 border border-white/10 rounded-lg mb-2">
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

// Admin Table Skeleton
export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}