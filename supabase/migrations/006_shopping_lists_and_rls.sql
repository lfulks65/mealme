-- ============================================================================
-- MealMe: Shopping Lists, Shopping List Items & RLS
-- ============================================================================
-- This migration creates:
--   1. `shopping_lists` table (per-family, optionally linked to meal plan)
--   2. `shopping_list_items` table (individual items with category & check-off)
--   3. `shopping_list_shares` table (sharing lists with other family members)
--   4. Indexes for common query patterns
--   5. RLS policies scoped to family membership
--
-- Prerequisites: families, family_members tables from migration 003
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Shopping Lists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  meal_plan_id  UUID,  -- nullable: standalone lists have no meal plan
  name          TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'active'  -- 'active' | 'completed'
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_family_id    ON public.shopping_lists(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan_id ON public.shopping_lists(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_by   ON public.shopping_lists(created_by);

-- ---------------------------------------------------------------------------
-- 2. Shopping List Items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id  UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  ingredient_name   TEXT NOT NULL,
  quantity          NUMERIC NOT NULL DEFAULT 0,
  unit              TEXT NOT NULL DEFAULT 'piece',
  category          TEXT NOT NULL DEFAULT 'other',  -- 'produce' | 'dairy' | 'meat' | 'pantry' | 'frozen' | 'bakery' | 'other'
  checked           BOOLEAN NOT NULL DEFAULT false,
  recipe_id         UUID,  -- nullable: manual items have no recipe source
  recipe_source     TEXT,  -- nullable: e.g. "MealMe Library" or recipe title
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id   ON public.shopping_list_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe_id ON public.shopping_list_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_category  ON public.shopping_list_items(category);

-- ---------------------------------------------------------------------------
-- 3. Shopping List Shares (access control for sharing with family members)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_list_shares (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id  UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shopping_list_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_shares_list_id  ON public.shopping_list_shares(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_shares_user_id  ON public.shopping_list_shares(user_id);

-- ---------------------------------------------------------------------------
-- 4. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_shares ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. Shopping Lists RLS Policies
-- ---------------------------------------------------------------------------

-- Family members can read shopping lists for their family
-- Also allow users who have been granted access via shopping_list_shares
CREATE POLICY "shopping_lists_read_member"
  ON public.shopping_lists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = shopping_lists.family_id
        AND family_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.shopping_list_shares
      WHERE shopping_list_shares.shopping_list_id = shopping_lists.id
        AND shopping_list_shares.user_id = auth.uid()
    )
  );

-- Family members can create shopping lists for their family
CREATE POLICY "shopping_lists_insert_member"
  ON public.shopping_lists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = shopping_lists.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Family members can update shopping lists for their family
CREATE POLICY "shopping_lists_update_member"
  ON public.shopping_lists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = shopping_lists.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- Family members can delete shopping lists for their family
CREATE POLICY "shopping_lists_delete_member"
  ON public.shopping_lists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members
      WHERE family_members.family_id = shopping_lists.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Shopping List Items RLS Policies
-- ---------------------------------------------------------------------------

-- Users can read items for lists they have access to
CREATE POLICY "shopping_list_items_read_member"
  ON public.shopping_list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shopping_lists sl
      LEFT JOIN public.shopping_list_shares sls
        ON sls.shopping_list_id = sl.id
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND (
          EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.family_id = sl.family_id AND fm.user_id = auth.uid()
          )
          OR sls.user_id = auth.uid()
        )
    )
  );

-- Family members can insert items for lists in their family
CREATE POLICY "shopping_list_items_insert_member"
  ON public.shopping_list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shopping_lists sl
      JOIN public.family_members fm
        ON fm.family_id = sl.family_id
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND fm.user_id = auth.uid()
    )
  );

-- Family members can update items for lists in their family
CREATE POLICY "shopping_list_items_update_member"
  ON public.shopping_list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.shopping_lists sl
      JOIN public.family_members fm
        ON fm.family_id = sl.family_id
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND fm.user_id = auth.uid()
    )
  );

-- Family members can delete items for lists in their family
CREATE POLICY "shopping_list_items_delete_member"
  ON public.shopping_list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.shopping_lists sl
      JOIN public.family_members fm
        ON fm.family_id = sl.family_id
      WHERE sl.id = shopping_list_items.shopping_list_id
        AND fm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Shopping List Shares RLS Policies
-- ---------------------------------------------------------------------------

-- Family members can read shares for lists in their family
CREATE POLICY "shopping_list_shares_read_member"
  ON public.shopping_list_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shopping_lists sl
      JOIN public.family_members fm
        ON fm.family_id = sl.family_id
      WHERE sl.id = shopping_list_shares.shopping_list_id
        AND fm.user_id = auth.uid()
    )
  );

-- Family members can share lists within their family
CREATE POLICY "shopping_list_shares_insert_member"
  ON public.shopping_list_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shopping_lists sl
      JOIN public.family_members fm
        ON fm.family_id = sl.family_id
      WHERE sl.id = shopping_list_shares.shopping_list_id
        AND fm.user_id = auth.uid()
    )
  );

-- Family members can remove shares from lists in their family
CREATE POLICY "shopping_list_shares_delete_member"
  ON public.shopping_list_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.shopping_lists sl
      JOIN public.family_members fm
        ON fm.family_id = sl.family_id
      WHERE sl.id = shopping_list_shares.shopping_list_id
        AND fm.user_id = auth.uid()
    )
  );
