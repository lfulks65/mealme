-- =============================================================================
-- 017: Add difficulty & avg_rating columns to recipes, backfill, and indexes
-- =============================================================================

-- ── 1. Add difficulty column ────────────────────────────────────────────────

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium';

-- Backfill: classify existing recipes by total time
UPDATE recipes
SET difficulty = CASE
  WHEN (prep_minutes + COALESCE(cook_minutes, 0)) <= 30 THEN 'easy'
  WHEN (prep_minutes + COALESCE(cook_minutes, 0)) <= 60 THEN 'medium'
  ELSE 'hard'
END
WHERE difficulty = 'medium';  -- only touch rows still at default

-- Add a CHECK constraint for valid difficulty values
ALTER TABLE recipes ADD CONSTRAINT chk_recipes_difficulty
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- ── 2. Add avg_rating column ────────────────────────────────────────────────

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0;

-- Seed random ratings between 3.0 and 5.0 for existing recipes
-- Uses random() scaled to [3.0, 5.0], rounded to 2 decimal places
UPDATE recipes
SET avg_rating = ROUND((3.0 + (random() * 2.0))::numeric, 2)
WHERE avg_rating = 0;

-- ── 3. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes (difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_avg_rating ON recipes (avg_rating);
