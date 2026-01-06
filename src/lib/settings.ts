// Settings utility for managing site-wide configuration with Supabase sync

import { supabase } from './supabase';

export interface SiteSettings {
  siteName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  instagram: string;
  youtube: string;
  homeBannerUrl?: string;
  logoUrl?: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Friends Media House',
  tagline: 'Capturing Moments That Last Forever',
  email: 'info@friendsmediahouse.com',
  phone: '+91 8356020980',
  address: 'Mumbai, Maharashtra 400011, India',
  instagram: '@friendsmediahouse_',
  youtube: '@friendsmediahouse',
};

const SETTINGS_KEY = 'siteSettings';

export function getSettings(): SiteSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Fetch settings from Supabase and sync to localStorage
 */
export async function fetchSettings(): Promise<SiteSettings> {
  // Start with local settings
  let settings = getSettings();
  
  if (!supabase) {
    return settings;
  }

  try {
    // Try to get settings from the 'site_config' key (stores all settings as JSONB)
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'site_config')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.warn('Failed to fetch settings from Supabase:', error.message);
      return settings;
    }

    if (data && data.value) {
      // value is JSONB containing all site settings
      const supabaseSettings = typeof data.value === 'string' 
        ? JSON.parse(data.value) 
        : data.value;
      settings = { ...DEFAULT_SETTINGS, ...supabaseSettings };
      
      // Sync to localStorage
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('Settings synced from Supabase');
    }
  } catch (err) {
    console.warn('Error fetching settings from Supabase:', err);
  }

  return settings;
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Save to localStorage first for immediate effect
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));

    // Sync to Supabase (best effort) - store all settings under 'site_config' key
    if (supabase) {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { 
            key: 'site_config', 
            value: settings, 
            description: 'Site-wide configuration settings',
            updated_at: new Date().toISOString()
          }, 
          { onConflict: 'key' }
        );

      if (error) {
        console.warn('Failed to sync settings to Supabase:', error.message);
      } else {
        console.log('Settings synced to Supabase');
      }
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export function getInstagramUrl(handle: string): string {
  // Remove @ if present and construct URL
  const cleanHandle = handle.replace('@', '');
  return `https://instagram.com/${cleanHandle}`;
}

export function getYouTubeUrl(channel: string): string {
  // Remove @ if present and construct URL
  const cleanChannel = channel.replace('@', '');
  return `https://youtube.com/${cleanChannel}`;
}
