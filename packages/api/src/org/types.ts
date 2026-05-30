/**
 * @module org/types
 * Organization domain types for the MealMe API client.
 *
 * These types mirror the Supabase `organizations` and `org_memberships`
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

/** Row from the `org_memberships` table. */
export interface OrgMembershipRow {
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
