import React from 'react';
import { cn } from './ui/utils';

interface EventCoverPlaceholderProps {
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  compact?: boolean;
}

function getTitleLines(title: string, compact: boolean) {
  const normalizedTitle = title.trim() || 'Untitled Event';

  if (compact) {
    return normalizedTitle
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'EV';
  }

  return normalizedTitle;
}

export function EventCoverPlaceholder({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
  compact = false,
}: EventCoverPlaceholderProps) {
  const displayTitle = getTitleLines(title, compact);

  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-[#ECEFF4] text-center text-[#2B2B2B] dark:bg-[#1A1712] dark:text-white',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(197,165,114,0.2),_transparent_52%),linear-gradient(145deg,_rgba(255,255,255,0.9),_rgba(214,221,232,0.96))] dark:bg-[radial-gradient(circle_at_top,_rgba(197,165,114,0.42),_transparent_52%),linear-gradient(145deg,_rgba(197,165,114,0.14),_rgba(11,11,11,0.92))]" />
      <div className="absolute inset-[10%] rounded-[28px] border border-[#C5A572]/28 dark:border-[#C5A572]/20" />
      <div className="relative z-10 flex max-w-[85%] flex-col items-center justify-center gap-2 px-4">
        {!compact && (
          <span className="text-[10px] uppercase tracking-[0.45em] text-[#B89456] dark:text-[#E7D5AE]/75">
            Friends Media House
          </span>
        )}
        <span
          className={cn(
            compact
              ? 'text-sm font-semibold tracking-[0.2em]'
              : 'text-2xl font-semibold leading-tight md:text-3xl',
            titleClassName
          )}
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {displayTitle}
        </span>
        {!compact && subtitle ? (
          <span className={cn('max-w-[28rem] text-sm text-[#4F5663] md:text-base dark:text-white/75', subtitleClassName)}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}