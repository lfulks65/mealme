/**
 * @module org
 * Organization CRUD API and React context for the MealMe platform.
 */

// Types
export type {
  OrgRow,
  OrgMembershipRow,
  OrgRole,
  OrgWithRole,
  CreateOrgInput,
  UpdateOrgInput,
  OrgResult,
  OrgListResult,
  OrgDeleteResult,
} from './types';

// CRUD functions
export {
  createOrg,
  getOrg,
  listUserOrgs,
  updateOrg,
  deleteOrg,
} from './functions';

// React context & hook
export { OrgProvider, useOrg } from './context';
export type { OrgContextType } from './context';
