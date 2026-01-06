import React from 'react';
import { cn } from './ui/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  variant?: 'default' | 'modal';
}

export function GlassCard({ children, className, hover = false, variant = 'default' }: GlassCardProps) {
  return (
    <div
      className={cn(
        variant === 'default' && 'backdrop-blur-lg bg-white/10 dark:bg-black/20',
        variant === 'default' && 'border border-black/20 dark:border-white/10',
        variant === 'default' && 'text-white dark:text-inherit',
        
        variant === 'modal' && 'backdrop-blur-3xl dark:backdrop-blur-2xl',
        variant === 'modal' && 'bg-white/30 dark:bg-black/[0.55]',
        variant === 'modal' && 'border-2 dark:border border-white/40 dark:border-white/[0.14]',
        variant === 'modal' && 'shadow-[0_8px_32px_rgba(31,38,135,0.15),0_0_1px_rgba(255,255,255,0.5)_inset] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]',
        variant === 'modal' && 'text-[#1A1A1A] dark:text-white',
        variant === 'modal' && 'ring-1 ring-white/20 dark:ring-white/10',
        
        'rounded-xl',
        'transition-all duration-300',
        hover && 'hover:scale-[1.02] hover:border-[#C5A572]/50 hover:shadow-xl',
        className
      )}
    >
      {children}
    </div>
  );
}