/**
 * @module org/functions
 * Organization CRUD functions for the MealMe API client.
 *
 * All functions interact with Supabase directly and rely on RLS
 * policies for authorization. The current user's session is used
 * implicitly via the Supabase client.
 */

import { supabase } from '../auth/client';
import type {
  OrgRole,
  OrgWithRole,
  CreateOrgInput,
  UpdateOrgInput,
  OrgResult,
  OrgListResult,
  OrgDeleteResult,
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
// createOrg
// ---------------------------------------------------------------------------

/**
 * Create a new organization and add the creator as an owner.
 *
 * This runs as a single Supabase RPC call (`create_org_with_owner`) to
 * guarantee atomicity. If the RPC function is not yet deployed, it falls
 * back to two sequential inserts (org + membership).
 */
export async function createOrg(
  input: CreateOrgInput,
): Promise<OrgResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { org: null, error: 'Not authenticated' };
  }

  // Try the atomic RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'create_org_with_owner',
    {
      p_name: input.name,
      p_slug: input.slug,
      p_user_id: userId,
    },
  );

  if (!rpcError && rpcData) {
    // RPC returns the org row; map it to OrgWithRole
    const row = rpcData as Record<string, unknown>;
    const org: OrgWithRole = {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      created_at: row.created_at as string,
      role: 'owner',
    };
    return { org, error: null };
  }

  // Fallback: sequential inserts (RPC not deployed yet)
  // 1. Insert the org
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: input.name, slug: input.slug })
    .select('id, name, slug, created_at')
    .single();

  if (orgError) {
    return { org: null, error: mapError(orgError, 'Failed to create organization') };
  }

  // 2. Insert the creator as owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      user_id: userId,
      org_id: orgData.id,
      role: 'owner',
    });

  if (memberError) {
    // Attempt to clean up the org row (best-effort)
    await supabase.from('organizations').delete().eq('id', orgData.id);
    return { org: null, error: mapError(memberError, 'Failed to add creator as owner') };
  }

  const org: OrgWithRole = {
    id: orgData.id,
    name: orgData.name,
    slug: orgData.slug,
    created_at: orgData.created_at,
    role: 'owner',
  };

  return { org, error: null };
}

// ---------------------------------------------------------------------------
// getOrg
// ---------------------------------------------------------------------------

/**
 * Fetch a single organization by ID, including the current user's role.
 *
 * RLS ensures only members can read the org.
 */
export async function getOrg(id: string): Promise<OrgResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { org: null, error: 'Not authenticated' };
  }

  // Fetch the org (RLS filters to membership)
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('id', id)
    .single();

  if (orgError) {
    return { org: null, error: mapError(orgError, 'Organization not found') };
  }

  // Fetch the current user's membership role
  const { data: membershipData, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', userId)
    .single();

  if (membershipError) {
    // The user may not be a member (shouldn't happen if RLS is working)
    return { org: null, error: mapError(membershipError, 'Membership not found') };
  }

  const org: OrgWithRole = {
    id: orgData.id,
    name: orgData.name,
    slug: orgData.slug,
    created_at: orgData.created_at,
    role: membershipData.role as OrgRole,
  };

  return { org, error: null };
}

// ---------------------------------------------------------------------------
// listUserOrgs
// ---------------------------------------------------------------------------

/**
 * List all organizations where the current user is a member,
 * including their role in each.
 */
export async function listUserOrgs(): Promise<OrgListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { orgs: [], error: 'Not authenticated' };
  }

  // Join organizations with the user's memberships
  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, slug, created_at)')
    .eq('user_id', userId);

  if (error) {
    return { orgs: [], error: mapError(error, 'Failed to list organizations') };
  }

  const orgs: OrgWithRole[] = (data ?? [])
    .filter((row: any) => row.organizations)
    .map((row: any) => ({
      id: row.organizations.id,
      name: row.organizations.name,
      slug: row.organizations.slug,
      created_at: row.organizations.created_at,
      role: row.role as OrgRole,
    }));

  return { orgs, error: null };
}

// ---------------------------------------------------------------------------
// updateOrg
// ---------------------------------------------------------------------------

/**
 * Update an organization's name and/or slug.
 *
 * Only admins and owners can update org details (enforced by RLS).
 */
export async function updateOrg(
  id: string,
  input: UpdateOrgInput,
): Promise<OrgResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { org: null, error: 'Not authenticated' };
  }

  // Verify the user is admin+ in this org
  const { data: membershipData, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membershipData) {
    return { org: null, error: 'Not a member of this organization' };
  }

  const role = membershipData.role as OrgRole;
  if (role !== 'owner' && role !== 'admin') {
    return { org: null, error: 'Only admins and owners can update organizations' };
  }

  // Build the update payload (only include defined fields)
  const updates: Record<string, string> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = input.slug;

  if (Object.keys(updates).length === 0) {
    return getOrg(id); // nothing to update, just return current state
  }

  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select('id, name, slug, created_at')
    .single();

  if (orgError) {
    return { org: null, error: mapError(orgError, 'Failed to update organization') };
  }

  const org: OrgWithRole = {
    id: orgData.id,
    name: orgData.name,
    slug: orgData.slug,
    created_at: orgData.created_at,
    role,
  };

  return { org, error: null };
}

// ---------------------------------------------------------------------------
// deleteOrg (soft delete)
// ---------------------------------------------------------------------------

/**
 * Soft-delete an organization by setting `deleted_at`.
 *
 * Only owners can delete an organization. The `deleted_at` column is
 * added via a migration; if it doesn't exist yet, this falls back to
 * a hard delete.
 */
export async function deleteOrg(id: string): Promise<OrgDeleteResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify the user is the owner
  const { data: membershipData, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membershipData) {
    return { success: false, error: 'Not a member of this organization' };
  }

  if (membershipData.role !== 'owner') {
    return { success: false, error: 'Only owners can delete organizations' };
  }

  // Try soft delete first (set deleted_at)
  const { error: softDeleteError } = await supabase
    .from('organizations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (!softDeleteError) {
    return { success: true, error: null };
  }

  // If `deleted_at` column doesn't exist, fall back to hard delete
  if (softDeleteError.message?.includes('deleted_at') ||
      softDeleteError.code === '42703') {
    const { error: hardDeleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (hardDeleteError) {
      return { success: false, error: mapError(hardDeleteError, 'Failed to delete organization') };
    }

    return { success: true, error: null };
  }

  return { success: false, error: mapError(softDeleteError, 'Failed to delete organization') };
}
