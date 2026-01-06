import { supabase } from './supabase';

export type ActivityEntity = 'event' | 'photo' | 'video' | 'lead' | 'review' | 'comment' | 'setting';

export interface ActivityLogInput {
  entityType: ActivityEntity;
  entityId?: string;
  action: string;
  description?: string;
  adminId?: string;
  adminEmail?: string;
}

export function getAdminEmail(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('adminEmail');
  }
  return null;
}

export async function logActivity(entry: ActivityLogInput): Promise<void> {
  try {
    if (!supabase || typeof supabase.from !== 'function') {
      console.warn('Supabase not configured; activity log skipped');
      return;
    }
    
    // Use provided adminEmail or get from localStorage
    const adminEmail = entry.adminEmail || getAdminEmail();
    
    // Check if entityId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUUID = entry.entityId && uuidRegex.test(entry.entityId);
    
    const { error } = await supabase.from('activity_log').insert({
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: isValidUUID ? entry.entityId : null,
      admin_id: entry.adminId || null,
      admin_email: adminEmail,
      details: { 
        description: entry.description || null, 
        adminEmail,
        entityId: entry.entityId || null, // Store non-UUID entity IDs in details
      },
    });
    if (error) {
      console.warn('Activity log insert failed:', error?.message || error);
    } else {
      console.log(`Logged activity: ${entry.action} on ${entry.entityType} ${entry.entityId || ''} by ${adminEmail || 'unknown'}`);
    }
  } catch (err) {
    console.warn('Activity log error:', err);
  }
}
