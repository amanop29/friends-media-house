import { TeamMember, mockTeamMembers } from './mock-data';

const TEAM_MEMBERS_KEY = 'team_members';

function mapFromApi(row: any): TeamMember {
  if (!row) return row;

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    specialty: row.specialty || row.specialty_area || '',
    bio: row.bio || row.description || '',
    photoUrl: row.photoUrl || row.photo_url || '',
    photoThumbnailUrl: row.photoThumbnailUrl || row.photo_thumbnail_url || row.thumbnail_url,
    photoKey: row.photoKey || row.photo_key,
    order: row.order ?? row.display_order ?? 0,
    isActive: row.isActive ?? row.is_active ?? true,
    createdAt: row.createdAt || row.created_at,
  };
}

function getLocalTeamMembers(): TeamMember[] {
  if (typeof window === 'undefined') {
    return mockTeamMembers;
  }

  try {
    const stored = localStorage.getItem(TEAM_MEMBERS_KEY);
    if (stored) {
      return JSON.parse(stored) as TeamMember[];
    }
  } catch (error) {
    console.error('Error loading team members from localStorage:', error);
  }

  // Return empty array instead of mock data
  return [];
}

function saveLocalTeamMembers(members: TeamMember[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(members));
    window.dispatchEvent(new CustomEvent('teamUpdated', { detail: members }));
  } catch (error) {
    console.error('Error saving team members to localStorage:', error);
  }
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const response = await fetch('/api/team', { 
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn('Team API responded with', response.status, errorText);
      return getLocalTeamMembers();
    }

    const data = await response.json();
    console.log('Team API response:', data);
    const members = Array.isArray(data?.team) ? data.team : (Array.isArray(data) ? data : []);
    const mapped = (members || []).map(mapFromApi);

    if (typeof window !== 'undefined') {
      saveLocalTeamMembers(mapped);
    }

    return mapped;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return getLocalTeamMembers();
  }
}

export async function createTeamMember(payload: Partial<TeamMember>): Promise<TeamMember | null> {
  try {
    const response = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return mapFromApi(data.team || data);
    }
  } catch (error) {
    console.error('Failed to create team member:', error);
  }

  // Fallback to local storage
  const fallbackMember: TeamMember = {
    id: payload.id || `team-${Date.now()}`,
    name: payload.name || 'Unnamed',
    role: payload.role || '',
    specialty: payload.specialty,
    bio: payload.bio,
    photoUrl: payload.photoUrl || '',
    photoThumbnailUrl: payload.photoThumbnailUrl,
    photoKey: payload.photoKey,
    order: payload.order,
    isActive: payload.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  const current = getLocalTeamMembers();
  saveLocalTeamMembers([...current, fallbackMember]);
  return fallbackMember;
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<boolean> {
  try {
    const response = await fetch(`/api/team?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.error('Failed to update team member:', error);
  }

  // Fallback to local storage update
  const current = getLocalTeamMembers();
  const index = current.findIndex((member) => member.id === id);
  if (index !== -1) {
    current[index] = { ...current[index], ...updates } as TeamMember;
    saveLocalTeamMembers(current);
    return true;
  }

  return false;
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/team?id=${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.error('Failed to delete team member:', error);
  }

  // Fallback to local storage delete
  const current = getLocalTeamMembers();
  const filtered = current.filter((member) => member.id !== id);
  saveLocalTeamMembers(filtered);
  return true;
}
