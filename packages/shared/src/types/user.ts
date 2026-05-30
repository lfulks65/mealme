/**
 * @module user
 * User domain types for MealMe.
 *
 * A User represents an individual who can belong to one or more
 * Families and Organizations. Users have authentication credentials
 * and per-family preferences.
 */

/** Supported authentication providers. */
export type AuthProvider = 'email' | 'google' | 'apple' | 'facebook';

/**
 * Represents a user in the MealMe system.
 *
 * Users authenticate via one or more providers and are associated
 * with Families through FamilyMembership records.
 */
export interface User {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Primary email address. */
  email: string;
  /** Display name (first + last or nickname). */
  displayName: string;
  /** URL to the user's avatar image. */
  avatarUrl?: string;
  /** Authentication providers linked to this account. */
  authProviders: AuthProvider[];
  /** IDs of families the user belongs to. */
  familyIds: string[];
  /** Whether the user's account is active. */
  active: boolean;
  /** ISO-8601 timestamp when the user was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Payload for creating a new user account.
 */
export interface CreateUserInput {
  /** Primary email address. */
  email: string;
  /** Display name. */
  displayName: string;
  /** Password (when using email auth). */
  password?: string;
  /** Authentication provider for initial sign-up. */
  authProvider: AuthProvider;
}

/**
 * Payload for updating an existing user.
 */
export interface UpdateUserInput {
  /** Updated display name. */
  displayName?: string;
  /** Updated avatar URL. */
  avatarUrl?: string;
}
