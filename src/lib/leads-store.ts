// Leads Store - Centralized leads management with Supabase + localStorage fallback

import { Lead, mockLeads } from './mock-data';
import { supabase } from './supabase';

const LEADS_KEY = 'leads';

export async function getLeads(): Promise<Lead[]> {
  if (typeof window === 'undefined') {
    return mockLeads;
  }

  try {
    // Try Supabase first (only if configured)
    if (supabase) {
      console.log('🔵 Fetching leads from Supabase...');
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📦 Supabase leads response:', { 
        dataCount: data?.length || 0, 
        error: error ? { message: error.message, code: error.code, hint: error.hint } : null 
      });

      if (!error && data) {
        console.log('✅ Leads fetched successfully:', data.length, 'leads');
        return data.map((lead: any) => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone || '',
          message: lead.message,
          eventType: lead.event_type || '',
          date: lead.event_date || '',
          status: lead.status,
          priority: lead.priority === 'normal' ? 'medium' : (lead.priority || 'medium'),
          source: lead.source || 'website',
          notes: lead.notes || '',
          createdAt: lead.created_at,
          submittedAt: lead.submitted_at || lead.created_at
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
    const stored = localStorage.getItem(LEADS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading leads:', error);
  }

  // Return empty array instead of mock data for production
  return [];
}

function saveLeadsToLocalStorage(leads: Lead[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    window.dispatchEvent(new CustomEvent('leadsUpdated', { detail: leads }));
  } catch (error) {
    console.error('Error saving leads:', error);
  }
}

export async function addLead(lead: Lead): Promise<void> {
  console.log('🔵 addLead called with:', { leadId: lead.id, name: lead.name, email: lead.email });
  console.log('🔵 Supabase client exists?', !!supabase);
  
  // Map priority to valid database values: 'low', 'normal', 'high', 'urgent'
  const mapPriority = (p?: string): string => {
    if (!p) return 'normal';
    if (p === 'medium') return 'normal';
    if (['low', 'normal', 'high', 'urgent'].includes(p)) return p;
    return 'normal';
  };

  // Map event type to valid database values: 'wedding', 'pre-wedding', 'event', 'film', 'other'
  const mapEventType = (e?: string): string | null => {
    if (!e) return null;
    const validTypes = ['wedding', 'pre-wedding', 'event', 'film', 'other'];
    if (validTypes.includes(e)) return e;
    // Map common variations
    if (e.toLowerCase().includes('wedding')) return 'wedding';
    if (e.toLowerCase().includes('pre-wedding') || e.toLowerCase().includes('prewedding')) return 'pre-wedding';
    return 'other';
  };

  try {
    // Try Supabase first (only if configured)
    if (supabase) {
      console.log('🟢 Attempting to save to Supabase...');
      
      const insertData = {
        // Don't send id - let Supabase auto-generate UUID
        name: lead.name,
        email: lead.email,
        phone: lead.phone || null,
        message: lead.message,
        event_type: mapEventType(lead.eventType),
        event_date: lead.date || null,
        status: lead.status || 'new',
        priority: mapPriority(lead.priority),
        source: lead.source || 'website',
        notes: lead.notes || null,
        submitted_at: new Date().toISOString()
      };
      
      console.log('📦 Insert data:', insertData);
      
      const { error, data } = await supabase
        .from('leads')
        .insert(insertData);

      if (!error) {
        console.log('✅ Lead saved to Supabase successfully!', data);
        window.dispatchEvent(new CustomEvent('leadsUpdated'));
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
    console.error('Exception details:', error?.message, error?.stack);
  }

  // Fallback to localStorage
  const leads = await getLeads();
  leads.unshift(lead);
  saveLeadsToLocalStorage(leads);
}

export async function updateLead(updatedLead: Lead): Promise<void> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('leads')
      .update({
        name: updatedLead.name,
        email: updatedLead.email,
        phone: updatedLead.phone,
        message: updatedLead.message,
        event_interest: updatedLead.eventType,
        event_date: updatedLead.date,
        status: updatedLead.status,
        priority: updatedLead.priority,
        notes: updatedLead.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedLead.id);

    if (!error) {
        window.dispatchEvent(new CustomEvent('leadsUpdated'));
        return;
      }
      console.warn('Supabase update failed:', error);
    }
  } catch (error) {
    console.error('Error updating in Supabase:', error);
  }

  // Fallback
  const leads = await getLeads();
  const index = leads.findIndex(l => l.id === updatedLead.id);
  if (index !== -1) {
    leads[index] = updatedLead;
    saveLeadsToLocalStorage(leads);
  }
}

export async function deleteLead(leadId: string): Promise<void> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('leads')
      .delete()
      .eq('id', leadId);

    if (!error) {
        window.dispatchEvent(new CustomEvent('leadsUpdated'));
        return;
      }
      console.warn('Supabase delete failed:', error);
    }
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
  }

  // Fallback
  const leads = await getLeads();
  const filtered = leads.filter(l => l.id !== leadId);
  saveLeadsToLocalStorage(filtered);
}

export async function updateLeadStatus(leadId: string, status: Lead['status']): Promise<void> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (!error) {
        window.dispatchEvent(new CustomEvent('leadsUpdated'));
        return;
      }
      console.warn('Supabase status update failed:', error);
    }
  } catch (error) {
    console.error('Error updating status in Supabase:', error);
  }

  // Fallback
  const leads = await getLeads();
  const lead = leads.find(l => l.id === leadId);
  if (lead) {
    lead.status = status;
    saveLeadsToLocalStorage(leads);
  }
}

export async function updateLeadNotes(leadId: string, notes: string): Promise<void> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('leads')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (!error) {
        window.dispatchEvent(new CustomEvent('leadsUpdated'));
        return;
      }
      console.warn('Supabase notes update failed:', error);
    }
  } catch (error) {
    console.error('Error updating notes in Supabase:', error);
  }

  // Fallback
  const leads = await getLeads();
  const lead = leads.find(l => l.id === leadId);
  if (lead) {
    lead.notes = notes;
    saveLeadsToLocalStorage(leads);
  }
}
