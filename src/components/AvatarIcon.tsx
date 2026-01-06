import React from 'react';
import { User, Heart, Smile, Star, Sparkles, Camera, Music, Flower2 } from 'lucide-react';
import { AvatarOption } from '../lib/mock-data';

interface AvatarIconProps {
  avatar: AvatarOption;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Heart,
  Smile,
  Star,
  Sparkles,
  Camera,
  Music,
  Flower2,
};

export function AvatarIcon({ avatar, size = 'md', className = '' }: AvatarIconProps) {
  const IconComponent = iconMap[avatar.icon] || User;
  
  // Fixed pixel sizes to prevent stretching
  const sizeClasses = {
    sm: 'w-[40px] h-[40px]',
    md: 'w-[48px] h-[48px]',
    lg: 'w-[64px] h-[64px]',
  };
  
  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-[999px] bg-gradient-to-br ${avatar.gradient} flex items-center justify-center flex-shrink-0 ${className}`}>
      <IconComponent className={`${iconSizeClasses[size]} text-white`} />
    </div>
  );
}