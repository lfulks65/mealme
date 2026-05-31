-- ============================================================================
-- MealMe: Migration Verification — Multi-Tenant Schema
-- ============================================================================
-- This migration performs sanity checks on the multi-tenant schema
-- established by migrations 009–011. It uses RAISE NOTICE / RAISE WARNING
-- (no hard failures) so it never blocks a migration run.
--
-- Architecture overview:
--
--   Organization (tenant) ──────────────────────────────────────────
--     │  tenant_id = organizations.id on every tenant-scoped table  │
--     │                                                             │
--     ├── organization_members  (direct org_id)                     │
--     ├── families             (direct org_id)                      │
--     ├── invites              (direct org_id)                      │
--     ├── heb_orders           (direct org_id)                      │
--     │                                                             │
--     └── Family-scoped tables (tenant_id derived from family → org)│
--           ├── family_members                                      │
--           ├── family_preferences                                  │
--           ├── member_preferences                                  │
--           ├── meal_plans                                          │
--           ├── meal_plan_entries                                   │
--           ├── shopping_lists                                      │
--           ├── shopping_list_items                                 │
--           └── shopping_list_shares                                │
--
--   Helper functions:
--     - tenant_ids_for_user()  → SETOF UUID (org IDs for auth.uid())
--     - family_ids_for_user()   → SETOF UUID (family IDs for auth.uid())
--
--   RLS pattern (all tenant-scoped tables):
--     USING (tenant_id IN (SELECT public.tenant_ids_for_user()))
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Verify tenant_id columns exist on all tenant-scoped tables
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_missing TEXT[];
  t         TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_members',
    'families',
    'invites',
    'heb_orders',
    'family_members',
    'family_preferences',
    'member_preferences',
    'meal_plans',
    'meal_plan_entries',
    'shopping_lists',
    'shopping_list_items',
    'shopping_list_shares'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'tenant_id'
    ) THEN
      v_missing := array_append(v_missing, t);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE WARNING 'tenant_id column missing on tables: %', array_to_string(v_missing, ', ');
  ELSE
    RAISE NOTICE '✓ All 12 tenant-scoped tables have tenant_id column';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Verify all tenant_id columns are NOT NULL
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_nullable TEXT[];
  t          TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_members',
    'families',
    'invites',
    'heb_orders',
    'family_members',
    'family_preferences',
    'member_preferences',
    'meal_plans',
    'meal_plan_entries',
    'shopping_lists',
    'shopping_list_items',
    'shopping_list_shares'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'tenant_id'
        AND is_nullable = 'YES'
    ) THEN
      v_nullable := array_append(v_nullable, t);
    END IF;
  END LOOP;

  IF array_length(v_nullable, 1) IS NOT NULL THEN
    RAISE WARNING 'tenant_id is nullable on tables: %', array_to_string(v_nullable, ', ');
  ELSE
    RAISE NOTICE '✓ All tenant_id columns are NOT NULL';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Verify tenant_id indexes exist
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_missing_idx TEXT[];
  t             TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_members',
    'families',
    'invites',
    'heb_orders',
    'family_members',
    'family_preferences',
    'member_preferences',
    'meal_plans',
    'meal_plan_entries',
    'shopping_lists',
    'shopping_list_items',
    'shopping_list_shares'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = t
        AND indexdef LIKE '%tenant_id%'
    ) THEN
      v_missing_idx := array_append(v_missing_idx, t);
    END IF;
  END LOOP;

  IF array_length(v_missing_idx, 1) IS NOT NULL THEN
    RAISE WARNING 'tenant_id index missing on tables: %', array_to_string(v_missing_idx, ', ');
  ELSE
    RAISE NOTICE '✓ All tenant-scoped tables have tenant_id indexes';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Verify RLS is enabled on all tenant-scoped tables
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_no_rls TEXT[];
  t        TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_members',
    'families',
    'invites',
    'heb_orders',
    'family_members',
    'family_preferences',
    'member_preferences',
    'meal_plans',
    'meal_plan_entries',
    'shopping_lists',
    'shopping_list_items',
    'shopping_list_shares'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = t
        AND rowsecurity = true
    ) THEN
      v_no_rls := array_append(v_no_rls, t);
    END IF;
  END LOOP;

  IF array_length(v_no_rls, 1) IS NOT NULL THEN
    RAISE WARNING 'RLS not enabled on tables: %', array_to_string(v_no_rls, ', ');
  ELSE
    RAISE NOTICE '✓ RLS is enabled on all tenant-scoped tables';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Verify helper functions exist
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'tenant_ids_for_user'
  ) THEN
    RAISE WARNING 'Function tenant_ids_for_user() not found';
  ELSE
    RAISE NOTICE '✓ tenant_ids_for_user() function exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'family_ids_for_user'
  ) THEN
    RAISE WARNING 'Function family_ids_for_user() not found';
  ELSE
    RAISE NOTICE '✓ family_ids_for_user() function exists';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Verify no NULL tenant_id values exist in any table
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_null_tables TEXT[];
  t             TEXT;
  v_count       BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_members',
    'families',
    'invites',
    'heb_orders',
    'family_members',
    'family_preferences',
    'member_preferences',
    'meal_plans',
    'meal_plan_entries',
    'shopping_lists',
    'shopping_list_items',
    'shopping_list_shares'
  ]
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', t) INTO v_count;
    IF v_count > 0 THEN
      v_null_tables := array_append(v_null_tables, format('%s (%s rows)', t, v_count));
    END IF;
  END LOOP;

  IF array_length(v_null_tables, 1) IS NOT NULL THEN
    RAISE WARNING 'NULL tenant_id values found in: %', array_to_string(v_null_tables, ', ');
  ELSE
    RAISE NOTICE '✓ No NULL tenant_id values in any tenant-scoped table';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Summary
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Multi-tenant schema verification complete.';
  RAISE NOTICE 'Any warnings above indicate issues that should be addressed.';
  RAISE NOTICE '========================================';
END;
$$;
