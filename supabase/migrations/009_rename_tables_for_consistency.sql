-- ============================================================================
-- MealMe: Rename join tables for naming consistency
-- ============================================================================
-- This migration renames the join tables to match the standard multi-tenant
-- naming convention:
--   - org_memberships  → organization_members
--   - family_memberships → family_members
--
-- It also:
--   - Renames indexes and constraints to match new table names
--   - Drops and recreates all RLS policies that reference old table names
--   - Updates all RPC functions that reference old table names
--   - Updates the seed data reference
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Rename tables
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.org_memberships RENAME TO organization_members;

ALTER TABLE IF EXISTS public.family_memberships RENAME TO family_members;

-- ---------------------------------------------------------------------------
-- 2. Rename indexes
-- ---------------------------------------------------------------------------

ALTER INDEX IF EXISTS idx_org_memberships_user_id
  RENAME TO idx_organization_members_user_id;

ALTER INDEX IF EXISTS idx_org_memberships_org_id
  RENAME TO idx_organization_members_org_id;

ALTER INDEX IF EXISTS idx_family_memberships_user_id
  RENAME TO idx_family_members_user_id;

ALTER INDEX IF EXISTS idx_family_memberships_family_id
  RENAME TO idx_family_members_family_id;

-- ---------------------------------------------------------------------------
-- 3. Rename unique constraints
-- ---------------------------------------------------------------------------
-- PostgreSQL auto-renames the constraint when the table is renamed, but
-- the auto-generated name still contains the old table name. We explicitly
-- rename to the desired convention.
-- ---------------------------------------------------------------------------

-- org_memberships unique constraint on (user_id, org_id)
DO $$
DECLARE
  v_old_name TEXT;
BEGIN
  SELECT con.conname INTO v_old_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'organization_members'
    AND con.contype = 'u'
    AND con.conname LIKE '%org_membership%';

  IF v_old_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.organization_members RENAME CONSTRAINT %I TO organization_members_user_org_uniq', v_old_name);
  END IF;
END;
$$;

-- family_memberships unique constraint on (user_id, family_id)
DO $$
DECLARE
  v_old_name TEXT;
BEGIN
  SELECT con.conname INTO v_old_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'family_members'
    AND con.contype = 'u'
    AND con.conname LIKE '%family_membership%';

  IF v_old_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.family_members RENAME CONSTRAINT %I TO family_members_user_family_uniq', v_old_name);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Rename FK constraints from other tables that reference the old names
-- ---------------------------------------------------------------------------
-- When a table is renamed, PostgreSQL updates FK *targets* automatically,
-- but the FK *constraint names* on child tables may still contain the old
-- table name. We rename those for consistency.
-- ---------------------------------------------------------------------------

-- family_preferences FK to family_memberships (now family_members)
DO $$
DECLARE
  v_old_name TEXT;
BEGIN
  SELECT con.conname INTO v_old_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_class frel ON frel.oid = con.confrelid
  WHERE rel.relname = 'family_preferences'
    AND con.contype = 'f'
    AND frel.relname = 'family_members'
    AND con.conname LIKE '%family_membership%';

  IF v_old_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.family_preferences RENAME CONSTRAINT %I TO family_preferences_family_id_fkey', v_old_name);
  END IF;
END;
$$;

-- heb_orders FK to org_memberships (now organization_members)
-- Note: heb_orders does not have a direct FK to org_memberships, but
-- if any FK constraint names reference the old table name, rename them.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class frel ON frel.oid = con.confrelid
    WHERE con.contype = 'f'
      AND frel.relname IN ('organization_members', 'family_members')
      AND con.conname LIKE '%org_membership%' OR con.conname LIKE '%family_membership%'
  LOOP
    -- Generate a new name by replacing the old table name pattern
    EXECUTE format(
      'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %s',
      r.table_name,
      r.conname,
      replace(replace(r.conname, 'org_membership', 'organization_member'), 'family_membership', 'family_member')
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Drop and recreate RLS policies that reference old table names
-- ---------------------------------------------------------------------------
-- When a table is renamed, PostgreSQL preserves the policies bound to it,
-- but the policy *bodies* that reference the old table name in subqueries
-- will break. We must drop and recreate them with the new table names.
-- ---------------------------------------------------------------------------

-- === Profiles policies (from migration 001) ===

DROP POLICY IF EXISTS "profiles_read_same_org" ON public.profiles;

CREATE POLICY "profiles_read_same_org"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om_self
      JOIN public.organization_members om_other
        ON om_self.org_id = om_other.org_id
      WHERE om_self.user_id = auth.uid()
        AND om_other.user_id = profiles.id
    )
  );

-- === Organization_members policies (from migration 001 & 002) ===
-- These were originally on org_memberships; after rename they're on organization_members

DROP POLICY IF EXISTS "org_memberships_read_member" ON public.organization_members;

CREATE POLICY "org_memberships_read_member"
  ON public.organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = organization_members.org_id
        AND om.user_id = auth.uid()
    )
  );

-- === Organizations policies (from migration 001 & 002) ===

DROP POLICY IF EXISTS "organizations_read_member" ON public.organizations;

CREATE POLICY "organizations_read_member"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = organizations.id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;

CREATE POLICY "organizations_update_admin"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "organizations_delete_owner" ON public.organizations;

CREATE POLICY "organizations_delete_owner"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
    )
  );

-- === Organization_members INSERT/UPDATE/DELETE policies (from migration 002) ===

DROP POLICY IF EXISTS "org_memberships_insert_admin_or_self_new" ON public.organization_members;

CREATE POLICY "org_memberships_insert_admin_or_self_new"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    -- Case 1: User is already an admin+ of this org (inviting others)
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = organization_members.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 2: User is inserting their own membership row
    organization_members.user_id = auth.uid()
  );

DROP POLICY IF EXISTS "org_memberships_update_admin" ON public.organization_members;

CREATE POLICY "org_memberships_update_admin"
  ON public.organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = organization_members.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "org_memberships_delete_admin_or_self" ON public.organization_members;

CREATE POLICY "org_memberships_delete_admin_or_self"
  ON public.organization_members
  FOR DELETE
  USING (
    -- Case 1: User is admin+ of this org
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = organization_members.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 2: User is removing their own membership
    organization_members.user_id = auth.uid()
  );

-- === Families policies (from migration 003) ===

DROP POLICY IF EXISTS "families_read_org_member" ON public.families;

CREATE POLICY "families_read_org_member"
  ON public.families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = families.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "families_insert_org_member" ON public.families;

CREATE POLICY "families_insert_org_member"
  ON public.families
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = families.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "families_update_admin" ON public.families;

CREATE POLICY "families_update_admin"
  ON public.families
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.role IN ('owner', 'parent', 'guardian')
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = families.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.role IN ('owner', 'parent', 'guardian')
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = families.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "families_delete_owner" ON public.families;

CREATE POLICY "families_delete_owner"
  ON public.families
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = families.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
    )
  );

-- === Family_members policies (from migration 003) ===

DROP POLICY IF EXISTS "family_memberships_read_org_member" ON public.family_members;

CREATE POLICY "family_memberships_read_org_member"
  ON public.family_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.organization_members om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "family_memberships_insert_admin" ON public.family_members;

CREATE POLICY "family_memberships_insert_admin"
  ON public.family_members
  FOR INSERT
  WITH CHECK (
    -- Case 1: User is already an admin-level member of this family
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner', 'parent', 'guardian')
    )
    OR
    -- Case 2: User is an org admin+
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.organization_members om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 3: User is inserting their own membership (for create_family flow)
    family_members.user_id = auth.uid()
  );

DROP POLICY IF EXISTS "family_memberships_update_admin" ON public.family_members;

CREATE POLICY "family_memberships_update_admin"
  ON public.family_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner', 'parent', 'guardian')
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.organization_members om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "family_memberships_delete_admin_or_self" ON public.family_members;

CREATE POLICY "family_memberships_delete_admin_or_self"
  ON public.family_members
  FOR DELETE
  USING (
    -- Case 1: User is an admin-level member of this family
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner', 'parent', 'guardian')
    )
    OR
    -- Case 2: User is an org admin+
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.organization_members om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 3: User is removing their own membership
    family_members.user_id = auth.uid()
  );

-- === Invites policies (from migration 004) ===

DROP POLICY IF EXISTS "invites_read_org_member" ON public.invites;

CREATE POLICY "invites_read_org_member"
  ON public.invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = invites.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "invites_insert_admin" ON public.invites;

CREATE POLICY "invites_insert_admin"
  ON public.invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = invites.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "invites_update_admin" ON public.invites;

CREATE POLICY "invites_update_admin"
  ON public.invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = invites.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "invites_delete_admin" ON public.invites;

CREATE POLICY "invites_delete_admin"
  ON public.invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = invites.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- === HEB orders policies (from migration 006) ===

DROP POLICY IF EXISTS "heb_orders_read_org_member" ON public.heb_orders;

CREATE POLICY "heb_orders_read_org_member"
  ON public.heb_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = heb_orders.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "heb_orders_insert_org_member" ON public.heb_orders;

CREATE POLICY "heb_orders_insert_org_member"
  ON public.heb_orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = heb_orders.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "heb_orders_update_org_admin" ON public.heb_orders;

CREATE POLICY "heb_orders_update_org_admin"
  ON public.heb_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = heb_orders.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "heb_orders_delete_org_admin" ON public.heb_orders;

CREATE POLICY "heb_orders_delete_org_admin"
  ON public.heb_orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.org_id = heb_orders.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Update RPC functions that reference old table names
-- ---------------------------------------------------------------------------
-- All functions use CREATE OR REPLACE so they are idempotent.
-- ---------------------------------------------------------------------------

-- === create_org_with_owner (from migration 002) ===

CREATE OR REPLACE FUNCTION public.create_org_with_owner(
  p_name  TEXT,
  p_slug  TEXT,
  p_user_id UUID
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org public.organizations%ROWTYPE;
BEGIN
  -- Insert the organization
  INSERT INTO public.organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING * INTO new_org;

  -- Insert the creator as owner
  INSERT INTO public.organization_members (user_id, org_id, role)
  VALUES (p_user_id, new_org.id, 'owner');

  RETURN new_org;
END;
$$;

-- === create_family_with_owner (from migration 003) ===

CREATE OR REPLACE FUNCTION public.create_family_with_owner(
  p_name    TEXT,
  p_org_id  UUID,
  p_user_id UUID
)
RETURNS public.families
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_family public.families%ROWTYPE;
BEGIN
  -- Verify the user is a member of the org
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE org_id = p_org_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of the organization';
  END IF;

  -- Insert the family
  INSERT INTO public.families (name, org_id)
  VALUES (p_name, p_org_id)
  RETURNING * INTO new_family;

  -- Insert the creator as owner
  INSERT INTO public.family_members (user_id, family_id, role)
  VALUES (p_user_id, new_family.id, 'owner');

  RETURN new_family;
END;
$$;

-- === accept_invite (from migration 004) ===

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
  WHERE id = p_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'error', NULL,
    'org_id', v_invite.org_id,
    'role', v_invite.role
  );
END;
$$;

-- === remove_org_member (from migration 004) ===

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

  -- Caller must be admin+ (enforced by RLS too, but double-check)
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

-- === update_org_member_role (from migration 004) ===

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
  FROM public.organization_members
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

  -- Admins can only change 'member' roles (not other admins)
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

-- === handle_user_delete (from migration 008) ===

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the deletion to auth_audit_log (using OLD.id since user is being deleted)
  -- The FK to auth.users uses ON DELETE SET NULL, so the audit entry survives
  -- user deletion with user_id = NULL. This runs in BEFORE DELETE so the user
  -- row still exists when we insert the FK reference.
  INSERT INTO public.auth_audit_log (user_id, action, provider, ip_address, user_agent)
  VALUES (
    OLD.id,
    'account_deleted',
    COALESCE(OLD.raw_app_meta_data->>'provider', 'email'),
    NULL,
    NULL
  );

  -- Explicitly clean up organization_members (even though FK has ON DELETE CASCADE,
  -- this ensures cleanup runs in the correct order with the audit log)
  DELETE FROM public.organization_members WHERE user_id = OLD.id;

  -- Clean up family_members
  DELETE FROM public.family_members WHERE user_id = OLD.id;

  -- Clean up profile (FK has ON DELETE CASCADE, but explicit for clarity)
  DELETE FROM public.profiles WHERE id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === get_user_session_info (from migration 008) ===

CREATE OR REPLACE FUNCTION public.get_user_session_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile JSONB;
  v_orgs JSONB;
BEGIN
  -- Get the current user's profile
  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'default_org_id', p.default_org_id,
    'created_at', p.created_at
  )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Get the user's org memberships with org details
  SELECT jsonb_agg(
    jsonb_build_object(
      'org_id', om.org_id,
      'org_name', o.name,
      'org_slug', o.slug,
      'role', om.role,
      'is_default', (p.default_org_id = om.org_id)
    )
    ORDER BY
      CASE WHEN p.default_org_id = om.org_id THEN 0 ELSE 1 END,
      om.created_at
  )
  INTO v_orgs
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.org_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE om.user_id = auth.uid()
    AND o.deleted_at IS NULL;

  -- Build the response
  RETURN jsonb_build_object(
    'profile', v_profile,
    'organizations', COALESCE(v_orgs, '[]'::jsonb)
  );
END;
$$;
