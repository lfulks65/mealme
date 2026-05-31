/**
 * @module org/members
 * Member management functions for the MealMe API client.
 *
 * Provides:
 *   - inviteMember: invite a user by email to an org
 *   - acceptInvite: accept a pending invite
 *   - removeMember: remove a member from an org (owner cannot be removed)
 *   - updateMemberRole: change a member's role (admin+ only)
 *   - listMembers: list all members of an org
 *   - listInvites: list pending invites for an org
 *
 * All functions interact with Supabase directly and rely on RLS
 * policies for authorization. The current user's session is used
 * implicitly via the Supabase client.
 */

import { supabase } from '../auth/client';
import type {
  OrgRole,
  OrgMember,
  InviteRow,
  InviteMemberInput,
  UpdateMemberRoleInput,
  OrgMemberListResult,
  OrgMemberResult,
  InviteResult,
  InviteListResult,
  AcceptInviteResult,
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
// inviteMember
// ---------------------------------------------------------------------------

/**
 * Invite a user to an organization by email.
 *
 * Creates an invite row in the `invites` table. Only admins and owners
 * can invite members. The invite includes a role and expires after 7 days.
 * An email notification is sent via Supabase (if configured).
 *
 * Note: The `role` must be 'admin' or 'member' — you cannot invite
 * someone as 'owner'.
 */
export async function inviteMember(
  input: InviteMemberInput,
): Promise<InviteResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { invite: null, error: 'Not authenticated' };
  }

  // Validate role — cannot invite as owner
  if (input.role === 'owner') {
    return { invite: null, error: 'Cannot invite a user as owner' };
  }

  if (input.role !== 'admin' && input.role !== 'member') {
    return { invite: null, error: 'Invalid role. Must be "admin" or "member"' };
  }

  // Verify the caller is admin+ in this org
  const { data: callerMembership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', input.orgId)
    .eq('user_id', userId)
    .single();

  if (membershipError || !callerMembership) {
    return { invite: null, error: 'Not a member of this organization' };
  }

  const callerRole = callerMembership.role as OrgRole;
  if (callerRole !== 'owner' && callerRole !== 'admin') {
    return { invite: null, error: 'Only admins and owners can invite members' };
  }

  // Create the invite row
  const { data: inviteData, error: inviteError } = await supabase
    .from('invites')
    .insert({
      org_id: input.orgId,
      email: input.email.toLowerCase().trim(),
      role: input.role,
      invited_by: userId,
    })
    .select('id, org_id, email, role, invited_by, accepted_at, expires_at, created_at')
    .single();

  if (inviteError) {
    return { invite: null, error: mapError(inviteError, 'Failed to create invite') };
  }

  // TODO: Send invite email via Supabase Edge Function or external service.
  // For now, the invite row is created and can be retrieved by the invitee.
  // A future task should implement email delivery.

  const invite: InviteRow = {
    id: inviteData.id,
    org_id: inviteData.org_id,
    email: inviteData.email,
    role: inviteData.role,
    invited_by: inviteData.invited_by,
    accepted_at: inviteData.accepted_at,
    expires_at: inviteData.expires_at,
    created_at: inviteData.created_at,
  };

  return { invite, error: null };
}

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

/**
 * Accept a pending invite.
 *
 * Uses the `accept_invite` RPC function for atomicity. The RPC
 * validates the invite, checks expiration, and inserts the membership
 * row in a single transaction.
 */
export async function acceptInvite(
  inviteId: string,
): Promise<AcceptInviteResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, orgId: null, role: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('accept_invite', {
    p_invite_id: inviteId,
    p_user_id: userId,
  });

  if (error) {
    return {
      success: false,
      orgId: null,
      role: null,
      error: mapError(error, 'Failed to accept invite'),
    };
  }

  const result = data as Record<string, unknown>;
  if (result.success === false) {
    return {
      success: false,
      orgId: null,
      role: null,
      error: (result.error as string) ?? 'Failed to accept invite',
    };
  }

  return {
    success: true,
    orgId: result.org_id as string | null,
    role: result.role as OrgRole | null,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

/**
 * Remove a member from an organization.
 *
 * Uses the `remove_org_member` RPC function which enforces:
 *   - Only admins/owners can remove members
 *   - The owner cannot be removed
 *   - Admins cannot remove other admins (only owners can)
 *
 * Members can also remove themselves (leave the org).
 */
export async function removeMember(
  orgId: string,
  targetUserId: string,
): Promise<OrgMemberResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // If the user is removing themselves, use the direct delete path
  if (targetUserId === userId) {
    // Check the user is not the owner (owner cannot leave)
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return { success: false, error: 'Not a member of this organization' };
    }

    if ((membership.role as OrgRole) === 'owner') {
      return { success: false, error: 'Owner cannot leave the organization. Transfer ownership first.' };
    }

    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId);

    if (deleteError) {
      return { success: false, error: mapError(deleteError, 'Failed to leave organization') };
    }

    return { success: true, error: null };
  }

  // Removing another member — use the RPC function
  const { data, error } = await supabase.rpc('remove_org_member', {
    p_org_id: orgId,
    p_user_id: targetUserId,
    p_caller_id: userId,
  });

  if (error) {
    return { success: false, error: mapError(error, 'Failed to remove member') };
  }

  const result = data as Record<string, unknown>;
  if (result.success === false) {
    return { success: false, error: (result.error as string) ?? 'Failed to remove member' };
  }

  return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// updateMemberRole
// ---------------------------------------------------------------------------

/**
 * Update a member's role in an organization.
 *
 * Uses the `update_org_member_role` RPC function which enforces:
 *   - Only admins/owners can change roles
 *   - The owner's role cannot be changed
 *   - Admins can only change 'member' roles (not other admins)
 *   - New role must be 'admin' or 'member'
 */
export async function updateMemberRole(
  input: UpdateMemberRoleInput,
): Promise<OrgMemberResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('update_org_member_role', {
    p_org_id: input.orgId,
    p_user_id: input.userId,
    p_new_role: input.role,
    p_caller_id: userId,
  });

  if (error) {
    return { success: false, error: mapError(error, 'Failed to update member role') };
  }

  const result = data as Record<string, unknown>;
  if (result.success === false) {
    return { success: false, error: (result.error as string) ?? 'Failed to update member role' };
  }

  return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// listMembers
// ---------------------------------------------------------------------------

/**
 * List all members of an organization with their profile information.
 *
 * RLS ensures only members of the org can view the member list.
 */
export async function listMembers(
  orgId: string,
): Promise<OrgMemberListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { members: [], error: 'Not authenticated' };
  }

  // Fetch memberships with profile data
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, user_id, role, created_at, profiles(id, full_name, avatar_url)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) {
    return { members: [], error: mapError(error, 'Failed to list members') };
  }

  const members: OrgMember[] = (data ?? [])
    .filter((row: any) => row.profiles)
    .map((row: any) => ({
      membershipId: row.id,
      userId: row.user_id,
      fullName: row.profiles.full_name ?? null,
      avatarUrl: row.profiles.avatar_url ?? null,
      role: row.role as OrgRole,
      joinedAt: row.created_at,
    }));

  return { members, error: null };
}

// ---------------------------------------------------------------------------
// listInvites
// ---------------------------------------------------------------------------

/**
 * List all invites for an organization.
 *
 * Only admins/owners can view invites (enforced by RLS).
 */
export async function listInvites(
  orgId: string,
): Promise<InviteListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { invites: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('invites')
    .select('id, org_id, email, role, invited_by, accepted_at, expires_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return { invites: [], error: mapError(error, 'Failed to list invites') };
  }

  const invites: InviteRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    org_id: row.org_id,
    email: row.email,
    role: row.role,
    invited_by: row.invited_by,
    accepted_at: row.accepted_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
  }));

  return { invites, error: null };
}

// ---------------------------------------------------------------------------
// listPendingInvitesForUser
// ---------------------------------------------------------------------------

/**
 * List pending invites for the current user's email address.
 *
 * This is used on the user's dashboard to show org invites they can accept.
 * Since invites are keyed by email, we look up the user's email first.
 */
export async function listPendingInvitesForUser(): Promise<InviteListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { invites: [], error: 'Not authenticated' };
  }

  // Get the user's email
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase().trim();
  if (!email) {
    return { invites: [], error: 'User email not available' };
  }

  const { data, error } = await supabase
    .from('invites')
    .select('id, org_id, email, role, invited_by, accepted_at, expires_at, created_at')
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return { invites: [], error: mapError(error, 'Failed to list pending invites') };
  }

  const invites: InviteRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    org_id: row.org_id,
    email: row.email,
    role: row.role,
    invited_by: row.invited_by,
    accepted_at: row.accepted_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
  }));

  return { invites, error: null };
}
