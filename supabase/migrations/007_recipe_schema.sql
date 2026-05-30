-- =============================================================================
-- MealMe Recipe Schema
-- Supabase / PostgreSQL migration
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Recipes ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  cuisine       TEXT,
  image_url     TEXT,
  prep_minutes  INTEGER,
  cook_minutes  INTEGER,
  servings      INTEGER,
  calories      INTEGER,
  source_url    TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Full-text search support
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(cuisine, '')), 'C')
  ) STORED
);

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_recipes_fts ON recipes USING GIN (fts);

-- Additional indexes for common filter columns
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes (cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes (created_by);
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes (calories);
CREATE INDEX IF NOT EXISTS idx_recipes_prep_minutes ON recipes (prep_minutes);
CREATE INDEX IF NOT EXISTS idx_recipes_servings ON recipes (servings);

-- ── Recipe Ingredients ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    TEXT NOT NULL,
  unit        TEXT NOT NULL DEFAULT '',
  optional    BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_name ON recipe_ingredients (name);

-- ── Recipe Instructions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_instructions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number     INTEGER NOT NULL,
  instruction     TEXT NOT NULL,
  timer_minutes   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions (recipe_id);

-- ── Recipe Tags ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag ON recipe_tags (tag);

-- ── Recipe Dietary Info ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_dietary_info (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id     UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  restriction   TEXT NOT NULL,
  is_compliant  BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_recipe_dietary_info_recipe_id ON recipe_dietary_info (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_dietary_info_restriction ON recipe_dietary_info (restriction);

-- =============================================================================
-- Row-Level Security (RLS)
-- =============================================================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_dietary_info ENABLE ROW LEVEL SECURITY;

-- Recipes are readable by everyone, writable by authenticated users
CREATE POLICY "Recipes are publicly readable"
  ON recipes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  USING (created_by = auth.uid());

-- Child tables follow the same pattern: public read, restricted write
CREATE POLICY "Recipe ingredients are publicly readable"
  ON recipe_ingredients FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create recipe ingredients"
  ON recipe_ingredients FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Recipe instructions are publicly readable"
  ON recipe_instructions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create recipe instructions"
  ON recipe_instructions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Recipe tags are publicly readable"
  ON recipe_tags FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create recipe tags"
  ON recipe_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Recipe dietary info is publicly readable"
  ON recipe_dietary_info FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create recipe dietary info"
  ON recipe_dietary_info FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
