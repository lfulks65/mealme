-- ============================================================================
-- MealMe: Family & Member Preferences with RLS
-- ============================================================================
-- This migration creates:
--   1. `family_preferences` table (per-family dietary & planning defaults)
--   2. `member_preferences` table (per-user overrides within a family)
--   3. Indexes for common query patterns
--   4. RLS policies scoped to family membership
--
-- Prerequisites: families, family_members tables from migration 003
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Family Preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  dietary_restrictions  JSONB NOT NULL DEFAULT '[]',
  allergies             JSONB NOT NULL DEFAULT '[]',
  cuisine_preferences   JSONB NOT NULL DEFAULT '[]',
  budget_tier           TEXT NOT NULL DEFAULT 'moderate',
  household_size        INTEGER NOT NULL DEFAULT 2,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id)
);

CREATE INDEX IF NOT EXISTS idx_family_preferences_family_id ON public.family_preferences(family_id);

-- ---------------------------------------------------------------------------
-- 2. Member Preferences (per-user overrides within a family)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dietary_restrictions  JSONB NOT NULL DEFAULT '[]',
  allergies             JSONB NOT NULL DEFAULT '[]',
  cuisine_preferences   JSONB NOT NULL DEFAULT '[]',
  is_override           BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_member_preferences_family_id ON public.member_preferences(family_id);
CREATE INDEX IF NOT EXISTS idx_member_preferences_user_id   ON public.member_preferences(user_id);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.family_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_preferences ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Family Preferences RLS Policies
-- ---------------------------------------------------------------------------

-- Family members can read their family's preferences
CREATE POLICY "family_preferences_read_member"
  ON public.family_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = family_preferences.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Family members can insert preferences for their family
CREATE POLICY "family_preferences_insert_member"
  ON public.family_preferences
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = family_preferences.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Family members can update their family's preferences
CREATE POLICY "family_preferences_update_member"
  ON public.family_preferences
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = family_preferences.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Member Preferences RLS Policies
-- ---------------------------------------------------------------------------

-- Family members can read member preferences within their family
CREATE POLICY "member_preferences_read_family_member"
  ON public.member_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = member_preferences.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Users can insert their own member preferences within a family they belong to
CREATE POLICY "member_preferences_insert_self"
  ON public.member_preferences
  FOR INSERT
  WITH CHECK (
    member_preferences.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = member_preferences.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Users can update their own member preferences within a family they belong to
CREATE POLICY "member_preferences_update_self"
  ON public.member_preferences
  FOR UPDATE
  USING (
    member_preferences.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = member_preferences.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Updated-at trigger function (reusable)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on family_preferences
CREATE TRIGGER trg_family_preferences_updated_at
  BEFORE UPDATE ON public.family_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-update updated_at on member_preferences
CREATE TRIGGER trg_member_preferences_updated_at
  BEFORE UPDATE ON public.member_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
