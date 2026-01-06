"use client";
import React from 'react';
import { motion } from "framer-motion";
import { ImageOff, Calendar, MessageSquare, Star, Search, Inbox } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-white/10 dark:bg-white/5 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-[#707070] dark:text-[#A0A0A0]" />
      </div>
      <h3 className="text-xl text-[#2B2B2B] dark:text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
        {title}
      </h3>
      <p className="text-[#707070] dark:text-[#A0A0A0] mb-6 max-w-md">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full px-6"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// Specific empty states
export function NoEventsEmpty({ onAddEvent }: { onAddEvent?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No Events Yet"
      description="There are no events to display. Start by adding your first event."
      action={onAddEvent ? { label: 'Add Event', onClick: onAddEvent } : undefined}
    />
  );
}

export function NoPhotosEmpty() {
  return (
    <EmptyState
      icon={ImageOff}
      title="No Photos Available"
      description="There are no photos in this gallery yet. Check back soon!"
    />
  );
}

export function NoCommentsEmpty() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No Comments Yet"
      description="Be the first to leave a comment on this photo!"
    />
  );
}

export function NoReviewsEmpty({ onWriteReview }: { onWriteReview?: () => void }) {
  return (
    <EmptyState
      icon={Star}
      title="No Reviews Yet"
      description="No reviews have been submitted yet. Be the first to share your experience!"
      action={onWriteReview ? { label: 'Write a Review', onClick: onWriteReview } : undefined}
    />
  );
}

export function NoSearchResultsEmpty() {
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description="We couldn't find any matches for your search. Try different keywords."
    />
  );
}
