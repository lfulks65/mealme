-- ============================================================================
-- MealMe: Add viewer role and invite token
-- ============================================================================
-- This migration:
--   1. Adds `invite_token` column to the `invites` table for shareable links
--   2. Adds a CHECK constraint on `organization_members.role` to include 'viewer'
--   3. Adds a CHECK constraint on `invites.role` to include 'viewer'
--   4. Creates an index on `invites(invite_token)` for fast lookups
--   5. Creates an index on `invites(email)` for listPendingInvitesForUser
--   6. Updates `update_org_member_role` RPC to accept 'viewer' as a valid role
--   7. Adds `accept_invite_by_token` RPC for token-based invite acceptance
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add invite_token column to invites
-- ---------------------------------------------------------------------------
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- ---------------------------------------------------------------------------
-- 2. Add CHECK constraints for role columns (include 'viewer')
-- ---------------------------------------------------------------------------
-- These are additive constraints; existing data is valid since 'owner',
-- 'admin', and 'member' are all subsets of the new allowed values.

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS chk_organization_members_role;

ALTER TABLE public.organization_members
  ADD CONSTRAINT chk_organization_members_role
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS chk_invites_role;

ALTER TABLE public.invites
  ADD CONSTRAINT chk_invites_role
  CHECK (role IN ('admin', 'member', 'viewer'));

-- ---------------------------------------------------------------------------
-- 3. Indexes for fast lookups
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invites_invite_token ON public.invites(invite_token);

-- The email index may already exist from migration 004; use IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);

-- ---------------------------------------------------------------------------
-- 4. Update update_org_member_role RPC to accept 'viewer'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_org_member_role(
  p_org_id   UUID,
  p_user_id  UUID,
  p_new_role TEXT,
  p_caller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Validate new role (viewer is now a valid target)
  IF p_new_role NOT IN ('admin', 'member', 'viewer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Only admin, member, and viewer roles can be assigned');
  END IF;

  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM public.organization_members
  WHERE org_id = p_org_id
    AND user_id = p_caller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not a member of this organization');
  END IF;

  -- Caller must be admin+ (viewers cannot change roles)
  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins and owners can update member roles');
  END IF;

  -- Get target's role
  SELECT role INTO v_target_role
  FROM public.organization_members
  WHERE org_id = p_org_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this organization');
  END IF;

  -- Cannot change the owner's role
  IF v_target_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change the organization owner role');
  END IF;

  -- Admins can only change 'member' and 'viewer' roles (not other admins)
  IF v_caller_role = 'admin' AND v_target_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admins cannot change other admins roles');
  END IF;

  -- Update the role
  UPDATE public.organization_members
  SET role = p_new_role
  WHERE org_id = p_org_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'error', NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Update remove_org_member RPC to handle viewer role
-- ---------------------------------------------------------------------------
-- Viewers can be removed by admins/owners just like members.
-- Self-removal (leave org) is handled client-side in members.ts, not by this RPC.
-- The existing logic already handles this correctly since it only blocks
-- removing owners and admins-by-admins. No changes needed to the core
-- logic, but we recreate to ensure consistency.

CREATE OR REPLACE FUNCTION public.remove_org_member(
  p_org_id  UUID,
  p_user_id UUID,
  p_caller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM public.organization_members
  WHERE org_id = p_org_id
    AND user_id = p_caller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not a member of this organization');
  END IF;

  -- Caller must be admin+ (viewers cannot remove members)
  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins and owners can remove members');
  END IF;

  -- Get target's role
  SELECT role INTO v_target_role
  FROM public.organization_members
  WHERE org_id = p_org_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this organization');
  END IF;

  -- Cannot remove the owner
  IF v_target_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the organization owner');
  END IF;

  -- Admin cannot remove another admin (only owner can)
  IF v_target_role = 'admin' AND v_caller_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admins cannot remove other admins');
  END IF;

  -- Remove the membership
  DELETE FROM public.organization_members
  WHERE org_id = p_org_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'error', NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Add accept_invite_by_token RPC
-- ---------------------------------------------------------------------------
-- Looks up an invite by its token, validates it, and accepts it atomically.
-- This allows users to accept invites via shareable links without needing
-- to know the invite ID.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invite_by_token(
  p_invite_token TEXT,
  p_user_id      UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Fetch the invite by token
  SELECT * INTO v_invite
  FROM public.invites
  WHERE invite_token = p_invite_token;

  -- Validate invite exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  -- Check if already accepted
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite already accepted');
  END IF;

  -- Check if expired
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite has expired');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE org_id = v_invite.org_id
      AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this organization');
  END IF;

  -- Insert the membership
  INSERT INTO public.organization_members (user_id, org_id, role)
  VALUES (p_user_id, v_invite.org_id, v_invite.role);

  -- Mark the invite as accepted
  UPDATE public.invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'error', NULL,
    'org_id', v_invite.org_id,
    'role', v_invite.role
  );
END;
$$;
