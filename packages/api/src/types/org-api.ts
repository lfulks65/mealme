/**
 * @module types/org-api
 *
 * Organization API request/response types.
 *
 * Extends the base domain types from `@mealme/shared` with
 * API-specific request/response wrappers for organization CRUD and
 * member invite endpoints.
 */

import type {
  Org,
  OrgMembership,
  OrgPlan,
  OrgRole,
} from '@mealme/shared';

import type { PaginatedResponse } from './api';

// ---------------------------------------------------------------------------
// List orgs
// ---------------------------------------------------------------------------

/** Paginated response of organizations. */
export type ListOrgsResponse = PaginatedResponse<Org>;

// ---------------------------------------------------------------------------
// Get org
// ---------------------------------------------------------------------------

/** Response for a single organization. */
export type GetOrgResponse = Org;

// ---------------------------------------------------------------------------
// Create org
// ---------------------------------------------------------------------------

/** Request body for creating an organization. */
export interface CreateOrgRequest {
  /** Display name of the organization. */
  name: string;
  /** Subscription plan. Defaults to 'free'. */
  plan?: OrgPlan;
}

/** Response for a created organization. */
export type CreateOrgResponse = Org;

// ---------------------------------------------------------------------------
// Invite org member
// ---------------------------------------------------------------------------

/** Request body for inviting a member to an organization. */
export interface InviteOrgMemberRequest {
  /** Email address of the invitee. */
  email: string;
  /** Role to assign to the new member. */
  role: OrgRole;
}

/** Response for an invited org member. */
export type InviteOrgMemberResponse = OrgMembership;
