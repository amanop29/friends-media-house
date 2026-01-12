-- Migration: Add custom_category field to events table
-- This allows storing custom category names that aren't in the event_type enum
-- Date: January 13, 2026

-- Add custom_category column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS custom_category VARCHAR(100);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_custom_category ON events(custom_category);

-- Add comment to explain the field
COMMENT ON COLUMN events.custom_category IS 'Stores custom category names that override the category enum when present. If NULL, use the category field.';

-- Update existing events with "other" category to potentially use custom categories
-- (This is a placeholder - you can manually update specific events if needed)
