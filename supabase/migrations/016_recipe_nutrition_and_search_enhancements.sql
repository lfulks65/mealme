-- =============================================================================
-- 016: Recipe Nutrition Table, Rename recipe_instructions → recipe_steps,
--      Enhanced Search Indexes
-- =============================================================================

-- ── 1. Rename recipe_instructions → recipe_steps ─────────────────────────────

ALTER TABLE recipe_instructions RENAME TO recipe_steps;

-- Rename the old index to match the new table name
ALTER INDEX idx_recipe_instructions_recipe_id RENAME TO idx_recipe_steps_recipe_id;

-- Rename RLS policies to match the new table name
DROP POLICY IF EXISTS "Recipe instructions are publicly readable" ON recipe_steps;
DROP POLICY IF EXISTS "Authenticated users can create recipe instructions" ON recipe_steps;

CREATE POLICY "Recipe steps are publicly readable"
  ON recipe_steps FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create recipe steps"
  ON recipe_steps FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 2. Add recipe_nutrition table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_nutrition (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  calories        INTEGER,
  protein_g       NUMERIC(6,1),
  carbs_g         NUMERIC(6,1),
  fat_g           NUMERIC(6,1),
  fiber_g         NUMERIC(6,1),
  sugar_g         NUMERIC(6,1),
  sodium_mg       INTEGER,
  cholesterol_mg  INTEGER,
  serving_size    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for recipe_nutrition
CREATE INDEX IF NOT EXISTS idx_recipe_nutrition_recipe_id ON recipe_nutrition (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_nutrition_calories ON recipe_nutrition (calories);
CREATE INDEX IF NOT EXISTS idx_recipe_nutrition_protein_g ON recipe_nutrition (protein_g);

-- RLS for recipe_nutrition
ALTER TABLE recipe_nutrition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipe nutrition is publicly readable"
  ON recipe_nutrition FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create recipe nutrition"
  ON recipe_nutrition FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 3. calories column already exists on recipes (007) — skip ──────────────

-- ── 4. Enhanced full-text search configuration ──────────────────────────────

-- FTS configuration: English stemmer, weights A=title, B=description, C=cuisine
-- The `fts` tsvector column and GIN index were created in 007_recipe_schema.sql.
-- We add composite and trigram indexes for improved query patterns.

-- Composite GIN index on (cuisine, fts) for cuisine-filtered text searches
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_fts ON recipes USING GIN (cuisine, fts);

-- pg_trgm extension for fuzzy/autocomplete search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on recipes.title for fuzzy/autocomplete search
CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm ON recipes USING GIN (title gin_trgm_ops);

-- Trigram index on recipe_ingredients.name for ingredient search
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_name_trgm ON recipe_ingredients USING GIN (name gin_trgm_ops);

-- ── 5. Search-optimized covering indexes ────────────────────────────────────

-- (cuisine, prep_minutes) for "quick [cuisine] meals" queries
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_prep ON recipes (cuisine, prep_minutes);

-- (prep_minutes, cook_minutes) for total-time queries
CREATE INDEX IF NOT EXISTS idx_recipes_prep_cook ON recipes (prep_minutes, cook_minutes);

-- (servings, calories) for serving-size + calorie-range filters
CREATE INDEX IF NOT EXISTS idx_recipes_servings_calories ON recipes (servings, calories);
