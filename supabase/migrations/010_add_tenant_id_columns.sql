-- ============================================================================
-- MealMe: Add tenant_id columns, indexes, and auto-populate triggers
-- ============================================================================
-- This migration adds a denormalized `tenant_id` (UUID FK → organizations.id)
-- column to every tenant-scoped table. This enables:
--   - Simpler, faster RLS policies (tenant_id IN (SELECT org_id FROM
--     organization_members WHERE user_id = auth.uid()))
--   - Efficient partition pruning for tenant-scoped queries
--   - Better support for future scaling (e.g. schema-level isolation)
--
-- Prerequisites: migration 009 (table renames) must have run first.
-- All table names use the post-rename names.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add tenant_id columns
-- ---------------------------------------------------------------------------
-- All tenant_id columns reference organizations(id) with ON DELETE CASCADE
-- so that if an org is deleted, all its tenant-scoped data is cleaned up.

-- Organization-level tables (tenant_id = org_id)
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.families           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invites            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.heb_orders         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Family-level tables (tenant_id = org_id derived from family)
ALTER TABLE public.family_members      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.family_preferences   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.member_preferences   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.meal_plans           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.meal_plan_entries    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.shopping_lists       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.shopping_list_items  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.shopping_list_shares ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Backfill tenant_id from existing data
-- ---------------------------------------------------------------------------
-- Tables with a direct org_id column:
UPDATE public.organization_members SET tenant_id = org_id WHERE tenant_id IS NULL;
UPDATE public.families           SET tenant_id = org_id WHERE tenant_id IS NULL;
UPDATE public.invites            SET tenant_id = org_id WHERE tenant_id IS NULL;
UPDATE public.heb_orders         SET tenant_id = org_id WHERE tenant_id IS NULL;

-- Tables that derive tenant_id from their family's org_id:
UPDATE public.family_members fm
  SET tenant_id = (SELECT f.org_id FROM public.families f WHERE f.id = fm.family_id)
  WHERE fm.tenant_id IS NULL;

UPDATE public.family_preferences fp
  SET tenant_id = (SELECT f.org_id FROM public.families f WHERE f.id = fp.family_id)
  WHERE fp.tenant_id IS NULL;

UPDATE public.member_preferences mp
  SET tenant_id = (SELECT f.org_id FROM public.families f WHERE f.id = mp.family_id)
  WHERE mp.tenant_id IS NULL;

UPDATE public.meal_plans mp
  SET tenant_id = (SELECT f.org_id FROM public.families f WHERE f.id = mp.family_id)
  WHERE mp.tenant_id IS NULL;

-- meal_plan_entries: derive through meal_plans → families
UPDATE public.meal_plan_entries mpe
  SET tenant_id = (
    SELECT mp.tenant_id
    FROM public.meal_plans mp
    WHERE mp.id = mpe.meal_plan_id
  )
  WHERE mpe.tenant_id IS NULL;

-- shopping_lists: derive from family
UPDATE public.shopping_lists sl
  SET tenant_id = (SELECT f.org_id FROM public.families f WHERE f.id = sl.family_id)
  WHERE sl.tenant_id IS NULL;

-- shopping_list_items: derive through shopping_lists → families
UPDATE public.shopping_list_items sli
  SET tenant_id = (
    SELECT sl.tenant_id
    FROM public.shopping_lists sl
    WHERE sl.id = sli.shopping_list_id
  )
  WHERE sli.tenant_id IS NULL;

-- shopping_list_shares: derive through shopping_lists → families
UPDATE public.shopping_list_shares sls
  SET tenant_id = (
    SELECT sl.tenant_id
    FROM public.shopping_lists sl
    WHERE sl.id = sls.shopping_list_id
  )
  WHERE sls.tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Set NOT NULL constraint after backfill
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_members ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.families           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.invites            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.heb_orders         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.family_members      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.family_preferences   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.member_preferences   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.meal_plans           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.meal_plan_entries    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shopping_lists       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shopping_list_items  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shopping_list_shares ALTER COLUMN tenant_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Create indexes on tenant_id
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_organization_members_tenant_id ON public.organization_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_families_tenant_id            ON public.families(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invites_tenant_id             ON public.invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_heb_orders_tenant_id          ON public.heb_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_family_members_tenant_id      ON public.family_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_family_preferences_tenant_id   ON public.family_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_preferences_tenant_id   ON public.member_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_tenant_id           ON public.meal_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_tenant_id    ON public.meal_plan_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_tenant_id       ON public.shopping_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_tenant_id  ON public.shopping_list_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_shares_tenant_id ON public.shopping_list_shares(tenant_id);

-- ---------------------------------------------------------------------------
-- 5. Trigger functions to auto-populate tenant_id on INSERT
-- ---------------------------------------------------------------------------

-- 5a. Reusable function for tables with a direct org_id column
--     (organization_members, families, invites, heb_orders)
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_org()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := NEW.org_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5b. family_members: look up family's org_id from families table
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_family()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT f.org_id INTO NEW.tenant_id
    FROM public.families f
    WHERE f.id = NEW.family_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5c. family_preferences: look up family's org_id from families table
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_family_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT f.org_id INTO NEW.tenant_id
    FROM public.families f
    WHERE f.id = NEW.family_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5d. member_preferences: look up family's org_id from families table
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_member_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT f.org_id INTO NEW.tenant_id
    FROM public.families f
    WHERE f.id = NEW.family_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5e. meal_plans: look up family's org_id from families table
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_meal_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT f.org_id INTO NEW.tenant_id
    FROM public.families f
    WHERE f.id = NEW.family_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5f. meal_plan_entries: look up meal_plan's tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_meal_plan_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT mp.tenant_id INTO NEW.tenant_id
    FROM public.meal_plans mp
    WHERE mp.id = NEW.meal_plan_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5g. shopping_lists: look up family's org_id from families table
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_shopping_list()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT f.org_id INTO NEW.tenant_id
    FROM public.families f
    WHERE f.id = NEW.family_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5h. shopping_list_items: look up shopping_list's tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_shopping_list_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT sl.tenant_id INTO NEW.tenant_id
    FROM public.shopping_lists sl
    WHERE sl.id = NEW.shopping_list_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5i. shopping_list_shares: look up shopping_list's tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_shopping_list_share()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT sl.tenant_id INTO NEW.tenant_id
    FROM public.shopping_lists sl
    WHERE sl.id = NEW.shopping_list_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Attach triggers to each table
-- ---------------------------------------------------------------------------
-- Each trigger fires BEFORE INSERT to auto-populate tenant_id.

-- Organization-level tables (use the shared set_tenant_id_from_org function)
CREATE TRIGGER trg_organization_members_set_tenant_id
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_org();

CREATE TRIGGER trg_families_set_tenant_id
  BEFORE INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_org();

CREATE TRIGGER trg_invites_set_tenant_id
  BEFORE INSERT ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_org();

CREATE TRIGGER trg_heb_orders_set_tenant_id
  BEFORE INSERT ON public.heb_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_org();

-- Family-level tables (use table-specific trigger functions)
CREATE TRIGGER trg_family_members_set_tenant_id
  BEFORE INSERT ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_family();

CREATE TRIGGER trg_family_preferences_set_tenant_id
  BEFORE INSERT ON public.family_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_family_preferences();

CREATE TRIGGER trg_member_preferences_set_tenant_id
  BEFORE INSERT ON public.member_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_member_preferences();

CREATE TRIGGER trg_meal_plans_set_tenant_id
  BEFORE INSERT ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_meal_plan();

CREATE TRIGGER trg_meal_plan_entries_set_tenant_id
  BEFORE INSERT ON public.meal_plan_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_meal_plan_entry();

CREATE TRIGGER trg_shopping_lists_set_tenant_id
  BEFORE INSERT ON public.shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_shopping_list();

CREATE TRIGGER trg_shopping_list_items_set_tenant_id
  BEFORE INSERT ON public.shopping_list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_shopping_list_item();

CREATE TRIGGER trg_shopping_list_shares_set_tenant_id
  BEFORE INSERT ON public.shopping_list_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_shopping_list_share();
