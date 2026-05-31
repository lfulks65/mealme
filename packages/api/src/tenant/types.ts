/**
 * @module tenant/types
 * Tenant-related types for the MealMe platform.
 *
 * Defines the shape of tenant information used across the app,
 * including the active org/family and available memberships.
 */

/** Full tenant information for the current user session. */
export interface TenantInfo {
  /** Current org ID — null when no org is selected. */
  tenantId: string | null;
  /** Current family ID — null when no family is selected. */
  familyId: string | null;
  /** Organisations the user belongs to. */
  orgs: Array<{ id: string; name: string; role: string }>;
  /** Families the user belongs to (within the current org). */
  families: Array<{ id: string; name: string; role: string }>;
}
