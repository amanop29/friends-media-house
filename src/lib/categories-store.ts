/**
 * Categories Store
 * Manages event categories with localStorage persistence and Supabase sync (best effort)
 */

import { supabase } from './supabase';

const CATEGORIES_STORAGE_KEY = 'fmh_categories';

// Default categories
const DEFAULT_CATEGORIES = ['wedding', 'pre-wedding', 'event', 'film', 'jainism'];

// Normalize a category string to a slug
const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Get all categories
 */
export function getCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (stored) {
      const categories = JSON.parse(stored);
      // Ensure default categories are always present
      const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])];
      return allCategories.sort();
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
  
  return DEFAULT_CATEGORIES;
}

/**
 * Fetch categories from Supabase (best effort) and merge with local/defaults.
 * Caches merged result to localStorage for offline usage.
 */
export async function fetchCategories(): Promise<string[]> {
  // Start with local/default so UI is responsive
  const base = getCategories();

  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured; using local categories only');
    return base;
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('slug, is_active');

    if (error || !data) {
      console.warn('Supabase categories fetch failed:', error?.message || error);
      return base;
    }

    const supabaseCategories = data
      .filter((c: any) => c.is_active !== false && c.slug)
      .map((c: any) => c.slug.toLowerCase());

    const merged = [...new Set([...DEFAULT_CATEGORIES, ...base, ...supabaseCategories])].sort();

    if (typeof window !== 'undefined') {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(merged));
    }

    return merged;
  } catch (err) {
    console.warn('Error fetching categories from Supabase:', err);
    return base;
  }
}

/**
 * Add a new category
 */
export function addCategory(category: string): boolean {
  if (!category || typeof category !== 'string') {
    return false;
  }

  const normalizedCategory = toSlug(category);
  
  if (!normalizedCategory) {
    return false;
  }

  const categories = getCategories();
  
  if (categories.includes(normalizedCategory)) {
    return false; // Category already exists
  }

  const updatedCategories = [...categories, normalizedCategory].sort();
  
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updatedCategories));
    
    // Dispatch custom event for real-time sync
    window.dispatchEvent(new CustomEvent('categoriesUpdated', {
      detail: { categories: updatedCategories }
    }));

    // Best-effort: sync to Supabase categories table
    if (supabase && typeof supabase.from === 'function') {
      supabase
        .from('categories')
        .upsert({
          slug: normalizedCategory,
          label: getCategoryDisplayName(normalizedCategory),
          is_default: false,
          is_active: true,
        })
        .then(() => {
          console.log(`Synced category "${normalizedCategory}" to Supabase`);
        })
        .catch((err: any) => {
          console.warn('Supabase category upsert failed:', err?.message || err);
        });
    } else {
      console.warn('Supabase not configured; category saved locally only');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving category:', error);
    return false;
  }
}

/**
 * Delete a category (only custom categories, not defaults)
 */
export async function deleteCategory(category: string): Promise<boolean> {
  const normalizedCategory = toSlug(category);
  
  // Prevent deleting default categories
  if (DEFAULT_CATEGORIES.includes(normalizedCategory)) {
    return false;
  }

  const categories = getCategories();
  const updatedCategories = categories.filter(c => c !== normalizedCategory);
  
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updatedCategories));
    
    // Dispatch custom event for real-time sync
    window.dispatchEvent(new CustomEvent('categoriesUpdated', {
      detail: { categories: updatedCategories }
    }));

    // Wait for Supabase delete to complete before returning
    if (supabase && typeof supabase.from === 'function') {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('slug', normalizedCategory);
      
      if (error) {
        console.warn('Supabase category delete failed:', error.message);
      } else {
        console.log(`Deleted category "${normalizedCategory}" from Supabase`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
}

/**
 * Check if a category is a default category
 */
export function isDefaultCategory(category: string): boolean {
  return DEFAULT_CATEGORIES.includes(category.toLowerCase());
}

/**
 * Get display name for category (capitalize first letter of each word)
 */
export function getCategoryDisplayName(category: string): string {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}
