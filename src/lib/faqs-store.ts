// FAQs Store - Centralized FAQs management with Supabase integration

import { FAQ, mockFAQs } from './mock-data';
import { supabaseAdmin } from './supabase';

const FAQS_KEY = 'faqs';

// Get FAQs from Supabase (server-side) or localStorage (fallback)
export async function getFAQsFromSupabase(): Promise<FAQ[]> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured, using localStorage');
    return getFAQs();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Map database fields to FAQ interface
    return data?.map((faq: { id: string; question: string; answer: string; category?: string; display_order?: number }) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'general',
      order: faq.display_order || 0,
    })) || [];
  } catch (error) {
    console.error('Error fetching FAQs from Supabase:', error);
    return getFAQs(); // Fallback to localStorage
  }
}

export function getFAQs(): FAQ[] {
  if (typeof window === 'undefined') {
    return mockFAQs;
  }

  try {
    const stored = localStorage.getItem(FAQS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading FAQs:', error);
  }

  // Initialize with mock FAQs if nothing stored
  localStorage.setItem(FAQS_KEY, JSON.stringify(mockFAQs));
  return mockFAQs;
}

export function saveFAQs(faqs: FAQ[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(FAQS_KEY, JSON.stringify(faqs));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('faqsUpdated', { detail: faqs }));
  } catch (error) {
    console.error('Error saving FAQs:', error);
  }
}

export async function addFAQ(faq: FAQ): Promise<void> {
  // Add to Supabase
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('faqs')
        .insert({
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          display_order: faq.order || 0,
          is_active: true,
        });

      if (error) {
        console.error('Supabase FAQ insert error:', error);
        throw error;
      }
      
      console.log('FAQ added to Supabase successfully');
      
      // Also update localStorage
      const faqs = getFAQs();
      faqs.push(faq);
      saveFAQs(faqs);
      
      // Dispatch event to refresh UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('faqsUpdated'));
      }
      
      return;
    } catch (error) {
      console.error('Error adding FAQ to Supabase:', error);
      // Continue to localStorage fallback
    }
  }

  // Fallback to localStorage only
  const faqs = getFAQs();
  faqs.push(faq);
  saveFAQs(faqs);
}

export async function updateFAQ(faqId: string, updates: Partial<FAQ>): Promise<void> {
  // Update in Supabase
  if (supabaseAdmin) {
    try {
      const updateData: any = {};
      if (updates.question) updateData.question = updates.question;
      if (updates.answer) updateData.answer = updates.answer;
      if (updates.category) updateData.category = updates.category;
      if (updates.order !== undefined) updateData.display_order = updates.order;

      const { error } = await supabaseAdmin
        .from('faqs')
        .update(updateData)
        .eq('id', faqId);

      if (error) throw error;

      // Also update localStorage
      const faqs = getFAQs();
      const index = faqs.findIndex(f => f.id === faqId);
      if (index !== -1) {
        faqs[index] = { ...faqs[index], ...updates };
        saveFAQs(faqs);
      }
      
      return;
    } catch (error) {
      console.error('Error updating FAQ in Supabase:', error);
    }
  }

  // Fallback to localStorage only
  const faqs = getFAQs();
  const index = faqs.findIndex(f => f.id === faqId);
  if (index !== -1) {
    faqs[index] = { ...faqs[index], ...updates };
    saveFAQs(faqs);
  }
}

export async function deleteFAQ(faqId: string): Promise<void> {
  // Delete from Supabase
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('faqs')
        .delete()
        .eq('id', faqId);

      if (error) throw error;

      // Also update localStorage
      const faqs = getFAQs();
      const filtered = faqs.filter(f => f.id !== faqId);
      saveFAQs(filtered);
      
      return;
    } catch (error) {
      console.error('Error deleting FAQ from Supabase:', error);
    }
  }

  // Fallback to localStorage only
  const faqs = getFAQs();
  const filtered = faqs.filter(f => f.id !== faqId);
  saveFAQs(filtered);
}

export async function toggleFAQVisibility(faqId: string): Promise<void> {
  if (supabaseAdmin) {
    try {
      // Get current status
      const { data: faq, error: fetchError } = await supabaseAdmin
        .from('faqs')
        .select('is_active')
        .eq('id', faqId)
        .single();

      if (fetchError) throw fetchError;

      // Toggle
      const { error: updateError } = await supabaseAdmin
        .from('faqs')
        .update({ is_active: !faq.is_active })
        .eq('id', faqId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error toggling FAQ visibility:', error);
    }
  }
}