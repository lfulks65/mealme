-- ============================================================================
-- MealMe: Families, Family Memberships & RLS
-- ============================================================================
-- This migration creates:
--   1. `families` table (belongs to an organization)
--   2. `family_memberships` join table (user ↔ family)
--   3. RLS policies for families and family_memberships
--   4. RPC function `create_family_with_owner` for atomic family creation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Families
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_families_org_id ON public.families(org_id);

-- ---------------------------------------------------------------------------
-- 2. Family Memberships (join table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'parent' | 'guardian' | 'member' | 'child'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, family_id)
);

CREATE INDEX IF NOT EXISTS idx_family_memberships_user_id   ON public.family_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_family_memberships_family_id  ON public.family_memberships(family_id);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Families RLS Policies
-- ---------------------------------------------------------------------------

-- Users can read families in orgs they belong to
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

-- Org members can create families in their org
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

-- Only family owners/admins or org admins can update families
CREATE POLICY "families_update_admin"
  ON public.families
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_memberships
      WHERE family_memberships.family_id = families.id
        AND family_memberships.user_id = auth.uid()
        AND family_memberships.role IN ('owner', 'parent', 'guardian')
    )
    OR
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
      FROM public.family_memberships
      WHERE family_memberships.family_id = families.id
        AND family_memberships.user_id = auth.uid()
        AND family_memberships.role IN ('owner', 'parent', 'guardian')
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = families.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Only family owners or org owners can delete families
CREATE POLICY "families_delete_owner"
  ON public.families
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_memberships
      WHERE family_memberships.family_id = families.id
        AND family_memberships.user_id = auth.uid()
        AND family_memberships.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = families.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Family Memberships RLS Policies
-- ---------------------------------------------------------------------------

-- Users can read memberships for families in their org
CREATE POLICY "family_memberships_read_org_member"
  ON public.family_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_memberships.family_id
        AND om.user_id = auth.uid()
    )
  );

-- Family owners/parents/guardians or org admins can add members
CREATE POLICY "family_memberships_insert_admin"
  ON public.family_memberships
  FOR INSERT
  WITH CHECK (
    -- Case 1: User is already an admin-level member of this family
    EXISTS (
      SELECT 1
      FROM public.family_memberships fm
      WHERE fm.family_id = family_memberships.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner', 'parent', 'guardian')
    )
    OR
    -- Case 2: User is an org admin+
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_memberships.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 3: User is inserting their own membership (for create_family flow)
    family_memberships.user_id = auth.uid()
  );

-- Family owners/parents/guardians or org admins can update member roles
CREATE POLICY "family_memberships_update_admin"
  ON public.family_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_memberships fm
      WHERE fm.family_id = family_memberships.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner', 'parent', 'guardian')
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_memberships.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Family owners/parents/guardians or org admins can remove members;
-- members can also remove themselves
CREATE POLICY "family_memberships_delete_admin_or_self"
  ON public.family_memberships
  FOR DELETE
  USING (
    -- Case 1: User is an admin-level member of this family
    EXISTS (
      SELECT 1
      FROM public.family_memberships fm
      WHERE fm.family_id = family_memberships.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner', 'parent', 'guardian')
    )
    OR
    -- Case 2: User is an org admin+
    EXISTS (
      SELECT 1
      FROM public.families f
      JOIN public.org_memberships om
        ON om.org_id = f.org_id
      WHERE f.id = family_memberships.family_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Case 3: User is removing their own membership
    family_memberships.user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 6. RPC: create_family_with_owner
-- ---------------------------------------------------------------------------
-- Atomically creates a family and adds the creator as owner.
-- Runs as SECURITY DEFINER so the membership INSERT bypasses RLS checks.
-- ---------------------------------------------------------------------------
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
    FROM public.org_memberships
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
  INSERT INTO public.family_memberships (user_id, family_id, role)
  VALUES (p_user_id, new_family.id, 'owner');

  RETURN new_family;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Trigger: auto-update updated_at on families row change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_families_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_families_updated ON public.families;

CREATE TRIGGER on_families_updated
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_families_updated_at();
