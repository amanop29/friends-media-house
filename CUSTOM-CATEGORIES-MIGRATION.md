# Custom Categories Migration Guide

## Overview
This migration adds support for custom event categories beyond the predefined enum values. Custom categories are stored in a new `custom_category` field in the `events` table.

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your "Friends Media House" project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the contents of `migrations/add_custom_category_field.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify the Migration**
   ```sql
   -- Check if the column was added
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'events' 
   AND column_name = 'custom_category';
   ```

### Option 2: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Run the migration**
   ```bash
   supabase db push
   ```

## What This Migration Does

1. **Adds `custom_category` column**
   - Type: `VARCHAR(100)`
   - Nullable: Yes (NULL means use the enum category)
   - Purpose: Store custom category names that aren't in the `event_type` enum

2. **Adds index**
   - Creates `idx_events_custom_category` for better query performance

3. **How It Works**
   - Standard categories (wedding, pre-wedding, etc.) → stored in `category` enum field, `custom_category` is NULL
   - Custom categories → `category` = 'other', `custom_category` = actual category name (e.g., "birthday-party")

## Testing the Migration

After running the migration, test with these SQL queries:

```sql
-- Test 1: Create an event with a standard category
INSERT INTO events (title, date, category) 
VALUES ('Test Wedding', '2026-06-01', 'wedding');

-- Test 2: Create an event with a custom category
INSERT INTO events (title, date, category, custom_category) 
VALUES ('Custom Event', '2026-07-01', 'other', 'street-photography');

-- Test 3: Query events and see both categories
SELECT 
  title,
  category,
  custom_category,
  COALESCE(custom_category, category::text) as display_category
FROM events
ORDER BY created_at DESC
LIMIT 10;
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove the index
DROP INDEX IF EXISTS idx_events_custom_category;

-- Remove the column
ALTER TABLE events DROP COLUMN IF EXISTS custom_category;
```

## Application Changes

The following files have been updated to support custom categories:

### Core Files
- `src/lib/events-store.ts` - Read/write custom_category to/from Supabase
- `src/views/admin/AddEvent.tsx` - Save custom categories when creating events
- `src/components/EditEventModal.tsx` - Update custom categories when editing

### Display Files
- `src/views/Gallery.tsx` - Show custom category filter buttons
- `src/views/EventDetail.tsx` - Display custom category on event pages
- `src/views/Home.tsx` - Show custom categories on homepage
- `src/views/admin/ManageGalleries.tsx` - Display in admin panel

### Migration File
- `migrations/add_custom_category_field.sql` - The SQL migration script

## How Custom Categories Work

1. **Creating Events**
   - User selects or creates a category in admin panel
   - If it's a standard category → saved to `category` enum only
   - If it's custom → `category` = 'other', `custom_category` = slug name

2. **Loading Events**
   - Frontend reads both `category` and `custom_category`
   - Uses `custom_category` if present, otherwise falls back to `category`
   - Display name is formatted using `getCategoryDisplayName()`

3. **Filtering in Gallery**
   - Filter buttons are generated from categories with events
   - Custom categories appear alongside standard ones
   - Filtering works with the actual category name (custom or standard)

## Benefits

✅ No more "Other" category confusion
✅ Unlimited custom categories
✅ Backward compatible with existing events
✅ Categories stored in Supabase (no localStorage dependency)
✅ Proper database indexing for performance
