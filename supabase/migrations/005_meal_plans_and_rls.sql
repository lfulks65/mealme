-- ============================================================================
-- MealMe: Meal Plans, Meal Plan Entries & RLS
-- ============================================================================
-- This migration creates:
--   1. `meal_plans` table (weekly meal plan scoped to a family)
--   2. `meal_plan_entries` table (individual recipe assignments per day/slot)
--   3. Indexes for common query patterns
--   4. RLS policies scoped to family membership
--
-- Prerequisites: families, family_members tables from migration 003
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Meal Plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,          -- Monday of the plan week
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'active' | 'archived'
  UNIQUE (family_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_family_id        ON public.meal_plans(family_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start_date  ON public.meal_plans(week_start_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status           ON public.meal_plans(status);

-- ---------------------------------------------------------------------------
-- 2. Meal Plan Entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plan_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id  UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  meal_slot     TEXT NOT NULL,  -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipe_id     UUID,           -- nullable to allow empty slots
  servings      INTEGER NOT NULL DEFAULT 4,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_meal_plan_id ON public.meal_plan_entries(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_date         ON public.meal_plan_entries(date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_meal_slot    ON public.meal_plan_entries(meal_slot);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Meal Plans RLS Policies
-- ---------------------------------------------------------------------------

-- Family members can read meal plans for their family
CREATE POLICY "meal_plans_read_member"
  ON public.meal_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = meal_plans.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Family members can create meal plans for their family
CREATE POLICY "meal_plans_insert_member"
  ON public.meal_plans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = meal_plans.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Family members can update meal plans for their family
CREATE POLICY "meal_plans_update_member"
  ON public.meal_plans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = meal_plans.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Only family members can delete meal plans
CREATE POLICY "meal_plans_delete_member"
  ON public.meal_plans
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = meal_plans.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Meal Plan Entries RLS Policies
-- ---------------------------------------------------------------------------

-- Family members can read entries for plans in their family
CREATE POLICY "meal_plan_entries_read_member"
  ON public.meal_plan_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.meal_plans mp
      JOIN public.family_members fm
        ON fm.family_id = mp.family_id
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND fm.user_id = auth.uid()
    )
  );

-- Family members can create entries for plans in their family
CREATE POLICY "meal_plan_entries_insert_member"
  ON public.meal_plan_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.meal_plans mp
      JOIN public.family_members fm
        ON fm.family_id = mp.family_id
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND fm.user_id = auth.uid()
    )
  );

-- Family members can update entries for plans in their family
CREATE POLICY "meal_plan_entries_update_member"
  ON public.meal_plan_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.meal_plans mp
      JOIN public.family_members fm
        ON fm.family_id = mp.family_id
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND fm.user_id = auth.uid()
    )
  );

-- Family members can delete entries for plans in their family
CREATE POLICY "meal_plan_entries_delete_member"
  ON public.meal_plan_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.meal_plans mp
      JOIN public.family_members fm
        ON fm.family_id = mp.family_id
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND fm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Updated-at trigger for meal_plans
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
