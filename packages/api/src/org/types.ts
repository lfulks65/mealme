/**
 * @module org/types
 * Organization domain types for the MealMe API client.
 *
 * These types mirror the Supabase `organizations` and `organization_members`
 * tables and provide input/result wrappers for the CRUD functions.
 */

// ---------------------------------------------------------------------------
// Database row types (match Supabase schema exactly)
// ---------------------------------------------------------------------------

/** Row from the `organizations` table. */
export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

/** Row from the `organization_members` table. */
export interface OrgMemberRow {
  id: string;
  user_id: string;
  org_id: string;
  role: OrgRole;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Role a user may hold within an organization. */
export type OrgRole = 'owner' | 'admin' | 'member';

/**
 * An organization with its current user's membership role.
 * Returned by getOrg / listUserOrgs so consumers know the user's role.
 */
export interface OrgWithRole extends OrgRow {
  /** The current user's role in this org. */
  role: OrgRole;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for creating a new organization. */
export interface CreateOrgInput {
  name: string;
  slug: string;
}

/** Payload for updating an existing organization. */
export interface UpdateOrgInput {
  name?: string;
  slug?: string;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result wrapper for single-org operations. */
export interface OrgResult {
  org: OrgWithRole | null;
  error: string | null;
}

/** Result wrapper for list operations. */
export interface OrgListResult {
  orgs: OrgWithRole[];
  error: string | null;
}

/** Result wrapper for delete operations. */
export interface OrgDeleteResult {
  success: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Member & Invite types
// ---------------------------------------------------------------------------

/** Row from the `invites` table. */
export interface InviteRow {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * An org member with profile information.
 * Used in the members list on the detail/settings screens.
 */
export interface OrgMember {
  /** Membership row ID. */
  membershipId: string;
  /** User ID. */
  userId: string;
  /** User's display name (from profiles table). */
  fullName: string | null;
  /** User's avatar URL (from profiles table). */
  avatarUrl: string | null;
  /** The user's role in this org. */
  role: OrgRole;
  /** When the membership was created. */
  joinedAt: string;
}

// ---------------------------------------------------------------------------
// Member & Invite input types
// ---------------------------------------------------------------------------

/** Payload for inviting a new member to an org. */
export interface InviteMemberInput {
  orgId: string;
  email: string;
  role: OrgRole;
}

/** Payload for updating a member's role. */
export interface UpdateMemberRoleInput {
  orgId: string;
  userId: string;
  role: OrgRole;
}

// ---------------------------------------------------------------------------
// Member & Invite result types
// ---------------------------------------------------------------------------

/** Result wrapper for member list operations. */
export interface OrgMemberListResult {
  members: OrgMember[];
  error: string | null;
}

/** Result wrapper for member mutation operations (remove, role change). */
export interface OrgMemberResult {
  success: boolean;
  error: string | null;
}

/** Result wrapper for invite operations. */
export interface InviteResult {
  invite: InviteRow | null;
  error: string | null;
}

/** Result wrapper for invite list operations. */
export interface InviteListResult {
  invites: InviteRow[];
  error: string | null;
}

/** Result wrapper for accept invite operations. */
export interface AcceptInviteResult {
  success: boolean;
  orgId: string | null;
  role: OrgRole | null;
  error: string | null;
}
