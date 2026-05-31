/**
 * @module types/family-api
 *
 * Family API request/response types.
 *
 * Extends the base domain types from `@mealme/shared` with
 * API-specific request/response wrappers for family CRUD and
 * member management endpoints.
 */

import type {
  Family,
  FamilyMembership,
  FamilyRole,
} from '@mealme/shared';

import type { PaginatedResponse } from './api';

// ---------------------------------------------------------------------------
// List families
// ---------------------------------------------------------------------------

/** Paginated response of families. */
export type ListFamiliesResponse = PaginatedResponse<Family>;

// ---------------------------------------------------------------------------
// Get family
// ---------------------------------------------------------------------------

/** Response for a single family. */
export type GetFamilyResponse = Family;

// ---------------------------------------------------------------------------
// Create family
// ---------------------------------------------------------------------------

/** Request body for creating a family. */
export interface CreateFamilyRequest {
  /** Display name of the family. */
  name: string;
}

/** Response for a created family. */
export type CreateFamilyResponse = Family;

// ---------------------------------------------------------------------------
// Update family
// ---------------------------------------------------------------------------

/** Request body for updating a family. */
export interface UpdateFamilyRequest {
  /** New display name. */
  name?: string;
}

/** Response for an updated family. */
export type UpdateFamilyResponse = Family;

// ---------------------------------------------------------------------------
// Invite member
// ---------------------------------------------------------------------------

/** Request body for inviting a member to a family. */
export interface InviteMemberRequest {
  /** Email address of the invitee. */
  email: string;
  /** Role to assign to the new member. */
  role: FamilyRole;
}

/** Response for an invited family member. */
export type InviteMemberResponse = FamilyMembership;

// ---------------------------------------------------------------------------
// Remove member
// ---------------------------------------------------------------------------

/** Request body for removing a family member. */
export interface RemoveMemberRequest {
  /** ID of the membership to remove. */
  membershipId: string;
}

/** Response for removing a family member. */
export type RemoveMemberResponse = { success: boolean };
