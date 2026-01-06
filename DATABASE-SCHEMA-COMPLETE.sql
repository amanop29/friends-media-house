-- ============================================================
-- Friends Media House - Complete Database Schema
-- Supabase PostgreSQL Database
-- Created: January 2026
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- SECTION 2: ENUM TYPES
-- ============================================================

-- Lead status enum
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'converted', 'closed');

-- Lead priority enum
CREATE TYPE lead_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Lead source enum
CREATE TYPE lead_source AS ENUM ('website', 'contact_form', 'instagram', 'referral', 'other');

-- Event type enum
CREATE TYPE event_type AS ENUM ('wedding', 'pre-wedding', 'engagement', 'reception', 'jainism', 'birthday', 'corporate', 'event', 'film', 'other');

-- Video type enum
CREATE TYPE video_type AS ENUM ('youtube', 'upload');

-- Activity entity type enum
CREATE TYPE activity_entity AS ENUM ('event', 'photo', 'video', 'lead', 'review', 'comment', 'setting');

-- ============================================================
-- SECTION 3: TABLES
-- ============================================================

-- -----------------------------------------------------------
-- 3.1 EVENTS TABLE
-- Main table for storing event/gallery information
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    couple_names VARCHAR(255),
    date DATE NOT NULL,
    location VARCHAR(255),
    category event_type DEFAULT 'wedding',
    cover_image TEXT, -- R2 URL or external URL
    cover_thumbnail TEXT, -- Thumbnail version of cover image
    photo_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for events
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
CREATE INDEX IF NOT EXISTS idx_events_is_visible ON events(is_visible);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- -----------------------------------------------------------
-- 3.2 PHOTOS TABLE
-- Stores photos belonging to events
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    url TEXT NOT NULL, -- Full-size image URL (R2)
    thumbnail_url TEXT, -- Thumbnail URL (R2)
    blur_data_url TEXT, -- Base64 blur placeholder
    alt_text VARCHAR(255),
    width INTEGER,
    height INTEGER,
    orientation VARCHAR(20) DEFAULT 'landscape', -- portrait, landscape, square
    display_order INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for photos
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_display_order ON photos(display_order);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- -----------------------------------------------------------
-- 3.3 VIDEOS TABLE
-- Stores videos belonging to events
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    url TEXT NOT NULL, -- YouTube URL or R2 uploaded video URL
    thumbnail_url TEXT, -- Video thumbnail
    title VARCHAR(255),
    type video_type DEFAULT 'youtube',
    display_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for videos
CREATE INDEX IF NOT EXISTS idx_videos_event_id ON videos(event_id);
CREATE INDEX IF NOT EXISTS idx_videos_type ON videos(type);
CREATE INDEX IF NOT EXISTS idx_videos_display_order ON videos(display_order);

-- -----------------------------------------------------------
-- 3.4 LEADS TABLE
-- Contact form submissions and leads management
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    event_type event_type,
    event_date DATE,
    status lead_status DEFAULT 'new',
    priority lead_priority DEFAULT 'normal',
    source lead_source DEFAULT 'website',
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- -----------------------------------------------------------
-- 3.5 REVIEWS TABLE
-- Customer reviews and testimonials
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT, -- Avatar icon/image URL
    avatar_icon VARCHAR(50), -- Icon name (e.g., 'User', 'Heart', etc.)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    event_name VARCHAR(255),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_is_featured ON reviews(is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON reviews(is_hidden);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- -----------------------------------------------------------
-- 3.6 PHOTO_COMMENTS TABLE
-- Comments on individual photos
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS photo_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255),
    comment TEXT NOT NULL,
    avatar TEXT, -- Avatar JSON or URL
    photo_url TEXT, -- URL of the photo being commented on
    event_title VARCHAR(255), -- Title of the event
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for photo_comments
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo_id ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_is_hidden ON photo_comments(is_hidden);
CREATE INDEX IF NOT EXISTS idx_photo_comments_created_at ON photo_comments(created_at DESC);

-- -----------------------------------------------------------
-- 3.7 FAQS TABLE
-- Frequently asked questions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general', -- booking, pricing, delivery, general
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faqs
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON faqs(is_active);

-- -----------------------------------------------------------
-- 3.8 SETTINGS TABLE
-- Site-wide configuration settings (key-value store)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL, -- Stores settings as JSONB
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for settings key lookup
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- -----------------------------------------------------------
-- 3.9 ACTIVITY_LOG TABLE
-- Admin activity logging for audit trail
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity_type activity_entity NOT NULL,
    entity_id UUID, -- Can be null for non-entity actions
    admin_id UUID,
    admin_email VARCHAR(255),
    details JSONB, -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_admin_email ON activity_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- -----------------------------------------------------------
-- 3.10 ADMIN_USERS TABLE
-- Admin user management (optional - can use Supabase Auth)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin, viewer
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- -----------------------------------------------------------
-- 3.11 EVENT_CATEGORIES TABLE (Optional - for dynamic categories)
-- Dynamic event category management
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for event_categories
CREATE INDEX IF NOT EXISTS idx_event_categories_slug ON event_categories(slug);
CREATE INDEX IF NOT EXISTS idx_event_categories_is_active ON event_categories(is_active);

-- ============================================================
-- SECTION 4: FUNCTIONS & TRIGGERS
-- ============================================================

-- -----------------------------------------------------------
-- 4.1 Auto-update updated_at timestamp
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to leads table
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to settings table
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to faqs table
DROP TRIGGER IF EXISTS update_faqs_updated_at ON faqs;
CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to admin_users table
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------
-- 4.2 Auto-generate slug from title for events
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = LOWER(REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
        NEW.slug = TRIM(BOTH '-' FROM NEW.slug);
        -- Ensure uniqueness by appending timestamp if needed
        IF EXISTS (SELECT 1 FROM events WHERE slug = NEW.slug AND id != COALESCE(NEW.id, uuid_generate_v4())) THEN
            NEW.slug = NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_event_slug_trigger ON events;
CREATE TRIGGER generate_event_slug_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION generate_event_slug();

-- -----------------------------------------------------------
-- 4.3 Update photo/video counts on events
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_event_photo_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events SET photo_count = photo_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events SET photo_count = GREATEST(0, photo_count - 1) WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_photo_count_trigger ON photos;
CREATE TRIGGER update_photo_count_trigger
    AFTER INSERT OR DELETE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_event_photo_count();

CREATE OR REPLACE FUNCTION update_event_video_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events SET video_count = video_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events SET video_count = GREATEST(0, video_count - 1) WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_video_count_trigger ON videos;
CREATE TRIGGER update_video_count_trigger
    AFTER INSERT OR DELETE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_event_video_count();

-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- -----------------------------------------------------------
-- 5.1 EVENTS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can view visible events
DROP POLICY IF EXISTS "Public can view visible events" ON events;
CREATE POLICY "Public can view visible events" ON events
    FOR SELECT
    USING (is_visible = true);

-- Authenticated users can view all events
DROP POLICY IF EXISTS "Authenticated users can view all events" ON events;
CREATE POLICY "Authenticated users can view all events" ON events
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role can do anything (for admin API)
DROP POLICY IF EXISTS "Service role full access to events" ON events;
CREATE POLICY "Service role full access to events" ON events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow anonymous inserts (for public API with token auth)
DROP POLICY IF EXISTS "Allow inserts for all" ON events;
CREATE POLICY "Allow inserts for all" ON events
    FOR INSERT
    WITH CHECK (true);

-- Allow updates for authenticated or service role
DROP POLICY IF EXISTS "Allow updates for authenticated" ON events;
CREATE POLICY "Allow updates for authenticated" ON events
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow deletes for authenticated or service role
DROP POLICY IF EXISTS "Allow deletes for authenticated" ON events;
CREATE POLICY "Allow deletes for authenticated" ON events
    FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------------------------------------
-- 5.2 PHOTOS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Public can view photos of visible events
DROP POLICY IF EXISTS "Public can view photos of visible events" ON photos;
CREATE POLICY "Public can view photos of visible events" ON photos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = photos.event_id 
            AND events.is_visible = true
        )
    );

-- Authenticated users can view all photos
DROP POLICY IF EXISTS "Authenticated can view all photos" ON photos;
CREATE POLICY "Authenticated can view all photos" ON photos
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to photos" ON photos;
CREATE POLICY "Service role full access to photos" ON photos
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow inserts for all (admin API handles auth)
DROP POLICY IF EXISTS "Allow inserts for photos" ON photos;
CREATE POLICY "Allow inserts for photos" ON photos
    FOR INSERT
    WITH CHECK (true);

-- Allow updates for authenticated
DROP POLICY IF EXISTS "Allow updates for photos" ON photos;
CREATE POLICY "Allow updates for photos" ON photos
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow deletes for authenticated
DROP POLICY IF EXISTS "Allow deletes for photos" ON photos;
CREATE POLICY "Allow deletes for photos" ON photos
    FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------------------------------------
-- 5.3 VIDEOS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Public can view videos of visible events
DROP POLICY IF EXISTS "Public can view videos of visible events" ON videos;
CREATE POLICY "Public can view videos of visible events" ON videos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = videos.event_id 
            AND events.is_visible = true
        )
    );

-- Authenticated users can view all videos
DROP POLICY IF EXISTS "Authenticated can view all videos" ON videos;
CREATE POLICY "Authenticated can view all videos" ON videos
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to videos" ON videos;
CREATE POLICY "Service role full access to videos" ON videos
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow inserts for all (admin API handles auth)
DROP POLICY IF EXISTS "Allow inserts for videos" ON videos;
CREATE POLICY "Allow inserts for videos" ON videos
    FOR INSERT
    WITH CHECK (true);

-- Allow updates for authenticated
DROP POLICY IF EXISTS "Allow updates for videos" ON videos;
CREATE POLICY "Allow updates for videos" ON videos
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow deletes for authenticated
DROP POLICY IF EXISTS "Allow deletes for videos" ON videos;
CREATE POLICY "Allow deletes for videos" ON videos
    FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------------------------------------
-- 5.4 LEADS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Public can insert leads (contact form)
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
CREATE POLICY "Public can insert leads" ON leads
    FOR INSERT
    WITH CHECK (true);

-- Only authenticated users can view leads
DROP POLICY IF EXISTS "Authenticated can view leads" ON leads;
CREATE POLICY "Authenticated can view leads" ON leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to leads" ON leads;
CREATE POLICY "Service role full access to leads" ON leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow updates for authenticated
DROP POLICY IF EXISTS "Allow updates for leads" ON leads;
CREATE POLICY "Allow updates for leads" ON leads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow deletes for authenticated
DROP POLICY IF EXISTS "Allow deletes for leads" ON leads;
CREATE POLICY "Allow deletes for leads" ON leads
    FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------------------------------------
-- 5.5 REVIEWS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public can view approved, non-hidden reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON reviews;
CREATE POLICY "Public can view approved reviews" ON reviews
    FOR SELECT
    USING (is_approved = true AND is_hidden = false);

-- Public can insert reviews (anyone can submit)
DROP POLICY IF EXISTS "Public can insert reviews" ON reviews;
CREATE POLICY "Public can insert reviews" ON reviews
    FOR INSERT
    WITH CHECK (true);

-- Authenticated users can view all reviews
DROP POLICY IF EXISTS "Authenticated can view all reviews" ON reviews;
CREATE POLICY "Authenticated can view all reviews" ON reviews
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to reviews" ON reviews;
CREATE POLICY "Service role full access to reviews" ON reviews
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow updates for authenticated (for approval/hiding)
DROP POLICY IF EXISTS "Allow updates for reviews" ON reviews;
CREATE POLICY "Allow updates for reviews" ON reviews
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow deletes for authenticated
DROP POLICY IF EXISTS "Allow deletes for reviews" ON reviews;
CREATE POLICY "Allow deletes for reviews" ON reviews
    FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------------------------------------
-- 5.6 PHOTO_COMMENTS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- Public can view non-hidden comments
DROP POLICY IF EXISTS "Public can view non-hidden comments" ON photo_comments;
CREATE POLICY "Public can view non-hidden comments" ON photo_comments
    FOR SELECT
    USING (is_hidden = false);

-- Public can insert comments
DROP POLICY IF EXISTS "Public can insert comments" ON photo_comments;
CREATE POLICY "Public can insert comments" ON photo_comments
    FOR INSERT
    WITH CHECK (true);

-- Authenticated users can view all comments
DROP POLICY IF EXISTS "Authenticated can view all comments" ON photo_comments;
CREATE POLICY "Authenticated can view all comments" ON photo_comments
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to comments" ON photo_comments;
CREATE POLICY "Service role full access to comments" ON photo_comments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow updates for authenticated (for hiding)
DROP POLICY IF EXISTS "Allow updates for comments" ON photo_comments;
CREATE POLICY "Allow updates for comments" ON photo_comments
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow deletes for authenticated
DROP POLICY IF EXISTS "Allow deletes for comments" ON photo_comments;
CREATE POLICY "Allow deletes for comments" ON photo_comments
    FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------------------------------------
-- 5.7 FAQS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Public can view active FAQs
DROP POLICY IF EXISTS "Public can view active FAQs" ON faqs;
CREATE POLICY "Public can view active FAQs" ON faqs
    FOR SELECT
    USING (is_active = true);

-- Authenticated users can view all FAQs
DROP POLICY IF EXISTS "Authenticated can view all FAQs" ON faqs;
CREATE POLICY "Authenticated can view all FAQs" ON faqs
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to FAQs" ON faqs;
CREATE POLICY "Service role full access to FAQs" ON faqs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow inserts for authenticated
DROP POLICY IF EXISTS "Allow inserts for FAQs" ON faqs;
CREATE POLICY "Allow inserts for FAQs" ON faqs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow updates for authenticated
DROP POLICY IF EXISTS "Allow updates for FAQs" ON faqs;
CREATE POLICY "Allow updates for FAQs" ON faqs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow deletes for authenticated
DROP POLICY IF EXISTS "Allow deletes for FAQs" ON faqs;
CREATE POLICY "Allow deletes for FAQs" ON faqs
    FOR DELETE
    TO authenticated
    USING (true);

-- -----------------------------------------------------------
-- 5.8 SETTINGS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public can view settings (for site config)
DROP POLICY IF EXISTS "Public can view settings" ON settings;
CREATE POLICY "Public can view settings" ON settings
    FOR SELECT
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to settings" ON settings;
CREATE POLICY "Service role full access to settings" ON settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow upserts for authenticated
DROP POLICY IF EXISTS "Allow upserts for settings" ON settings;
CREATE POLICY "Allow upserts for settings" ON settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------
-- 5.9 ACTIVITY_LOG TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view activity log
DROP POLICY IF EXISTS "Authenticated can view activity log" ON activity_log;
CREATE POLICY "Authenticated can view activity log" ON activity_log
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow inserts for all (logging should always work)
DROP POLICY IF EXISTS "Allow inserts for activity log" ON activity_log;
CREATE POLICY "Allow inserts for activity log" ON activity_log
    FOR INSERT
    WITH CHECK (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to activity log" ON activity_log;
CREATE POLICY "Service role full access to activity log" ON activity_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------
-- 5.10 ADMIN_USERS TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only service role can access admin_users
DROP POLICY IF EXISTS "Service role full access to admin users" ON admin_users;
CREATE POLICY "Service role full access to admin users" ON admin_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view their own record
DROP POLICY IF EXISTS "Users can view own admin record" ON admin_users;
CREATE POLICY "Users can view own admin record" ON admin_users
    FOR SELECT
    TO authenticated
    USING (email = current_user);

-- -----------------------------------------------------------
-- 5.11 EVENT_CATEGORIES TABLE - RLS Policies
-- -----------------------------------------------------------
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

-- Public can view active categories
DROP POLICY IF EXISTS "Public can view active categories" ON event_categories;
CREATE POLICY "Public can view active categories" ON event_categories
    FOR SELECT
    USING (is_active = true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to categories" ON event_categories;
CREATE POLICY "Service role full access to categories" ON event_categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow all operations for authenticated users
DROP POLICY IF EXISTS "Authenticated full access to categories" ON event_categories;
CREATE POLICY "Authenticated full access to categories" ON event_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- SECTION 6: DEFAULT DATA
-- ============================================================

-- -----------------------------------------------------------
-- 6.1 Default Settings
-- -----------------------------------------------------------
INSERT INTO settings (key, value)
VALUES (
    'site_config',
    '{
        "siteName": "Friends Media House",
        "tagline": "Capturing Moments That Last Forever",
        "email": "info@friendsmediahouse.com",
        "phone": "+91 8356020980",
        "address": "Mumbai, Maharashtra 400011, India",
        "instagram": "@friendsmediahouse_",
        "youtube": "@friendsmediahouse"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------
-- 6.2 Default Event Categories
-- -----------------------------------------------------------
INSERT INTO event_categories (slug, label, display_order) VALUES
    ('wedding', 'Wedding', 1),
    ('pre-wedding', 'Pre-Wedding', 2),
    ('event', 'Event', 3),
    ('film', 'Cinematic Film', 4)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------
-- 6.3 Default FAQs
-- -----------------------------------------------------------
INSERT INTO faqs (question, answer, category, display_order) VALUES
    ('How do I book a photography session?', 'You can book a session by filling out our contact form or calling us directly. We''ll discuss your requirements and provide a customized quote.', 'booking', 1),
    ('What is included in your packages?', 'Our packages typically include professional photography, edited high-resolution images, online gallery access, and various add-ons depending on the package tier.', 'pricing', 2),
    ('How long until I receive my photos?', 'Typically, you''ll receive a preview gallery within 48 hours and the complete edited collection within 2-4 weeks, depending on the event size.', 'delivery', 3),
    ('Do you travel for destination weddings?', 'Yes! We love destination weddings. Travel fees may apply depending on the location. Contact us for a custom quote.', 'general', 4),
    ('Can I request specific editing styles?', 'Absolutely! We offer various editing styles and can customize the look to match your vision. We''ll discuss this during your consultation.', 'general', 5),
    ('What happens if it rains on my wedding day?', 'We''re prepared for any weather! Rain can actually create stunning, romantic photos. We always have backup plans and can adapt to any situation.', 'general', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 7: UTILITY QUERIES
-- ============================================================

-- -----------------------------------------------------------
-- 7.1 Get event with photo and video counts
-- -----------------------------------------------------------
-- SELECT 
--     e.*,
--     (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) as actual_photo_count,
--     (SELECT COUNT(*) FROM videos v WHERE v.event_id = e.id) as actual_video_count
-- FROM events e
-- WHERE e.is_visible = true
-- ORDER BY e.date DESC;

-- -----------------------------------------------------------
-- 7.2 Get featured events for homepage
-- -----------------------------------------------------------
-- SELECT * FROM events 
-- WHERE is_featured = true AND is_visible = true 
-- ORDER BY date DESC 
-- LIMIT 6;

-- -----------------------------------------------------------
-- 7.3 Get recent activity
-- -----------------------------------------------------------
-- SELECT * FROM activity_log 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- -----------------------------------------------------------
-- 7.4 Get leads by status
-- -----------------------------------------------------------
-- SELECT * FROM leads 
-- WHERE status = 'new' 
-- ORDER BY priority DESC, created_at DESC;

-- -----------------------------------------------------------
-- 7.5 Get approved reviews
-- -----------------------------------------------------------
-- SELECT * FROM reviews 
-- WHERE is_approved = true AND is_hidden = false 
-- ORDER BY created_at DESC;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
