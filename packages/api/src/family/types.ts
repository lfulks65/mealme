/**
 * @module family/types
 * Family domain types for the MealMe API client.
 *
 * These types mirror the Supabase `families` and `family_members`
 * tables and provide input/result wrappers for the CRUD functions.
 */

// ---------------------------------------------------------------------------
// Database row types (match Supabase schema exactly)
// ---------------------------------------------------------------------------

/** Row from the `families` table. */
export interface FamilyRow {
  id: string;
  name: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Row from the `family_members` table. */
export interface FamilyMemberRow {
  id: string;
  user_id: string;
  family_id: string;
  role: FamilyRole;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Role a user may hold within a family. */
export type FamilyRole = 'owner' | 'parent' | 'guardian' | 'member' | 'child';

/**
 * A family with its current user's membership role.
 * Returned by getFamily / listFamilies so consumers know the user's role.
 */
export interface FamilyWithRole extends FamilyRow {
  /** The current user's role in this family. */
  role: FamilyRole;
}

/**
 * A family member with profile information.
 * Used in the members list on the detail/settings screens.
 */
export interface FamilyMember {
  /** Membership row ID. */
  membershipId: string;
  /** User ID. */
  userId: string;
  /** User's display name (from profiles table). */
  fullName: string | null;
  /** User's avatar URL (from profiles table). */
  avatarUrl: string | null;
  /** The user's role in this family. */
  role: FamilyRole;
  /** When the membership was created. */
  joinedAt: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for creating a new family. */
export interface CreateFamilyInput {
  name: string;
  orgId: string;
}

/** Payload for updating an existing family. */
export interface UpdateFamilyInput {
  name?: string;
}

/** Payload for adding a member to a family. */
export interface AddFamilyMemberInput {
  familyId: string;
  userId: string;
  role?: FamilyRole;
}

/** Payload for updating a family member's role. */
export interface UpdateFamilyMemberRoleInput {
  familyId: string;
  userId: string;
  role: FamilyRole;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result wrapper for single-family operations. */
export interface FamilyResult {
  family: FamilyWithRole | null;
  error: string | null;
}

/** Result wrapper for list operations. */
export interface FamilyListResult {
  families: FamilyWithRole[];
  error: string | null;
}

/** Result wrapper for delete operations. */
export interface FamilyDeleteResult {
  success: boolean;
  error: string | null;
}

/** Result wrapper for member list operations. */
export interface FamilyMemberListResult {
  members: FamilyMember[];
  error: string | null;
}

/** Result wrapper for member mutation operations. */
export interface FamilyMemberResult {
  success: boolean;
  error: string | null;
}
;
}
