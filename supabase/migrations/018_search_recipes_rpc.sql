-- =============================================================================
-- 018: search_recipes_rpc — complex recipe search with filtering, sorting,
--       and pagination via a Supabase RPC function.
--
-- Leverages:
--   - GIN FTS index on recipes.fts (from 007)
--   - Composite GIN index on (cuisine, fts) (from 016)
--   - Trigram indexes on recipes.title and recipe_ingredients.name (from 016)
--   - Covering indexes on (cuisine, prep_minutes), (prep_minutes, cook_minutes),
--     (servings, calories) (from 016)
--   - Indexes on difficulty and avg_rating (from 017)
-- =============================================================================

CREATE OR REPLACE FUNCTION search_recipes_rpc(
  p_query TEXT DEFAULT NULL,
  p_cuisine TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_dietary_restrictions TEXT[] DEFAULT '{}',
  p_max_prep_minutes INTEGER DEFAULT NULL,
  p_max_total_minutes INTEGER DEFAULT NULL,
  p_max_calories INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}',
  p_sort TEXT DEFAULT 'relevance',  -- 'relevance' | 'rating' | 'prep_time' | 'newest'
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, title TEXT, description TEXT, cuisine TEXT, difficulty TEXT,
  prep_minutes INTEGER, cook_minutes INTEGER, servings INTEGER, calories INTEGER,
  avg_rating NUMERIC, fts TSVECTOR, created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_tsquery TEXT;
BEGIN
  -- Build the tsquery string once for reuse in WHERE and ORDER BY
  IF p_query IS NOT NULL AND p_query <> '' THEN
    v_tsquery := array_to_string(regexp_split_to_array(p_query, '\s+'), ':* & ') || ':*';
  ELSE
    v_tsquery := NULL;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      r.id,
      r.title,
      r.description,
      r.cuisine,
      r.difficulty,
      r.prep_minutes,
      r.cook_minutes,
      r.servings,
      r.calories,
      r.avg_rating,
      r.fts,
      r.created_at,
      COUNT(*) OVER() AS total_count
    FROM recipes r
    WHERE
      -- Full-text search with prefix matching on the fts tsvector column
      (v_tsquery IS NULL OR r.fts @@ to_tsquery('english', v_tsquery))
      -- Filter by cuisine
      AND (p_cuisine IS NULL OR r.cuisine = p_cuisine)
      -- Filter by difficulty
      AND (p_difficulty IS NULL OR r.difficulty = p_difficulty)
      -- Filter by max prep time
      AND (p_max_prep_minutes IS NULL OR r.prep_minutes <= p_max_prep_minutes)
      -- Filter by max total time (prep + cook)
      AND (p_max_total_minutes IS NULL OR (r.prep_minutes + COALESCE(r.cook_minutes, 0)) <= p_max_total_minutes)
      -- Filter by max calories
      AND (p_max_calories IS NULL OR r.calories <= p_max_calories)
      -- Filter by tags: recipes matching ANY of the specified tags pass
      AND (p_tags = '{}' OR EXISTS (
        SELECT 1 FROM recipe_tags rt
        WHERE rt.recipe_id = r.id
          AND rt.tag ILIKE ANY(p_tags)
      ))
      -- Dietary restriction filter: ALL specified restrictions must be compliant
      AND (p_dietary_restrictions = '{}' OR NOT EXISTS (
        SELECT 1 FROM recipe_dietary_info rdi
        WHERE rdi.recipe_id = r.id
          AND rdi.restriction = ANY(p_dietary_restrictions)
          AND rdi.is_compliant = false
      ))
  )
  SELECT
    f.id,
    f.title,
    f.description,
    f.cuisine,
    f.difficulty,
    f.prep_minutes,
    f.cook_minutes,
    f.servings,
    f.calories,
    f.avg_rating,
    f.fts,
    f.created_at,
    f.total_count
  FROM filtered f
  ORDER BY
    -- Primary sort based on p_sort
    CASE p_sort
      WHEN 'rating' THEN -(f.avg_rating)
      WHEN 'prep_time' THEN (f.prep_minutes + COALESCE(f.cook_minutes, 0))
      WHEN 'newest' THEN -(EXTRACT(EPOCH FROM f.created_at))
      ELSE 0  -- relevance: handled by secondary sort below
    END,
    -- Relevance: ts_rank for text searches, created_at fallback for non-text
    CASE WHEN p_sort = 'relevance' AND v_tsquery IS NOT NULL
      THEN -ts_rank(f.fts, to_tsquery('english', v_tsquery))
      ELSE 0
    END,
    -- Final tiebreaker: newest first
    f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
