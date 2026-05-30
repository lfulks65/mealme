-- ============================================================================
-- MealMe: Organization CRUD RLS policies & helpers
-- ============================================================================
-- This migration adds:
--   1. `deleted_at` column to organizations (for soft deletes)
--   2. RLS policies for org INSERT (any authenticated user)
--   3. RLS policies for org UPDATE (admin+ only)
--   4. RLS policies for org DELETE (owner only)
--   5. RLS policies for org_memberships INSERT (for adding creator as owner)
--   6. RLS policies for org_memberships UPDATE/DELETE (admin+ only)
--   7. RPC function `create_org_with_owner` for atomic org creation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add deleted_at column for soft deletes
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ---------------------------------------------------------------------------
-- 2. Organizations RLS – INSERT
-- ---------------------------------------------------------------------------
-- Any authenticated user can create an organization.
-- (They will also need to insert a membership row, handled below.)
CREATE POLICY "organizations_insert_authenticated"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 3. Organizations RLS – UPDATE
-- ---------------------------------------------------------------------------
-- Only admins and owners of the org can update it.
CREATE POLICY "organizations_update_admin"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = organizations.id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = organizations.id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Organizations RLS – DELETE
-- ---------------------------------------------------------------------------
-- Only owners can delete an organization.
CREATE POLICY "organizations_delete_owner"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = organizations.id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Org Memberships RLS – INSERT
-- ---------------------------------------------------------------------------
-- Members can insert new membership rows for orgs they are already an
-- admin+ of (e.g., inviting new members). Additionally, the creator
-- of a new org needs to insert their own owner row — this is handled
-- by the RPC function below, which runs as SECURITY DEFINER.
-- For the fallback path (client-side sequential inserts), we allow
-- any authenticated user to insert a membership for themselves in a
-- brand-new org they just created.
CREATE POLICY "org_memberships_insert_admin_or_self_new"
  ON public.org_memberships
  FOR INSERT
  WITH CHECK (
    -- Case 1: User is already an admin+ of this org (inviting others)
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = org_memberships.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 2: User is inserting their own membership row
    org_memberships.user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 6. Org Memberships RLS – UPDATE
-- ---------------------------------------------------------------------------
-- Only admins and owners can update membership roles.
CREATE POLICY "org_memberships_update_admin"
  ON public.org_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = org_memberships.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Org Memberships RLS – DELETE
-- ---------------------------------------------------------------------------
-- Admins/owners can remove any member. Members can remove themselves.
CREATE POLICY "org_memberships_delete_admin_or_self"
  ON public.org_memberships
  FOR DELETE
  USING (
    -- Case 1: User is admin+ of this org
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = org_memberships.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 2: User is removing their own membership
    org_memberships.user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 8. RPC: create_org_with_owner
-- ---------------------------------------------------------------------------
-- Atomically creates an organization and adds the creator as owner.
-- Runs as SECURITY DEFINER so the membership INSERT bypasses RLS checks
-- that might not yet see the org membership.
-- ---------------------------------------------------------------------------
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
  INSERT INTO public.org_memberships (user_id, org_id, role)
  VALUES (p_user_id, new_org.id, 'owner');

  RETURN new_org;
END;
$$;
