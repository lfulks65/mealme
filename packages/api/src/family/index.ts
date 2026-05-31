/**
 * @module family
 * Family CRUD API and React context for the MealMe platform.
 */

// Types
export type {
  FamilyRow,
  FamilyMemberRow,
  FamilyRole,
  FamilyWithRole,
  FamilyMember,
  CreateFamilyInput,
  UpdateFamilyInput,
  AddFamilyMemberInput,
  UpdateFamilyMemberRoleInput,
  FamilyResult,
  FamilyListResult,
  FamilyDeleteResult,
  FamilyMemberListResult,
  FamilyMemberResult,
} from './types';

// CRUD functions
export {
  createFamily,
  getFamily,
  listFamilies,
  updateFamily,
  deleteFamily,
  addFamilyMember,
  removeFamilyMember,
  updateFamilyMemberRole,
  listFamilyMembers,
} from './functions';

// React context & hook
export { FamilyProvider, useFamily } from './context';
export type { FamilyContextType } from './context';
