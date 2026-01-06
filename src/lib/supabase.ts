import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

console.log('🔧 Supabase Configuration:', {
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
  anonKey: supabaseAnonKey ? 'SET (length: ' + supabaseAnonKey.length + ')' : 'NOT SET',
  isConfigured: isSupabaseConfigured
});

// Create client only if configured, otherwise create a dummy client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

if (supabase) {
  console.log('✅ Supabase client created successfully');
} else {
  console.warn('⚠️ Supabase client NOT created - missing credentials');
}

// Server-side client with service role key
export const supabaseAdmin = (supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null as any;

// Type definitions for database tables
export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  date: string;
  location: string;
  category: string;
  cover_image: string;
  gallery_id?: string;
  created_at: string;
  updated_at: string;
  is_featured: boolean;
}

export interface Gallery {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  gallery_id: string;
  url: string;
  thumbnail_url?: string;
  blur_data_url?: string;
  alt_text?: string;
  width: number;
  height: number;
  order: number;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  event_interest?: string;
  source: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  created_at: string;
}

export interface Review {
  id: string;
  author_name: string;
  author_avatar?: string;
  rating: number;
  comment: string;
  event_id?: string;
  is_approved: boolean;
  created_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  photo_id: string;
  author_name: string;
  author_email: string;
  content: string;
  is_approved: boolean;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  bio?: string;
  photo_url: string;
  photo_thumbnail_url?: string;
  photo_key?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
}
