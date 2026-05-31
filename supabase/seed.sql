-- ============================================================================
-- MealMe: Local Development Seed Data
-- ============================================================================
-- This file is executed by `supabase db reset` to populate the local
-- development database with test data. It should NEVER be run in
-- production.
--
-- ⚠️  DO NOT use these credentials in any environment other than local dev.
--
-- Multi-tenant flow demonstrated:
--   Organization (tenant) → Family → Members, Preferences, Meal Plans,
--   Shopping Lists
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create test user via Supabase Auth
-- ---------------------------------------------------------------------------
-- The auth.users table is managed by Supabase Auth. We insert directly
-- into auth.users with a pre-hashed password for local development only.
-- Password: Test12345678!
-- The hash below is a bcrypt hash of "Test12345678!" compatible with
-- Supabase GoTrue (bcrypt cost 10).
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),                                    -- id
  '00000000-0000-0000-0000-000000000000',               -- instance_id
  'authenticated',                                      -- aud
  'authenticated',                                      -- role
  'test@mealme.app',                                    -- email
  crypt('Test12345678!', gen_salt('bf')),               -- encrypted_password
  now(),                                                -- email_confirmed_at
  '',                                                   -- confirmation_token
  '',                                                   -- email_change
  '',                                                   -- email_change_token_new
  '',                                                   -- recovery_token
  now(),                                                -- created_at
  now(),                                                -- updated_at
  '{"provider": "email", "providers": ["email"]}',     -- raw_app_meta_data
  '{"full_name": "Test User"}'                          -- raw_user_meta_data
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Capture the test user ID for subsequent inserts
-- ---------------------------------------------------------------------------
-- The handle_new_user() trigger will have already created the profile.
-- We capture the user ID to create the personal organization and all
-- downstream seed data.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_user_id     UUID;
  v_org_id      UUID;
  v_family_id   UUID;
  v_meal_plan_id UUID;
  v_shopping_list_id UUID;
  v_week_start  DATE;
BEGIN
  -- Get the test user's ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'test@mealme.app'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Test user not found, skipping seed data';
    RETURN;
  END IF;

  -- Verify the profile was created by the trigger
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE NOTICE 'Profile not found for test user, creating manually';
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (v_user_id, 'Test User', NULL)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. Create a default "Personal" organization for the test user
  -- ---------------------------------------------------------------------------

  INSERT INTO public.organizations (id, name, slug)
  VALUES (
    gen_random_uuid(),
    'Personal',
    'personal-' || substr(v_user_id::text, 1, 8)
  )
  RETURNING id INTO v_org_id
  ON CONFLICT (slug) DO NOTHING;

  -- If the org already existed (slug conflict), fetch its ID
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE slug = 'personal-' || substr(v_user_id::text, 1, 8);
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. Add the test user as owner of the personal org
  -- ---------------------------------------------------------------------------

  INSERT INTO public.organization_members (user_id, org_id, role, tenant_id)
  VALUES (v_user_id, v_org_id, 'owner', v_org_id)
  ON CONFLICT (user_id, org_id) DO NOTHING;

  -- Set the personal org as the default org for the test user
  UPDATE public.profiles
  SET default_org_id = v_org_id
  WHERE id = v_user_id
    AND default_org_id IS NULL;

  -- ---------------------------------------------------------------------------
  -- 5. Create a test family within the personal org
  -- ---------------------------------------------------------------------------

  INSERT INTO public.families (id, name, org_id, tenant_id)
  VALUES (
    gen_random_uuid(),
    'The Test Family',
    v_org_id,
    v_org_id
  )
  RETURNING id INTO v_family_id
  ON CONFLICT DO NOTHING;

  -- If the family already existed, fetch its ID
  IF v_family_id IS NULL THEN
    SELECT id INTO v_family_id
    FROM public.families
    WHERE org_id = v_org_id
    LIMIT 1;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 6. Add the test user as a family member (owner role)
  -- ---------------------------------------------------------------------------

  INSERT INTO public.family_members (user_id, family_id, role, tenant_id)
  VALUES (v_user_id, v_family_id, 'owner', v_org_id)
  ON CONFLICT (user_id, family_id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 7. Create a sample family_preferences row
  -- ---------------------------------------------------------------------------

  INSERT INTO public.family_preferences (
    family_id, tenant_id,
    dietary_restrictions, allergies, cuisine_preferences,
    budget_range
  )
  VALUES (
    v_family_id, v_org_id,
    '["vegetarian"]'::jsonb,
    '["peanuts", "shellfish"]'::jsonb,
    '["mexican", "italian", "japanese"]'::jsonb,
    '{"min": 50, "max": 200, "currency": "USD"}'::jsonb
  )
  ON CONFLICT (family_id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 8. Create a sample meal plan for the current week
  -- ---------------------------------------------------------------------------

  -- Calculate Monday of the current week
  v_week_start := date_trunc('week', CURRENT_DATE)::date;

  INSERT INTO public.meal_plans (id, family_id, week_start_date, created_by, status, tenant_id)
  VALUES (
    gen_random_uuid(),
    v_family_id,
    v_week_start,
    v_user_id,
    'active',
    v_org_id
  )
  RETURNING id INTO v_meal_plan_id
  ON CONFLICT (family_id, week_start_date) DO NOTHING;

  -- If the meal plan already existed, fetch its ID
  IF v_meal_plan_id IS NULL THEN
    SELECT id INTO v_meal_plan_id
    FROM public.meal_plans
    WHERE family_id = v_family_id
      AND week_start_date = v_week_start;
  END IF;

  -- Add a few sample meal plan entries for the first few days
  IF v_meal_plan_id IS NOT NULL THEN
    INSERT INTO public.meal_plan_entries (meal_plan_id, date, meal_slot, servings, notes, tenant_id)
    VALUES
      (v_meal_plan_id, v_week_start,        'breakfast', 4, 'Oatmeal with berries', v_org_id),
      (v_meal_plan_id, v_week_start,        'dinner',    4, 'Taco Tuesday!',        v_org_id),
      (v_meal_plan_id, v_week_start + 1,    'breakfast', 4, 'Smoothie bowl',        v_org_id),
      (v_meal_plan_id, v_week_start + 1,    'lunch',     4, 'Leftover tacos',       v_org_id),
      (v_meal_plan_id, v_week_start + 1,    'dinner',    4, 'Pasta night',          v_org_id),
      (v_meal_plan_id, v_week_start + 2,    'dinner',    4, 'Stir-fry',             v_org_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 9. Create a sample shopping list with items
  -- ---------------------------------------------------------------------------

  INSERT INTO public.shopping_lists (id, family_id, meal_plan_id, name, created_by, status, tenant_id)
  VALUES (
    gen_random_uuid(),
    v_family_id,
    v_meal_plan_id,
    'Weekly Groceries',
    v_user_id,
    'active',
    v_org_id
  )
  RETURNING id INTO v_shopping_list_id
  ON CONFLICT DO NOTHING;

  -- If the shopping list already existed, fetch its ID
  IF v_shopping_list_id IS NULL THEN
    SELECT id INTO v_shopping_list_id
    FROM public.shopping_lists
    WHERE family_id = v_family_id
      AND name = 'Weekly Groceries'
    LIMIT 1;
  END IF;

  -- Add sample shopping list items
  IF v_shopping_list_id IS NOT NULL THEN
    INSERT INTO public.shopping_list_items (
      shopping_list_id, ingredient_name, quantity, unit, category, checked, tenant_id
    )
    VALUES
      (v_shopping_list_id, 'Oats',              2,    'lb',    'pantry',  false, v_org_id),
      (v_shopping_list_id, 'Mixed berries',     1,    'lb',    'produce', false, v_org_id),
      (v_shopping_list_id, 'Tortillas',         1,    'pack',  'bakery',  false, v_org_id),
      (v_shopping_list_id, 'Ground beef',       1.5,  'lb',    'meat',    false, v_org_id),
      (v_shopping_list_id, 'Salsa',             1,    'jar',   'pantry',  false, v_org_id),
      (v_shopping_list_id, 'Spaghetti',         1,    'lb',    'pantry',  false, v_org_id),
      (v_shopping_list_id, 'Marinara sauce',    1,    'jar',   'pantry',  false, v_org_id),
      (v_shopping_list_id, 'Soy sauce',         1,    'bottle','pantry',  false, v_org_id),
      (v_shopping_list_id, 'Broccoli',          2,    'head',  'produce', false, v_org_id),
      (v_shopping_list_id, 'Bell peppers',      3,    'piece', 'produce', false, v_org_id),
      (v_shopping_list_id, 'Milk',              1,    'gallon','dairy',   true,  v_org_id),
      (v_shopping_list_id, 'Eggs',              1,    'dozen', 'dairy',   true,  v_org_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 10. Create sample invites with invite tokens and viewer roles
  -- ---------------------------------------------------------------------------

  INSERT INTO public.invites (org_id, email, role, invited_by, invite_token, tenant_id)
  VALUES
    (v_org_id, 'viewer1@example.com', 'viewer', v_user_id, 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', v_org_id),
    (v_org_id, 'viewer2@example.com', 'viewer', v_user_id, 'f0e1d2c3b4a5968778695a4b3c2d1e0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3', v_org_id),
    (v_org_id, 'member2@example.com', 'member', v_user_id, '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', v_org_id)
  ON CONFLICT (invite_token) DO NOTHING;

  RAISE NOTICE 'Seed data created: test@mealme.app → Personal org → The Test Family → preferences, meal plan, shopping list, sample invites';
END;
$$;
