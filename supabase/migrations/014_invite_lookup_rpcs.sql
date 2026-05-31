-- ============================================================================
-- MealMe: Add SECURITY DEFINER RPCs for invite lookups
-- ============================================================================
-- The `invites` and `organizations` tables have RLS policies that restrict
-- read access to existing org members only (via `tenant_ids_for_user()`).
-- This means non-members (and unauthenticated users) clicking an invite
-- link get RLS errors and see "Invite Not Found".
--
-- This migration adds two SECURITY DEFINER RPCs that bypass RLS:
--   1. `get_invite_by_token(p_invite_token TEXT)` — for AcceptInviteScreen
--   2. `get_pending_invites_for_user(p_user_email TEXT)` — for PendingInvitesCard
--
-- Both functions only return non-accepted, non-expired invites and include
-- org name + inviter name in the response to avoid separate RLS-blocked queries.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. get_invite_by_token
-- ---------------------------------------------------------------------------
-- Looks up an invite by its token. SECURITY DEFINER bypasses RLS so
-- unauthenticated / non-member users can view invite details.
-- Only returns non-accepted, non-expired invites.
-- Returns: invite row fields + org_name + inviter_name
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_invite_by_token(
  p_invite_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_org_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- Fetch the invite by token
  SELECT id, org_id, email, role, invited_by, accepted_at, expires_at, created_at, invite_token
  INTO v_invite
  FROM public.invites
  WHERE invite_token = p_invite_token;

  -- Invite not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  -- Check if already accepted
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invite already accepted',
      'accepted_at', v_invite.accepted_at
    );
  END IF;

  -- Check if expired
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invite has expired',
      'expires_at', v_invite.expires_at
    );
  END IF;

  -- Fetch org name
  SELECT name INTO v_org_name
  FROM public.organizations
  WHERE id = v_invite.org_id;

  v_org_name := COALESCE(v_org_name, 'an organization');

  -- Fetch inviter display name
  SELECT full_name INTO v_inviter_name
  FROM public.profiles
  WHERE id = v_invite.invited_by;

  v_inviter_name := COALESCE(v_inviter_name, 'Someone');

  -- Return full invite details
  RETURN jsonb_build_object(
    'success', true,
    'error', NULL,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'org_id', v_invite.org_id,
      'email', v_invite.email,
      'role', v_invite.role,
      'invited_by', v_invite.invited_by,
      'accepted_at', v_invite.accepted_at,
      'expires_at', v_invite.expires_at,
      'created_at', v_invite.created_at,
      'invite_token', v_invite.invite_token
    ),
    'org_name', v_org_name,
    'inviter_name', v_inviter_name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. get_pending_invites_for_user
-- ---------------------------------------------------------------------------
-- Looks up pending invites matching a user's email. SECURITY DEFINER
-- bypasses RLS so non-members can see their pending invites.
-- Only returns non-accepted, non-expired invites.
-- Returns: array of invite objects, each including org_name
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pending_invites_for_user(
  p_user_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB[];
  v_invite RECORD;
  v_org_name TEXT;
BEGIN
  v_result := ARRAY[]::JSONB[];

  FOR v_invite IN
    SELECT id, org_id, email, role, invited_by, accepted_at, expires_at, created_at, invite_token
    FROM public.invites
    WHERE email = lower(trim(p_user_email))
      AND accepted_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
  LOOP
    -- Fetch org name for each invite
    SELECT name INTO v_org_name
    FROM public.organizations
    WHERE id = v_invite.org_id;

    v_org_name := COALESCE(v_org_name, 'Organization');

    v_result := array_append(v_result, jsonb_build_object(
      'id', v_invite.id,
      'org_id', v_invite.org_id,
      'email', v_invite.email,
      'role', v_invite.role,
      'invited_by', v_invite.invited_by,
      'accepted_at', v_invite.accepted_at,
      'expires_at', v_invite.expires_at,
      'created_at', v_invite.created_at,
      'invite_token', v_invite.invite_token,
      'org_name', v_org_name
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'error', NULL,
    'invites', COALESCE(jsonb_agg(elem), '[]'::jsonb)
  )
  FROM unnest(v_result) AS elem;
END;
$$;
