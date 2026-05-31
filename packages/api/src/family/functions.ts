/**
 * @module family/functions
 * Family CRUD functions for the MealMe API client.
 *
 * All functions interact with Supabase directly and rely on RLS
 * policies for authorization. The current user's session is used
 * implicitly via the Supabase client.
 */

import { supabase } from '../auth/client';
import type {
  FamilyRole,
  FamilyWithRole,
  FamilyMember,
  CreateFamilyInput,
  UpdateFamilyInput,
  AddFamilyMemberInput,
  UpdateFamilyMemberRoleInput,
  FamilyResult,
  FamilyListResult,
  FamilyDeleteResult,
  FamilyMemberListResult,
  FamilyMemberResult,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the currently authenticated user's ID, or null if not signed in. */
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Map a Supabase error to a user-friendly string. */
function mapError(error: { message?: string }, fallback: string): string {
  return error.message ?? fallback;
}

// ---------------------------------------------------------------------------
// createFamily
// ---------------------------------------------------------------------------

/**
 * Create a new family and add the creator as owner.
 *
 * This runs as a single Supabase RPC call (`create_family_with_owner`) to
 * guarantee atomicity. If the RPC function is not yet deployed, it falls
 * back to two sequential inserts (family + membership).
 */
export async function createFamily(
  input: CreateFamilyInput,
): Promise<FamilyResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { family: null, error: 'Not authenticated' };
  }

  // Try the atomic RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'create_family_with_owner',
    {
      p_name: input.name,
      p_org_id: input.orgId,
      p_user_id: userId,
    },
  );

  if (!rpcError && rpcData) {
    const row = rpcData as Record<string, unknown>;
    const family: FamilyWithRole = {
      id: row.id as string,
      name: row.name as string,
      org_id: row.org_id as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: (row.deleted_at as string) ?? null,
      role: 'owner',
    };
    return { family, error: null };
  }

  // Fallback: sequential inserts (RPC not deployed yet)
  // 1. Insert the family
  const { data: familyData, error: familyError } = await supabase
    .from('families')
    .insert({ name: input.name, org_id: input.orgId })
    .select('id, name, org_id, created_at, updated_at, deleted_at')
    .single();

  if (familyError) {
    return { family: null, error: mapError(familyError, 'Failed to create family') };
  }

  // 2. Insert the creator as owner
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      user_id: userId,
      family_id: familyData.id,
      role: 'owner',
    });

  if (memberError) {
    // Attempt to clean up the family row (best-effort)
    await supabase.from('families').delete().eq('id', familyData.id);
    return { family: null, error: mapError(memberError, 'Failed to add creator as owner') };
  }

  const family: FamilyWithRole = {
    id: familyData.id,
    name: familyData.name,
    org_id: familyData.org_id,
    created_at: familyData.created_at,
    updated_at: familyData.updated_at,
    deleted_at: familyData.deleted_at,
    role: 'owner',
  };

  return { family, error: null };
}

// ---------------------------------------------------------------------------
// getFamily
// ---------------------------------------------------------------------------

/**
 * Fetch a single family by ID, including the current user's role.
 *
 * RLS ensures only org members can read the family.
 */
export async function getFamily(id: string): Promise<FamilyResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { family: null, error: 'Not authenticated' };
  }

  // Fetch the family (RLS filters to org membership)
  const { data: familyData, error: familyError } = await supabase
    .from('families')
    .select('id, name, org_id, created_at, updated_at, deleted_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (familyError) {
    return { family: null, error: mapError(familyError, 'Family not found') };
  }

  // Fetch the current user's membership role
  const { data: membershipData, error: membershipError } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', id)
    .eq('user_id', userId)
    .single();

  if (membershipError) {
    // The user may not be a member but can still view (if in same org)
    const family: FamilyWithRole = {
      ...familyData,
      role: 'member' as FamilyRole,
    };
    return { family, error: null };
  }

  const family: FamilyWithRole = {
    ...familyData,
    role: membershipData.role as FamilyRole,
  };

  return { family, error: null };
}

// ---------------------------------------------------------------------------
// listFamilies
// ---------------------------------------------------------------------------

/**
 * List all families in a given organization where the current user
 * is a member, including their role in each.
 */
export async function listFamilies(orgId: string): Promise<FamilyListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { families: [], error: 'Not authenticated' };
  }

  // Join families with the user's memberships
  const { data, error } = await supabase
    .from('family_members')
    .select('role, families(id, name, org_id, created_at, updated_at, deleted_at)')
    .eq('user_id', userId)
    .is('families.deleted_at', null);

  if (error) {
    return { families: [], error: mapError(error, 'Failed to list families') };
  }

  const families: FamilyWithRole[] = (data ?? [])
    .filter((row: any) => row.families && row.families.org_id === orgId)
    .map((row: any) => ({
      id: row.families.id,
      name: row.families.name,
      org_id: row.families.org_id,
      created_at: row.families.created_at,
      updated_at: row.families.updated_at,
      deleted_at: row.families.deleted_at,
      role: row.role as FamilyRole,
    }));

  return { families, error: null };
}

// ---------------------------------------------------------------------------
// updateFamily
// ---------------------------------------------------------------------------

/**
 * Update a family's name.
 *
 * Only family owners/parents/guardians or org admins can update family
 * details (enforced by RLS).
 */
export async function updateFamily(
  id: string,
  input: UpdateFamilyInput,
): Promise<FamilyResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { family: null, error: 'Not authenticated' };
  }

  // Build the update payload (only include defined fields)
  const updates: Record<string, string> = {};
  if (input.name !== undefined) updates.name = input.name;

  if (Object.keys(updates).length === 0) {
    return getFamily(id); // nothing to update, just return current state
  }

  const { data: familyData, error: familyError } = await supabase
    .from('families')
    .update(updates)
    .eq('id', id)
    .select('id, name, org_id, created_at, updated_at, deleted_at')
    .single();

  if (familyError) {
    return { family: null, error: mapError(familyError, 'Failed to update family') };
  }

  // Fetch the user's role
  const { data: membershipData } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', id)
    .eq('user_id', userId)
    .single();

  const family: FamilyWithRole = {
    ...familyData,
    role: (membershipData?.role ?? 'member') as FamilyRole,
  };

  return { family, error: null };
}

// ---------------------------------------------------------------------------
// deleteFamily (soft delete)
// ---------------------------------------------------------------------------

/**
 * Soft-delete a family by setting `deleted_at`.
 *
 * Only family owners or org owners can delete a family.
 */
export async function deleteFamily(id: string): Promise<FamilyDeleteResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Try soft delete first (set deleted_at)
  const { error: softDeleteError } = await supabase
    .from('families')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (!softDeleteError) {
    return { success: true, error: null };
  }

  // If `deleted_at` column doesn't exist, fall back to hard delete
  if (softDeleteError.message?.includes('deleted_at') ||
      softDeleteError.code === '42703') {
    const { error: hardDeleteError } = await supabase
      .from('families')
      .delete()
      .eq('id', id);

    if (hardDeleteError) {
      return { success: false, error: mapError(hardDeleteError, 'Failed to delete family') };
    }

    return { success: true, error: null };
  }

  return { success: false, error: mapError(softDeleteError, 'Failed to delete family') };
}

// ---------------------------------------------------------------------------
// addFamilyMember
// ---------------------------------------------------------------------------

/**
 * Add a user to a family with the specified role.
 *
 * Only family owners/parents/guardians or org admins can add members
 * (enforced by RLS).
 */
export async function addFamilyMember(
  input: AddFamilyMemberInput,
): Promise<FamilyMemberResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('family_members')
    .insert({
      user_id: input.userId,
      family_id: input.familyId,
      role: input.role ?? 'member',
    });

  if (error) {
    return { success: false, error: mapError(error, 'Failed to add family member') };
  }

  return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// removeFamilyMember
// ---------------------------------------------------------------------------

/**
 * Remove a user from a family.
 *
 * Family owners/parents/guardians or org admins can remove any member.
 * Users can also remove themselves.
 */
export async function removeFamilyMember(
  familyId: string,
  memberUserId: string,
): Promise<FamilyMemberResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', memberUserId);

  if (error) {
    return { success: false, error: mapError(error, 'Failed to remove family member') };
  }

  return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// updateFamilyMemberRole
// ---------------------------------------------------------------------------

/**
 * Update a family member's role.
 *
 * Only family owners/parents/guardians or org admins can update roles
 * (enforced by RLS).
 */
export async function updateFamilyMemberRole(
  input: UpdateFamilyMemberRoleInput,
): Promise<FamilyMemberResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('family_members')
    .update({ role: input.role })
    .eq('family_id', input.familyId)
    .eq('user_id', input.userId);

  if (error) {
    return { success: false, error: mapError(error, 'Failed to update member role') };
  }

  return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// listFamilyMembers
// ---------------------------------------------------------------------------

/**
 * List all members of a family with their profile information.
 */
export async function listFamilyMembers(
  familyId: string,
): Promise<FamilyMemberListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { members: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('family_members')
    .select('id, user_id, role, created_at, profiles(id, full_name, avatar_url)')
    .eq('family_id', familyId);

  if (error) {
    return { members: [], error: mapError(error, 'Failed to list family members') };
  }

  const members: FamilyMember[] = (data ?? []).map((row: any) => ({
    membershipId: row.id,
    userId: row.user_id,
    fullName: row.profiles?.full_name ?? null,
    avatarUrl: row.profiles?.avatar_url ?? null,
    role: row.role as FamilyRole,
    joinedAt: row.created_at,
  }));

  return { members, error: null };
}
