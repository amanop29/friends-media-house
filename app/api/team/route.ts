import { NextRequest, NextResponse } from 'next/server';
import { deleteFromR2, isR2Available } from '@/lib/r2-storage';
import { supabaseAdmin, supabase, TeamMember as DbTeamMember } from '@/lib/supabase';
import { mockTeamMembers } from '@/lib/mock-data';

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    specialty: row.specialty,
    bio: row.bio,
    photoUrl: row.photo_url,
    photoThumbnailUrl: row.photo_thumbnail_url,
    photoKey: row.photo_key,
    order: row.display_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

function deriveR2KeyFromUrl(url?: string | null) {
  if (!url) return null;
  const base = (process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!base || !url.startsWith(base)) return null;
  return url.substring(base.length + 1);
}

// GET /api/team - public list of active team members
export async function GET(request: NextRequest) {
  const client = supabase || supabaseAdmin;
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('includeInactive') === 'true';

  console.log('GET /api/team - includeInactive:', includeInactive);

  if (!client) {
    console.warn('Supabase not configured, returning mock data');
    return NextResponse.json({ team: mockTeamMembers, source: 'mock' });
  }

  try {
    let query = client
      .from('team_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch team members:', error);
      return NextResponse.json({ team: mockTeamMembers, source: 'fallback', error: error.message });
    }

    console.log('Team members fetched successfully:', data?.length || 0);
    return NextResponse.json({ team: (data || []).map(mapRow) });
  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({ team: mockTeamMembers, source: 'fallback' });
  }
}

// POST /api/team - create team member
export async function POST(request: NextRequest) {
  console.log('POST /api/team - Creating team member');
  
  if (!supabaseAdmin) {
    console.error('Supabase admin not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await request.json();
  console.log('Request body:', body);
  
  const { name, role, specialty, bio, photoUrl, photoThumbnailUrl, photoKey, order, isActive } = body;

  if (!name || !role || !photoUrl) {
    console.error('Missing required fields:', { name: !!name, role: !!role, photoUrl: !!photoUrl });
    return NextResponse.json({ error: 'Name, role, and photo are required' }, { status: 400 });
  }

  const payload: Partial<DbTeamMember> = {
    name,
    role,
    specialty,
    bio,
    photo_url: photoUrl,
    photo_thumbnail_url: photoThumbnailUrl || null,
    photo_key: photoKey || deriveR2KeyFromUrl(photoUrl) || null,
    display_order: typeof order === 'number' ? order : 0,
    is_active: isActive ?? true,
  };

  console.log('Inserting into Supabase:', payload);

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Failed to create team member:', error);
    return NextResponse.json({ error: 'Failed to create team member', details: error.message }, { status: 500 });
  }

  console.log('Team member created successfully:', data.id);
  return NextResponse.json({ team: mapRow(data) });
}

// PATCH /api/team?id=... - update team member
export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Team member ID is required' }, { status: 400 });
  }

  const body = await request.json();
  const { name, role, specialty, bio, photoUrl, photoThumbnailUrl, photoKey, order, isActive } = body;

  if (!name && !role && !specialty && !bio && !photoUrl && !photoThumbnailUrl && photoKey === undefined && order === undefined && isActive === undefined) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  // Fetch existing to clean up old R2 asset if photo changes
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('team_members')
    .select('photo_url, photo_key')
    .eq('id', id)
    .single();

  if (existingError) {
    console.error('Failed to load existing team member:', existingError);
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (role) updateData.role = role;
  if (specialty !== undefined) updateData.specialty = specialty;
  if (bio !== undefined) updateData.bio = bio;
  if (photoUrl) updateData.photo_url = photoUrl;
  if (photoThumbnailUrl !== undefined) updateData.photo_thumbnail_url = photoThumbnailUrl;
  if (photoKey !== undefined) {
    updateData.photo_key = photoKey;
  } else if (photoUrl) {
    updateData.photo_key = deriveR2KeyFromUrl(photoUrl) || null;
  }
  if (order !== undefined) updateData.display_order = order;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update team member:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }

  // Delete old asset if photo changed and R2 is configured
  if (isR2Available() && photoUrl && existing?.photo_url && existing.photo_url !== photoUrl) {
    const keyToDelete = existing.photo_key || deriveR2KeyFromUrl(existing.photo_url);
    if (keyToDelete) {
      try {
        await deleteFromR2(keyToDelete);
      } catch (deleteError) {
        console.warn('Failed to delete old team photo from R2:', deleteError);
      }
    }
  }

  return NextResponse.json({ team: mapRow(data) });
}

// DELETE /api/team?id=... - delete team member and clean up image
export async function DELETE(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Team member ID is required' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('team_members')
    .select('photo_key, photo_url')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete team member:', error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }

  if (isR2Available() && existing) {
    const key = existing.photo_key || deriveR2KeyFromUrl(existing.photo_url);
    if (key) {
      try {
        await deleteFromR2(key);
      } catch (deleteError) {
        console.warn('Failed to delete team photo from R2:', deleteError);
      }
    }
  }

  return NextResponse.json({ success: true });
}
