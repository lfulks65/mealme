-- ============================================================================
-- MealMe: Update preferences tables to match revised schema
-- ============================================================================
-- This migration alters the existing family_preferences and member_preferences
-- tables (created in migration 004) to match the revised preference schema:
--
--   1. family_preferences: replace budget_tier/household_size/notes with
--      budget_range jsonb
--   2. member_preferences: replace (family_id, user_id) composite key with
--      member_id referencing family_members(id)
--   3. Update RLS policies for the new column structure
--   4. Add new indexes
--
-- Prerequisites: migrations 004, 009, 010, 011 must have run first.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. family_preferences: add budget_range, drop old columns
-- ---------------------------------------------------------------------------

-- Add budget_range column with default
ALTER TABLE public.family_preferences
  ADD COLUMN IF NOT EXISTS budget_range JSONB NOT NULL DEFAULT '{"min": 0, "max": 500, "currency": "USD"}';

-- Drop columns that are replaced by budget_range
ALTER TABLE public.family_preferences
  DROP COLUMN IF EXISTS budget_tier;

ALTER TABLE public.family_preferences
  DROP COLUMN IF EXISTS household_size;

ALTER TABLE public.family_preferences
  DROP COLUMN IF EXISTS notes;

-- ---------------------------------------------------------------------------
-- 2. member_preferences: replace (family_id, user_id) with member_id
-- ---------------------------------------------------------------------------

-- Drop existing RLS policies that reference old columns
DROP POLICY IF EXISTS "member_preferences_select_tenant" ON public.member_preferences;
DROP POLICY IF EXISTS "member_preferences_insert_tenant" ON public.member_preferences;
DROP POLICY IF EXISTS "member_preferences_update_tenant" ON public.member_preferences;

-- Drop old RLS policies from migration 004 (may still exist if 011 didn't drop them)
DROP POLICY IF EXISTS "member_preferences_read_family_member" ON public.member_preferences;
DROP POLICY IF EXISTS "member_preferences_insert_self" ON public.member_preferences;
DROP POLICY IF EXISTS "member_preferences_update_self" ON public.member_preferences;

-- Drop existing unique constraint on (family_id, user_id)
ALTER TABLE public.member_preferences
  DROP CONSTRAINT IF EXISTS member_preferences_family_id_user_id_key;

-- Drop existing indexes on old columns
DROP INDEX IF EXISTS idx_member_preferences_family_id;
DROP INDEX IF EXISTS idx_member_preferences_user_id;

-- Add member_id column referencing family_members(id)
ALTER TABLE public.member_preferences
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE;

-- Backfill member_id from existing family_members rows
UPDATE public.member_preferences mp
SET member_id = fm.id
FROM public.family_members fm
WHERE fm.family_id = mp.family_id
  AND fm.user_id = mp.user_id
  AND mp.member_id IS NULL;

-- Make member_id NOT NULL (after backfill)
ALTER TABLE public.member_preferences
  ALTER COLUMN member_id SET NOT NULL;

-- Add UNIQUE constraint on member_id
ALTER TABLE public.member_preferences
  ADD CONSTRAINT member_preferences_member_id_key UNIQUE (member_id);

-- Drop columns that are replaced by member_id
ALTER TABLE public.member_preferences
  DROP COLUMN IF EXISTS family_id;

ALTER TABLE public.member_preferences
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.member_preferences
  DROP COLUMN IF EXISTS is_override;

-- Drop tenant_id from member_preferences (now derivable from family_members)
ALTER TABLE public.member_preferences
  DROP COLUMN IF EXISTS tenant_id;

-- Add index on member_id
CREATE INDEX IF NOT EXISTS idx_member_preferences_member_id ON public.member_preferences(member_id);

-- ---------------------------------------------------------------------------
-- 3. family_preferences: update RLS policies
-- ---------------------------------------------------------------------------

-- Drop existing tenant-based policies
DROP POLICY IF EXISTS "family_preferences_select_tenant" ON public.family_preferences;
DROP POLICY IF EXISTS "family_preferences_insert_tenant" ON public.family_preferences;
DROP POLICY IF EXISTS "family_preferences_update_tenant" ON public.family_preferences;

-- Drop old policies from migration 004
DROP POLICY IF EXISTS "family_preferences_read_member" ON public.family_preferences;
DROP POLICY IF EXISTS "family_preferences_insert_member" ON public.family_preferences;
DROP POLICY IF EXISTS "family_preferences_update_member" ON public.family_preferences;

-- Family members can read family preferences
CREATE POLICY "Family members can read family preferences"
  ON public.family_preferences FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Family owners/admins can write family preferences
CREATE POLICY "Family members can write family preferences"
  ON public.family_preferences FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. member_preferences: new RLS policies using member_id
-- ---------------------------------------------------------------------------

-- Members can read own preferences
CREATE POLICY "Members can read own preferences"
  ON public.member_preferences FOR SELECT
  USING (
    member_id IN (SELECT id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Members can write own preferences
CREATE POLICY "Members can write own preferences"
  ON public.member_preferences FOR ALL
  USING (
    member_id IN (SELECT id FROM public.family_members WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_family_preferences_family_id ON public.family_preferences(family_id);
