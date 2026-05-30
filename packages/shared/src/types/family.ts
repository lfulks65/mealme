/**
 * @module family
 * Family domain types for MealMe.
 *
 * A Family is a group of Users who share meal plans, shopping lists,
 * and preferences. Families belong to an Organization.
 */

/** Role a user may hold within a family. */
export type FamilyRole = 'parent' | 'child' | 'guardian' | 'member';

/**
 * Represents a family unit in the MealMe system.
 *
 * Families are the primary social grouping. All meal plans, recipes,
 * and shopping lists are scoped to a Family.
 */
export interface Family {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Display name of the family. */
  name: string;
  /** Reference to the parent Organization. */
  orgId: string;
  /** IDs of users who are members of this family. */
  memberIds: string[];
  /** ISO-8601 timestamp when the family was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Associates a User with a Family and their role.
 */
export interface FamilyMembership {
  /** Unique identifier for this membership. */
  id: string;
  /** Reference to the Family. */
  familyId: string;
  /** Reference to the User. */
  userId: string;
  /** The role the user holds in the family. */
  role: FamilyRole;
  /** ISO-8601 timestamp when the membership was created. */
  createdAt: string;
}
