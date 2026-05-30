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
  // Member & Invite types
  InviteRow,
  OrgMember,
  InviteMemberInput,
  UpdateMemberRoleInput,
  OrgMemberListResult,
  OrgMemberResult,
  InviteResult,
  InviteListResult,
  AcceptInviteResult,
} from './types';

// CRUD functions
export {
  createOrg,
  getOrg,
  listUserOrgs,
  updateOrg,
  deleteOrg,
} from './functions';

// Member management functions
export {
  inviteMember,
  acceptInvite,
  removeMember,
  updateMemberRole,
  listMembers,
  listInvites,
  listPendingInvitesForUser,
} from './members';

// React context & hook
export { OrgProvider, useOrg } from './context';
export type { OrgContextType } from './context';
