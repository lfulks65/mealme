-- ============================================================================
-- MealMe: HEB integration — shopping_list_items.heb_product_id + org store
-- ============================================================================
-- This migration adds:
--   1. `heb_product_id` column to `shopping_list_items` for linking
--      items to HEB products
--   2. `heb_store_id` column to `organizations` for org-level store config
--   3. `heb_orders` table for persisting HEB order references
--   4. RLS policies for the new table
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add heb_product_id to shopping_list_items
-- ---------------------------------------------------------------------------
ALTER TABLE public.shopping_list_items
  ADD COLUMN IF NOT EXISTS heb_product_id TEXT;

COMMENT ON COLUMN public.shopping_list_items.heb_product_id
  IS 'HEB product ID when this item has been matched to an HEB product.';

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_heb_product_id
  ON public.shopping_list_items(heb_product_id)
  WHERE heb_product_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Add heb_store_id to organizations
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS heb_store_id TEXT;

COMMENT ON COLUMN public.organizations.heb_store_id
  IS 'HEB store ID configured for this organization (e.g. "790").';

-- ---------------------------------------------------------------------------
-- 3. heb_orders table — persists HEB order references
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.heb_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  family_id     UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  heb_order_id  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING',
  fulfillment_type TEXT,
  shopping_list_id UUID,
  store_id      TEXT NOT NULL,
  placed_at     TIMESTAMPTZ,
  total_amount  NUMERIC(10, 2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (heb_order_id)
);

CREATE INDEX IF NOT EXISTS idx_heb_orders_org_id       ON public.heb_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_heb_orders_family_id    ON public.heb_orders(family_id);
CREATE INDEX IF NOT EXISTS idx_heb_orders_heb_order_id ON public.heb_orders(heb_order_id);
CREATE INDEX IF NOT EXISTS idx_heb_orders_status       ON public.heb_orders(status);

-- ---------------------------------------------------------------------------
-- 4. Enable RLS on heb_orders
-- ---------------------------------------------------------------------------
ALTER TABLE public.heb_orders ENABLE ROW LEVEL SECURITY;

-- Users can read HEB orders for their org
CREATE POLICY "heb_orders_read_org_member"
  ON public.heb_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = heb_orders.org_id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- Org members can create HEB orders for their org
CREATE POLICY "heb_orders_insert_org_member"
  ON public.heb_orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = heb_orders.org_id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- Org admins can update HEB orders (e.g. status sync)
CREATE POLICY "heb_orders_update_org_admin"
  ON public.heb_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = heb_orders.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Org admins can delete HEB orders
CREATE POLICY "heb_orders_delete_org_admin"
  ON public.heb_orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = heb_orders.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role IN ('owner', 'admin')
    )
  );
