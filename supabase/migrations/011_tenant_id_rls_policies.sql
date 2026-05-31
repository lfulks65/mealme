-- ============================================================================
-- MealMe: Rewrite RLS policies to use tenant_id for efficient tenant-scoped access
-- ============================================================================
-- This migration replaces the existing join-based RLS policies with optimized
-- tenant_id-based policies for better performance, and adds helper functions
-- for tenant membership checks.
--
-- Key improvements:
--   1. tenant_id index allows direct filtering without joining
--   2. Membership subquery result can be cached by the query planner
--   3. Standard pattern that Supabase tooling expects
--
-- Prerequisites: migrations 009 (table renames) and 010 (tenant_id columns)
-- must have run first. All table names use the post-rename names.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------------

-- Returns all org IDs (tenant IDs) the current user belongs to.
-- Used as the primary filter in all tenant-scoped RLS policies.
CREATE OR REPLACE FUNCTION public.tenant_ids_for_user()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

-- Returns all family IDs the current user belongs to.
-- Used for family-level access checks in RLS policies.
CREATE OR REPLACE FUNCTION public.family_ids_for_user()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 2. Organizations — rewrite policies using tenant_ids_for_user()
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "organizations_read_member" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_authenticated" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_owner" ON public.organizations;

CREATE POLICY "organizations_select_tenant"
  ON public.organizations
  FOR SELECT
  USING (id IN (SELECT public.tenant_ids_for_user()));

CREATE POLICY "organizations_insert_authenticated"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update_admin"
  ON public.organizations
  FOR UPDATE
  USING (
    id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "organizations_delete_owner"
  ON public.organizations
  FOR DELETE
  USING (
    id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Organization Members — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_memberships_read_member" ON public.organization_members;
DROP POLICY IF EXISTS "org_memberships_insert_admin_or_self_new" ON public.organization_members;
DROP POLICY IF EXISTS "org_memberships_update_admin" ON public.organization_members;
DROP POLICY IF EXISTS "org_memberships_delete_admin_or_self" ON public.organization_members;

CREATE POLICY "organization_members_select_tenant"
  ON public.organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR tenant_id IN (SELECT public.tenant_ids_for_user())
  );

CREATE POLICY "organization_members_insert_tenant"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    -- Case 1: User is inserting their own membership row
    user_id = auth.uid()
    OR
    -- Case 2: User is an admin+ of the target org (inviting others)
    (
      tenant_id IN (SELECT public.tenant_ids_for_user())
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = organization_members.tenant_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "organization_members_update_tenant"
  ON public.organization_members
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = organization_members.tenant_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "organization_members_delete_tenant"
  ON public.organization_members
  FOR DELETE
  USING (
    -- Case 1: User is removing their own membership
    user_id = auth.uid()
    OR
    -- Case 2: User is an admin+ of this org
    (
      tenant_id IN (SELECT public.tenant_ids_for_user())
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = organization_members.tenant_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Families — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "families_read_org_member" ON public.families;
DROP POLICY IF EXISTS "families_insert_org_member" ON public.families;
DROP POLICY IF EXISTS "families_update_admin" ON public.families;
DROP POLICY IF EXISTS "families_delete_owner" ON public.families;

CREATE POLICY "families_select_tenant"
  ON public.families
  FOR SELECT
  USING (tenant_id IN (SELECT public.tenant_ids_for_user()));

CREATE POLICY "families_insert_tenant"
  ON public.families
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT public.tenant_ids_for_user()));

CREATE POLICY "families_update_tenant"
  ON public.families
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND (
      -- Family admin-level member
      EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_members.family_id = families.id
          AND family_members.user_id = auth.uid()
          AND family_members.role IN ('owner', 'parent', 'guardian')
      )
      OR
      -- Org admin+
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.org_id = families.tenant_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND (
      EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_members.family_id = families.id
          AND family_members.user_id = auth.uid()
          AND family_members.role IN ('owner', 'parent', 'guardian')
      )
      OR
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.org_id = families.tenant_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "families_delete_tenant"
  ON public.families
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND (
      -- Family owner
      EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_members.family_id = families.id
          AND family_members.user_id = auth.uid()
          AND family_members.role = 'owner'
      )
      OR
      -- Org owner
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.org_id = families.tenant_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role = 'owner'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Family Members — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "family_memberships_read_org_member" ON public.family_members;
DROP POLICY IF EXISTS "family_memberships_insert_admin" ON public.family_members;
DROP POLICY IF EXISTS "family_memberships_update_admin" ON public.family_members;
DROP POLICY IF EXISTS "family_memberships_delete_admin_or_self" ON public.family_members;

CREATE POLICY "family_members_select_tenant"
  ON public.family_members
  FOR SELECT
  USING (tenant_id IN (SELECT public.tenant_ids_for_user()));

CREATE POLICY "family_members_insert_tenant"
  ON public.family_members
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND (
      -- Case 1: Family admin-level member
      EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = family_members.family_id
          AND fm.user_id = auth.uid()
          AND fm.role IN ('owner', 'parent', 'guardian')
      )
      OR
      -- Case 2: Org admin+
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.org_id = family_members.tenant_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin')
      )
      OR
      -- Case 3: User is inserting their own membership (create_family flow)
      family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "family_members_update_tenant"
  ON public.family_members
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND (
      -- Family admin-level member
      EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = family_members.family_id
          AND fm.user_id = auth.uid()
          AND fm.role IN ('owner', 'parent', 'guardian')
      )
      OR
      -- Org admin+
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.org_id = family_members.tenant_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "family_members_delete_tenant"
  ON public.family_members
  FOR DELETE
  USING (
    -- Case 1: User is removing their own membership
    user_id = auth.uid()
    OR
    (
      tenant_id IN (SELECT public.tenant_ids_for_user())
      AND (
        -- Family admin-level member
        EXISTS (
          SELECT 1 FROM public.family_members fm
          WHERE fm.family_id = family_members.family_id
            AND fm.user_id = auth.uid()
            AND fm.role IN ('owner', 'parent', 'guardian')
        )
        OR
        -- Org admin+
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.org_id = family_members.tenant_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Invites — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "invites_read_org_member" ON public.invites;
DROP POLICY IF EXISTS "invites_insert_admin" ON public.invites;
DROP POLICY IF EXISTS "invites_update_admin" ON public.invites;
DROP POLICY IF EXISTS "invites_delete_admin" ON public.invites;

CREATE POLICY "invites_select_tenant"
  ON public.invites
  FOR SELECT
  USING (tenant_id IN (SELECT public.tenant_ids_for_user()));

CREATE POLICY "invites_insert_tenant"
  ON public.invites
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = invites.tenant_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "invites_update_tenant"
  ON public.invites
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = invites.tenant_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "invites_delete_tenant"
  ON public.invites
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = invites.tenant_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Family Preferences — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "family_preferences_read_member" ON public.family_preferences;
DROP POLICY IF EXISTS "family_preferences_insert_member" ON public.family_preferences;
DROP POLICY IF EXISTS "family_preferences_update_member" ON public.family_preferences;

CREATE POLICY "family_preferences_select_tenant"
  ON public.family_preferences
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "family_preferences_insert_tenant"
  ON public.family_preferences
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "family_preferences_update_tenant"
  ON public.family_preferences
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

-- ---------------------------------------------------------------------------
-- 8. Member Preferences — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "member_preferences_read_family_member" ON public.member_preferences;
DROP POLICY IF EXISTS "member_preferences_insert_self" ON public.member_preferences;
DROP POLICY IF EXISTS "member_preferences_update_self" ON public.member_preferences;

CREATE POLICY "member_preferences_select_tenant"
  ON public.member_preferences
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "member_preferences_insert_tenant"
  ON public.member_preferences
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
    AND user_id = auth.uid()
  );

CREATE POLICY "member_preferences_update_tenant"
  ON public.member_preferences
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 9. Meal Plans — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "meal_plans_read_member" ON public.meal_plans;
DROP POLICY IF EXISTS "meal_plans_insert_member" ON public.meal_plans;
DROP POLICY IF EXISTS "meal_plans_update_member" ON public.meal_plans;
DROP POLICY IF EXISTS "meal_plans_delete_member" ON public.meal_plans;

CREATE POLICY "meal_plans_select_tenant"
  ON public.meal_plans
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "meal_plans_insert_tenant"
  ON public.meal_plans
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "meal_plans_update_tenant"
  ON public.meal_plans
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "meal_plans_delete_tenant"
  ON public.meal_plans
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

-- ---------------------------------------------------------------------------
-- 10. Meal Plan Entries — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "meal_plan_entries_read_member" ON public.meal_plan_entries;
DROP POLICY IF EXISTS "meal_plan_entries_insert_member" ON public.meal_plan_entries;
DROP POLICY IF EXISTS "meal_plan_entries_update_member" ON public.meal_plan_entries;
DROP POLICY IF EXISTS "meal_plan_entries_delete_member" ON public.meal_plan_entries;

CREATE POLICY "meal_plan_entries_select_tenant"
  ON public.meal_plan_entries
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND mp.family_id IN (SELECT public.family_ids_for_user())
    )
  );

CREATE POLICY "meal_plan_entries_insert_tenant"
  ON public.meal_plan_entries
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND mp.family_id IN (SELECT public.family_ids_for_user())
    )
  );

CREATE POLICY "meal_plan_entries_update_tenant"
  ON public.meal_plan_entries
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND mp.family_id IN (SELECT public.family_ids_for_user())
    )
  );

CREATE POLICY "meal_plan_entries_delete_tenant"
  ON public.meal_plan_entries
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND mp.family_id IN (SELECT public.family_ids_for_user())
    )
  );

-- ---------------------------------------------------------------------------
-- 11. Shopping Lists — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "shopping_lists_read_member" ON public.shopping_lists;
DROP POLICY IF EXISTS "shopping_lists_insert_member" ON public.shopping_lists;
DROP POLICY IF EXISTS "shopping_lists_update_member" ON public.shopping_lists;
DROP POLICY IF EXISTS "shopping_lists_delete_member" ON public.shopping_lists;

CREATE POLICY "shopping_lists_select_tenant"
  ON public.shopping_lists
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND (
      family_id IN (SELECT public.family_ids_for_user())
      OR EXISTS (
        SELECT 1 FROM public.shopping_list_shares
        WHERE shopping_list_shares.shopping_list_id = shopping_lists.id
          AND shopping_list_shares.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "shopping_lists_insert_tenant"
  ON public.shopping_lists
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "shopping_lists_update_tenant"
  ON public.shopping_lists
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

CREATE POLICY "shopping_lists_delete_tenant"
  ON public.shopping_lists
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND family_id IN (SELECT public.family_ids_for_user())
  );

-- ---------------------------------------------------------------------------
-- 12. Shopping List Items — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "shopping_list_items_read_member" ON public.shopping_list_items;
DROP POLICY IF EXISTS "shopping_list_items_insert_member" ON public.shopping_list_items;
DROP POLICY IF EXISTS "shopping_list_items_update_member" ON public.shopping_list_items;
DROP POLICY IF EXISTS "shopping_list_items_delete_member" ON public.shopping_list_items;

CREATE POLICY "shopping_list_items_select_tenant"
  ON public.shopping_list_items
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND (
          sl.family_id IN (SELECT public.family_ids_for_user())
          OR EXISTS (
            SELECT 1 FROM public.shopping_list_shares sls
            WHERE sls.shopping_list_id = sl.id
              AND sls.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "shopping_list_items_insert_tenant"
  ON public.shopping_list_items
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND sl.family_id IN (SELECT public.family_ids_for_user())
    )
  );

CREATE POLICY "shopping_list_items_update_tenant"
  ON public.shopping_list_items
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND sl.family_id IN (SELECT public.family_ids_for_user())
    )
  );

CREATE POLICY "shopping_list_items_delete_tenant"
  ON public.shopping_list_items
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND sl.family_id IN (SELECT public.family_ids_for_user())
    )
  );

-- ---------------------------------------------------------------------------
-- 13. Shopping List Shares — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "shopping_list_shares_read_member" ON public.shopping_list_shares;
DROP POLICY IF EXISTS "shopping_list_shares_insert_member" ON public.shopping_list_shares;
DROP POLICY IF EXISTS "shopping_list_shares_delete_member" ON public.shopping_list_shares;

CREATE POLICY "shopping_list_shares_select_tenant"
  ON public.shopping_list_shares
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_shares.shopping_list_id
        AND sl.family_id IN (SELECT public.family_ids_for_user())
    )
  );

CREATE POLICY "shopping_list_shares_insert_tenant"
  ON public.shopping_list_shares
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_shares.shopping_list_id
        AND sl.family_id IN (SELECT public.family_ids_for_user())
    )
  );

CREATE POLICY "shopping_list_shares_delete_tenant"
  ON public.shopping_list_shares
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_shares.shopping_list_id
        AND sl.family_id IN (SELECT public.family_ids_for_user())
    )
  );

-- ---------------------------------------------------------------------------
-- 14. HEB Orders — rewrite policies using tenant_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "heb_orders_read_org_member" ON public.heb_orders;
DROP POLICY IF EXISTS "heb_orders_insert_org_member" ON public.heb_orders;
DROP POLICY IF EXISTS "heb_orders_update_org_admin" ON public.heb_orders;
DROP POLICY IF EXISTS "heb_orders_delete_org_admin" ON public.heb_orders;

CREATE POLICY "heb_orders_select_tenant"
  ON public.heb_orders
  FOR SELECT
  USING (tenant_id IN (SELECT public.tenant_ids_for_user()));

CREATE POLICY "heb_orders_insert_tenant"
  ON public.heb_orders
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT public.tenant_ids_for_user()));

CREATE POLICY "heb_orders_update_tenant"
  ON public.heb_orders
  FOR UPDATE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = heb_orders.tenant_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "heb_orders_delete_tenant"
  ON public.heb_orders
  FOR DELETE
  USING (
    tenant_id IN (SELECT public.tenant_ids_for_user())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = heb_orders.tenant_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 15. Profiles — optimize with tenant_ids_for_user()
-- ---------------------------------------------------------------------------
-- Profiles table doesn't have tenant_id (profiles are user-level), so we
-- keep the existing self-access policies and optimize the cross-org read
-- policy to use the helper function.

DROP POLICY IF EXISTS "profiles_read_same_org" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "profiles_select_tenant"
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id IN (SELECT public.tenant_ids_for_user())
        AND om.user_id = profiles.id
    )
  );

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 16. Auth Audit Log — keep existing policies as-is (user-level, no tenant_id)
-- ---------------------------------------------------------------------------
-- No changes needed. auth_audit_log policies from migration 008 remain:
--   - auth_audit_log_read_own: user_id = auth.uid()
--   - auth_audit_log_insert_service: auth.role() = 'service_role'
--   - auth_audit_log_no_update: USING (false)
--   - auth_audit_log_no_delete: USING (false)

-- ---------------------------------------------------------------------------
-- 17. Recipes — keep existing public-read policies (no tenant scoping)
-- ---------------------------------------------------------------------------
-- Recipes are shared/global resources. No changes needed.

-- ---------------------------------------------------------------------------
-- 18. Composite indexes on (tenant_id, id) for partition-pruning queries
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_families_tenant_id_id       ON public.families(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_tenant_id_id     ON public.meal_plans(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_tenant_id_id ON public.shopping_lists(tenant_id, id);
