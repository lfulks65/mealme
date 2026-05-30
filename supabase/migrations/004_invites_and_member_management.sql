-- ============================================================================
-- MealMe: Invites & Member Management
-- ============================================================================
-- This migration creates:
--   1. `invites` table (org member invitations)
--   2. RLS policies for invites
--   3. RPC function `accept_invite` for atomic invite acceptance
--   4. RLS policy refinement for org_memberships (owner cannot be removed)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Invites table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
  invited_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ DEFAULT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_org_id    ON public.invites(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_email     ON public.invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON public.invites(invited_by);

-- ---------------------------------------------------------------------------
-- 2. Enable RLS on invites
-- ---------------------------------------------------------------------------
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Invites RLS Policies
-- ---------------------------------------------------------------------------

-- Org members can read invites for their org
CREATE POLICY "invites_read_org_member"
  ON public.invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = invites.org_id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- Only admins/owners can create invites
CREATE POLICY "invites_insert_admin"
  ON public.invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = invites.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Only admins/owners can update invites (e.g., to revoke)
CREATE POLICY "invites_update_admin"
  ON public.invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = invites.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Only admins/owners can delete invites
CREATE POLICY "invites_delete_admin"
  ON public.invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = invites.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. RPC: accept_invite
-- ---------------------------------------------------------------------------
-- Atomically accepts an invite and adds the user to org_memberships.
-- Runs as SECURITY DEFINER so it can insert the membership row
-- and update the invite in one transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invite(
  p_invite_id UUID,
  p_user_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_result JSONB;
BEGIN
  -- Fetch the invite
  SELECT * INTO v_invite
  FROM public.invites
  WHERE id = p_invite_id;

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
    FROM public.org_memberships
    WHERE org_id = v_invite.org_id
      AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this organization');
  END IF;

  -- Insert the membership
  INSERT INTO public.org_memberships (user_id, org_id, role)
  VALUES (p_user_id, v_invite.org_id, v_invite.role);

  -- Mark the invite as accepted
  UPDATE public.invites
  SET accepted_at = now()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'error', NULL,
    'org_id', v_invite.org_id,
    'role', v_invite.role
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: remove_org_member
-- ---------------------------------------------------------------------------
-- Removes a member from org_memberships. Enforces that the owner
-- cannot be removed. Runs as SECURITY DEFINER to allow admin+ callers
-- to remove any non-owner member.
-- ---------------------------------------------------------------------------
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
  FROM public.org_memberships
  WHERE org_id = p_org_id
    AND user_id = p_caller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not a member of this organization');
  END IF;

  -- Caller must be admin+ (enforced by RLS too, but double-check)
  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins and owners can remove members');
  END IF;

  -- Get target's role
  SELECT role INTO v_target_role
  FROM public.org_memberships
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
  DELETE FROM public.org_memberships
  WHERE org_id = p_org_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'error', NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: update_org_member_role
-- ---------------------------------------------------------------------------
-- Updates a member's role. Only admins/owners can change roles.
-- Owners can promote/demote anyone. Admins can only change 'member' roles.
-- Cannot change the owner's role.
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
  -- Validate new role
  IF p_new_role NOT IN ('admin', 'member') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Only admin and member roles can be assigned');
  END IF;

  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM public.org_memberships
  WHERE org_id = p_org_id
    AND user_id = p_caller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not a member of this organization');
  END IF;

  -- Caller must be admin+
  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins and owners can update member roles');
  END IF;

  -- Get target's role
  SELECT role INTO v_target_role
  FROM public.org_memberships
  WHERE org_id = p_org_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this organization');
  END IF;

  -- Cannot change the owner's role
  IF v_target_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change the organization owner role');
  END IF;

  -- Admins can only change 'member' roles (not other admins)
  IF v_caller_role = 'admin' AND v_target_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admins cannot change other admins roles');
  END IF;

  -- Update the role
  UPDATE public.org_memberships
  SET role = p_new_role
  WHERE org_id = p_org_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'error', NULL);
END;
$$;
