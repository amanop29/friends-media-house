// Reviews Store - Centralized reviews management with Supabase + localStorage fallback

import { Review, mockReviews } from './mock-data';
import { supabase } from './supabase';

const REVIEWS_KEY = 'reviews';

export type { Review };

export async function getReviews(): Promise<Review[]> {
  if (typeof window === 'undefined') {
    return mockReviews;
  }

  try {
    // Try Supabase first (only if configured)
    if (supabase) {
      console.log('🔵 Fetching reviews from Supabase...');
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📦 Supabase reviews response:', { 
        dataCount: data?.length || 0, 
        error: error ? { message: error.message, code: error.code, hint: error.hint } : null 
      });

      if (!error && data) {
        console.log('✅ Reviews fetched successfully:', data.length, 'reviews');
        return data.map((review: any) => ({
          id: review.id,
          name: review.name,
          email: review.email || '',
          avatar: review.avatar_url || review.avatar_icon || '',
          rating: review.rating,
          text: review.text,
          date: review.submitted_at || review.created_at,
          eventName: review.event_name || '',
          hidden: review.is_hidden || false,
          isApproved: review.is_approved || false,
          isFeatured: review.is_featured || false
        }));
      }

      // Fallback to localStorage if Supabase fails
      console.warn('Supabase query failed, using localStorage:', error);
    }
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(REVIEWS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading reviews:', error);
  }

  // Return empty array instead of mock data for production
  return [];
}

function saveReviewsToLocalStorage(reviews: Review[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    window.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: reviews }));
  } catch (error) {
    console.error('Error saving reviews:', error);
  }
}

export async function addReview(review: Review): Promise<void> {
  console.log('🔵 addReview called with:', { reviewId: review.id, name: review.name });
  console.log('🔵 Supabase client exists?', !!supabase);
  
  try {
    // Try Supabase first (only if configured)
    if (supabase) {
      console.log('🟢 Attempting to save review to Supabase...');
      
      const insertData = {
        name: review.name,
        email: review.email || null,
        rating: review.rating,
        text: review.text,
        event_name: review.eventName || null,
        avatar_url: review.avatar || null,
        is_approved: false, // Reviews need approval
        is_featured: false,
        is_hidden: false,
        submitted_at: new Date().toISOString()
      };
      
      console.log('📦 Insert data:', insertData);
      
      const { error, data } = await supabase
        .from('reviews')
        .insert(insertData);

      if (!error) {
        console.log('✅ Review saved to Supabase successfully!', data);
        window.dispatchEvent(new CustomEvent('reviewsUpdated'));
        return;
      }

      console.error('❌ Supabase insert failed:');
      console.error('Error object:', JSON.stringify(error, null, 2));
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.warn('⚠️ Supabase client not initialized');
    }
  } catch (error: any) {
    console.error('❌ Error saving to Supabase:', error);
  }

  // Fallback to localStorage
  console.log('📦 Falling back to localStorage...');
  const reviews = await getReviews();
  reviews.unshift(review);
  saveReviewsToLocalStorage(reviews);
}

export async function updateReview(updatedReview: Review): Promise<void> {
  try {
    if (supabase) {
      const updateData = {
        name: updatedReview.name,
        email: updatedReview.email || null,
        rating: updatedReview.rating,
        text: updatedReview.text,
        event_name: updatedReview.eventName || null,
        is_hidden: updatedReview.hidden || false
      };

      const { error } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', updatedReview.id);

      if (!error) {
        console.log('✅ Review updated successfully');
        window.dispatchEvent(new CustomEvent('reviewsUpdated'));
        return;
      }
      console.error('❌ Supabase update failed:', error);
    }
  } catch (error) {
    console.error('Error updating review:', error);
  }

  // Fallback to localStorage
  const reviews = await getReviews();
  const index = reviews.findIndex(r => r.id === updatedReview.id);
  if (index !== -1) {
    reviews[index] = updatedReview;
    saveReviewsToLocalStorage(reviews);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  try {
    if (supabase) {
      // First get the review to check if it has an avatar to delete
      const { data: review } = await supabase
        .from('reviews')
        .select('avatar_url')
        .eq('id', reviewId)
        .single();

      // Delete the review from database
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (!error) {
        console.log('✅ Review deleted successfully');
        
        // Delete avatar image from R2 if it exists and is a URL
        if (review?.avatar_url && review.avatar_url.startsWith('http')) {
          try {
            const response = await fetch('/api/upload/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: review.avatar_url }),
            });
            if (response.ok) {
              console.log('✅ Review avatar deleted from R2:', review.avatar_url);
            } else {
              console.warn('⚠️ Failed to delete review avatar from R2:', await response.text());
            }
          } catch (deleteErr) {
            console.warn('⚠️ Error deleting review avatar from R2:', deleteErr);
          }
        }
        
        window.dispatchEvent(new CustomEvent('reviewsUpdated'));
        return;
      }
      console.error('❌ Supabase delete failed:', error);
    }
  } catch (error) {
    console.error('Error deleting review:', error);
  }

  // Fallback to localStorage
  const reviews = await getReviews();
  const filtered = reviews.filter(r => r.id !== reviewId);
  saveReviewsToLocalStorage(filtered);
}

export async function toggleReviewVisibility(reviewId: string): Promise<void> {
  try {
    if (supabase) {
      // First get current state
      const { data: current } = await supabase
        .from('reviews')
        .select('is_hidden')
        .eq('id', reviewId)
        .single();

      if (current) {
        const { error } = await supabase
          .from('reviews')
          .update({ is_hidden: !current.is_hidden })
          .eq('id', reviewId);

        if (!error) {
          console.log('✅ Review visibility toggled');
          window.dispatchEvent(new CustomEvent('reviewsUpdated'));
          return;
        }
        console.error('❌ Supabase toggle failed:', error);
      }
    }
  } catch (error) {
    console.error('Error toggling review visibility:', error);
  }

  // Fallback to localStorage
  const reviews = await getReviews();
  const review = reviews.find(r => r.id === reviewId);
  if (review) {
    review.hidden = !review.hidden;
    saveReviewsToLocalStorage(reviews);
  }
}

export async function approveReview(reviewId: string, approved: boolean = true): Promise<void> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          is_approved: approved,
          approved_at: approved ? new Date().toISOString() : null
        })
        .eq('id', reviewId);

      if (!error) {
        console.log('✅ Review approval status updated');
        window.dispatchEvent(new CustomEvent('reviewsUpdated'));
        return;
      }
      console.error('❌ Supabase approve failed:', error);
    }
  } catch (error) {
    console.error('Error approving review:', error);
  }
}

// Legacy sync functions for backward compatibility
export function saveReviews(reviews: Review[]): void {
  saveReviewsToLocalStorage(reviews);
}
