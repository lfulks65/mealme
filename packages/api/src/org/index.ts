/**
 * @module org
 * Organization CRUD API and React context for the MealMe platform.
 */

// Types
export type {
  OrgRow,
  OrgMemberRow,
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
  // Invite lookup types
  InviteLookupResult,
  InviteWithOrgName,
  PendingInvitesResult,
} from './types';

// CRUD functions
export { createOrg, getOrg, listUserOrgs, updateOrg, deleteOrg } from './functions';

// Member management functions
export {
  inviteMember,
  acceptInvite,
  acceptInviteByToken,
  removeMember,
  updateMemberRole,
  listMembers,
  listInvites,
  listPendingInvitesForUser,
  revokeInvite,
  fetchInviteByToken,
} from './members';

// React context & hook
export { OrgProvider, useOrg } from './context';
export type { OrgContextType } from './context';
