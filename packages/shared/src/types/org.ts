/**
 * @module org
 * Organization domain types for MealMe.
 *
 * An Organization is the top-level entity that groups Families and Users.
 * Organizations manage billing, plan selection, and shared settings.
 */

/** Supported organization plan tiers. */
export type OrgPlan = 'free' | 'pro' | 'enterprise';

/** Role a user may hold within an organization. */
export type OrgRole = 'owner' | 'admin' | 'member';

/**
 * Represents an organization in the MealMe system.
 *
 * Organizations are the billing and administrative unit. One or more
 * Families belong to an Organization, and Users are members through
 * their Family association or a direct OrgRole.
 */
export interface Org {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Display name of the organization. */
  name: string;
  /** Current subscription plan. */
  plan: OrgPlan;
  /** URL-friendly slug used in invites and links. */
  slug: string;
  /** IDs of users who hold an OrgRole directly. */
  memberIds: string[];
  /** ISO-8601 timestamp when the org was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Associates a User with an Organization and their role.
 */
export interface OrgMembership {
  /** Unique identifier for this membership. */
  id: string;
  /** Reference to the Org. */
  orgId: string;
  /** Reference to the User. */
  userId: string;
  /** The role the user holds in the organization. */
  role: OrgRole;
  /** ISO-8601 timestamp when the membership was created. */
  createdAt: string;
}
