/**
 * Category Mapping Store
 * Maps Supabase event IDs to their custom category names
 * This is needed because Supabase uses an enum for categories,
 * but we allow custom categories in the UI
 */

const CATEGORY_MAPPING_KEY = 'fmh_category_mapping';

export interface CategoryMapping {
  [eventId: string]: string; // eventId -> custom category slug
}

/**
 * Get the category mapping from localStorage
 */
export function getCategoryMapping(): CategoryMapping {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(CATEGORY_MAPPING_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading category mapping:', error);
    return {};
  }
}

/**
 * Set custom category for an event
 */
export function setEventCustomCategory(eventId: string, customCategory: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const mapping = getCategoryMapping();
    mapping[eventId] = customCategory;
    localStorage.setItem(CATEGORY_MAPPING_KEY, JSON.stringify(mapping));
  } catch (error) {
    console.error('Error saving category mapping:', error);
  }
}

/**
 * Get custom category for an event
 * Returns null if no custom category is set
 */
export function getEventCustomCategory(eventId: string): string | null {
  const mapping = getCategoryMapping();
  return mapping[eventId] || null;
}

/**
 * Check if a category is a standard enum category
 */
export function isStandardCategory(category: string): boolean {
  const standardCategories = [
    'wedding',
    'pre-wedding', 
    'engagement',
    'reception',
    'jainism',
    'birthday',
    'corporate',
    'event',
    'film',
  ];
  
  return standardCategories.includes(category.toLowerCase());
}

/**
 * Remove custom category mapping for an event
 */
export function removeEventCustomCategory(eventId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const mapping = getCategoryMapping();
    delete mapping[eventId];
    localStorage.setItem(CATEGORY_MAPPING_KEY, JSON.stringify(mapping));
  } catch (error) {
    console.error('Error removing category mapping:', error);
  }
}
