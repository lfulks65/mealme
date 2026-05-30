-- ============================================================================
-- MealMe: Families, Family Members & RLS
-- ============================================================================
-- This migration creates:
--   1. `families` table (org-scoped family units)
--   2. `family_members` join table (user ↔ family with role)
--   3. Indexes for common query patterns
--   4. RLS policies scoped to the user's organization
--
-- Prerequisites: organizations, org_memberships tables from migration 001
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Families
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_families_org_id ON public.families(org_id);

-- ---------------------------------------------------------------------------
-- 2. Family Members (join table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',  -- 'parent' | 'child' | 'guardian' | 'member'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id   ON public.family_members(user_id);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Families RLS Policies
-- ---------------------------------------------------------------------------

-- Users can read families that belong to orgs they are members of
CREATE POLICY "families_read_org_member"
  ON public.families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = families.org_id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- Any authenticated user who is a member of the org can create a family
CREATE POLICY "families_insert_org_member"
  ON public.families
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = families.org_id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- Only admins and owners of the org can update a family
CREATE POLICY "families_update_org_admin"
  ON public.families
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = families.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = families.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Only admins and owners of the org can delete a family
CREATE POLICY "families_delete_org_admin"
  ON public.families
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = families.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Family Members RLS Policies
-- ---------------------------------------------------------------------------

-- Users can read family members for families in their org
CREATE POLICY "family_members_read_org_member"
  ON public.family_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
    )
  );

-- Org admins/owners can add members to any family in their org;
-- regular members can add themselves to a family in their org
CREATE POLICY "family_members_insert_org_member"
  ON public.family_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
        AND (om.role IN ('owner', 'admin') OR family_members.user_id = auth.uid())
    )
  );

-- Only admins and owners of the org can update family member roles
CREATE POLICY "family_members_update_org_admin"
  ON public.family_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Admins/owners can remove any member; users can remove themselves
CREATE POLICY "family_members_delete_org_admin_or_self"
  ON public.family_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_members.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR family_members.user_id = auth.uid()
  );
