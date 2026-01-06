import { supabase } from './supabase';

export type ActivityEntity = 'event' | 'photo' | 'video' | 'lead' | 'review' | 'comment' | 'setting';

export interface ActivityLogInput {
  entityType: ActivityEntity;
  entityId?: string;
  action: string;
  description?: string;
  adminId?: string;
}

export async function logActivity(entry: ActivityLogInput): Promise<void> {
  try {
    if (!supabase || typeof supabase.from !== 'function') {
      console.warn('Supabase not configured; activity log skipped');
      return;
    }
    const { error } = await supabase.from('activity_log').insert({
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      admin_id: entry.adminId || null,
      details: entry.description ? { description: entry.description } : null,
    });
    if (error) {
      console.warn('Activity log insert failed:', error?.message || error);
    } else {
      console.log(`Logged activity: ${entry.action} on ${entry.entityType} ${entry.entityId}`);
    }
  } catch (err) {
    console.warn('Activity log error:', err);
  }
}
