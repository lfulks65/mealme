import { supabase } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  default_org_id: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string;
  default_org_id?: string | null;
}

export interface ProfileResult {
  profile: Profile | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// getProfile – fetch a single profile by user id
// ---------------------------------------------------------------------------

export async function getProfile(userId?: string): Promise<ProfileResult> {
  const targetId = userId ?? (await getCurrentUserId());

  if (!targetId) {
    return { profile: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, default_org_id, created_at')
    .eq('id', targetId)
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data as Profile, error: null };
}

// ---------------------------------------------------------------------------
// updateProfile – update the current user's own profile
// ---------------------------------------------------------------------------

export async function updateProfile(
  updates: ProfileUpdate,
): Promise<ProfileResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { profile: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, full_name, avatar_url, default_org_id, created_at')
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data as Profile, error: null };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
