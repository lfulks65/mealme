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

  -- ---------------------------------------------------------------------------
  -- 11. Seed sample recipes with ingredients, steps, tags, dietary, nutrition
  -- ---------------------------------------------------------------------------

  -- Helper: array of recipe IDs for easy reference
  DECLARE
    v_recipe_ids UUID[];
  BEGIN
    -- Insert 25 sample recipes across multiple cuisines
    INSERT INTO public.recipes (id, title, description, cuisine, prep_minutes, cook_minutes, servings, calories)
    VALUES
      (gen_random_uuid(), 'Jerk Chicken', 'Smoky, spicy Jamaican grilled chicken marinated in scotch bonnet, allspice, and thyme.', 'Caribbean', 20, 45, 6, 380),
      (gen_random_uuid(), 'Fish and Chips', 'Beer-battered cod with thick-cut chips, mushy peas, and tartar sauce.', 'British', 20, 20, 4, 580),
      (gen_random_uuid(), 'Moussaka', 'Layered eggplant and lamb casserole with béchamel sauce, baked golden.', 'Greek', 40, 60, 8, 420),
      (gen_random_uuid(), 'Swedish Meatballs', 'Tender meatballs in creamy gravy served with lingonberry sauce and pickled cucumber.', 'Scandinavian', 25, 20, 6, 380),
      (gen_random_uuid(), 'Jollof Rice', 'One-pot West African tomato and pepper rice with smoky depth and spicy kick.', 'African', 20, 45, 6, 350),
      (gen_random_uuid(), 'Beef Empanadas', 'Flaky pastry turnovers filled with seasoned ground beef, onions, olives, and hard-boiled eggs.', 'Latin American', 30, 25, 6, 420),
      (gen_random_uuid(), 'Ceviche', 'Fresh white fish cured in citrus juice with red onion, cilantro, and aji pepper.', 'Latin American', 25, 0, 4, 150),
      (gen_random_uuid(), 'Shepherd''s Pie', 'Lamb and vegetable filling topped with creamy mashed potatoes and baked golden.', 'British', 25, 35, 6, 420),
      (gen_random_uuid(), 'Spanakopita', 'Crispy phyllo pie filled with spinach, feta, and herbs.', 'Greek', 30, 40, 8, 280),
      (gen_random_uuid(), 'Gravlax', 'Nordic cured salmon with dill, sugar, and salt, sliced thin and served with mustard-dill sauce.', 'Scandinavian', 15, 0, 8, 180),
      (gen_random_uuid(), 'Chicken Tagine', 'Moroccan slow-braised chicken with preserved lemons, olives, and warm spices.', 'African', 20, 60, 6, 380),
      (gen_random_uuid(), 'Arepas', 'Crispy corn cakes split and stuffed with black beans, cheese, and avocado.', 'Latin American', 15, 15, 4, 320),
      (gen_random_uuid(), 'Sticky Toffee Pudding', 'Moist date sponge drenched in warm toffee sauce, served with custard or ice cream.', 'British', 20, 30, 8, 480),
      (gen_random_uuid(), 'Souvlaki', 'Greek marinated pork skewers grilled and served with pita, tomato, and tzatziki.', 'Greek', 20, 12, 4, 380),
      (gen_random_uuid(), 'Kanelbullar', 'Cardamom-scented Swedish cinnamon buns with pearl sugar topping.', 'Scandinavian', 30, 15, 12, 260),
      (gen_random_uuid(), 'Bobotie', 'South African curried minced meat bake topped with a golden egg custard.', 'African', 25, 45, 6, 400),
      (gen_random_uuid(), 'Tres Leches Cake', 'Light sponge cake soaked in three kinds of milk, topped with whipped cream.', 'Latin American', 25, 30, 10, 380),
      (gen_random_uuid(), 'Bangers and Mash', 'Pork sausages with creamy mashed potatoes and onion gravy.', 'British', 15, 25, 4, 480),
      (gen_random_uuid(), 'Baklava', 'Flaky phyllo layers with walnuts and pistachios drenched in honey syrup.', 'Greek', 30, 45, 24, 200),
      (gen_random_uuid(), 'Smörgåsbord', 'Swedish buffet spread with herring, gravlax, meatballs, cheese, and crispbread.', 'Scandinavian', 30, 0, 10, 420),
      (gen_random_uuid(), 'Egusi Soup', 'Rich Nigerian melon seed soup with leafy greens and assorted meat.', 'African', 20, 40, 6, 380),
      (gen_random_uuid(), 'Ropa Vieja', 'Cuban shredded beef stew with bell peppers, onions, and tomatoes served over rice.', 'Latin American', 20, 180, 6, 450),
      (gen_random_uuid(), 'Full English Breakfast', 'Traditional fry-up with eggs, bacon, sausage, baked beans, mushrooms, and toast.', 'British', 15, 20, 2, 720),
      (gen_random_uuid(), 'Tzatziki', 'Cool Greek yogurt dip with cucumber, garlic, dill, and olive oil.', 'Greek', 15, 0, 8, 80),
      (gen_random_uuid(), 'Pickled Herring', 'Scandinavian herring cured in vinegar, onion, and spice brine.', 'Scandinavian', 20, 0, 8, 120),
      (gen_random_uuid(), 'Piri Piri Chicken', 'Mozambican-Portuguese grilled chicken marinated in fiery piri piri chili sauce.', 'African', 15, 35, 4, 380),
      (gen_random_uuid(), 'Lomo Saltado', 'Peruvian stir-fry of marinated beef, onions, tomatoes, and fries served with rice.', 'Latin American', 20, 15, 4, 480),
      (gen_random_uuid(), 'Beef Wellington', 'Tender beef fillet wrapped in mushroom duxelles and puff pastry, roasted golden.', 'British', 45, 30, 8, 520),
      (gen_random_uuid(), 'Greek Salad', 'Chunky salad of tomatoes, cucumbers, olives, and feta with olive oil and oregano.', 'Greek', 10, 0, 4, 220),
      (gen_random_uuid(), 'Norwegian Salmon Soup', 'Creamy fish chowder with salmon, root vegetables, and dill.', 'Scandinavian', 15, 25, 6, 280)
    ON CONFLICT DO NOTHING;

    -- Get the inserted recipe IDs
    SELECT array_agg(id) INTO v_recipe_ids
    FROM public.recipes
    WHERE title IN (
      'Jerk Chicken', 'Fish and Chips', 'Moussaka', 'Swedish Meatballs', 'Jollof Rice',
      'Beef Empanadas', 'Ceviche', 'Shepherd''s Pie', 'Spanakopita', 'Gravlax',
      'Chicken Tagine', 'Arepas', 'Sticky Toffee Pudding', 'Souvlaki', 'Kanelbullar',
      'Bobotie', 'Tres Leches Cake', 'Bangers and Mash', 'Baklava', 'Smörgåsbord',
      'Egusi Soup', 'Ropa Vieja', 'Full English Breakfast', 'Tzatziki', 'Pickled Herring',
      'Piri Piri Chicken', 'Lomo Saltado', 'Beef Wellington', 'Greek Salad', 'Norwegian Salmon Soup'
    );

    -- Insert nutrition data for all sample recipes
    INSERT INTO public.recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg)
    SELECT r.id, r.calories,
      CASE r.title
        WHEN 'Jerk Chicken' THEN 36 WHEN 'Fish and Chips' THEN 28 WHEN 'Moussaka' THEN 22
        WHEN 'Swedish Meatballs' THEN 24 WHEN 'Jollof Rice' THEN 6 WHEN 'Beef Empanadas' THEN 22
        WHEN 'Ceviche' THEN 28 WHEN 'Shepherd''s Pie' THEN 26 WHEN 'Spanakopita' THEN 12
        WHEN 'Gravlax' THEN 24 WHEN 'Chicken Tagine' THEN 34 WHEN 'Arepas' THEN 12
        WHEN 'Sticky Toffee Pudding' THEN 6 WHEN 'Souvlaki' THEN 32 WHEN 'Kanelbullar' THEN 5
        WHEN 'Bobotie' THEN 28 WHEN 'Tres Leches Cake' THEN 8 WHEN 'Bangers and Mash' THEN 22
        WHEN 'Baklava' THEN 3 WHEN 'Smörgåsbord' THEN 28 WHEN 'Egusi Soup' THEN 26
        WHEN 'Ropa Vieja' THEN 38 WHEN 'Full English Breakfast' THEN 44 WHEN 'Tzatziki' THEN 6
        WHEN 'Pickled Herring' THEN 12 WHEN 'Piri Piri Chicken' THEN 38 WHEN 'Lomo Saltado' THEN 32
        WHEN 'Beef Wellington' THEN 38 WHEN 'Greek Salad' THEN 8 WHEN 'Norwegian Salmon Soup' THEN 22
      END,
      CASE r.title
        WHEN 'Jerk Chicken' THEN 6 WHEN 'Fish and Chips' THEN 56 WHEN 'Moussaka' THEN 24
        WHEN 'Swedish Meatballs' THEN 18 WHEN 'Jollof Rice' THEN 58 WHEN 'Beef Empanadas' THEN 30
        WHEN 'Ceviche' THEN 6 WHEN 'Shepherd''s Pie' THEN 36 WHEN 'Spanakopita' THEN 20
        WHEN 'Gravlax' THEN 4 WHEN 'Chicken Tagine' THEN 8 WHEN 'Arepas' THEN 42
        WHEN 'Sticky Toffee Pudding' THEN 64 WHEN 'Souvlaki' THEN 22 WHEN 'Kanelbullar' THEN 36
        WHEN 'Bobotie' THEN 18 WHEN 'Tres Leches Cake' THEN 52 WHEN 'Bangers and Mash' THEN 42
        WHEN 'Baklava' THEN 24 WHEN 'Smörgåsbord' THEN 24 WHEN 'Egusi Soup' THEN 10
        WHEN 'Ropa Vieja' THEN 28 WHEN 'Full English Breakfast' THEN 48 WHEN 'Tzatziki' THEN 4
        WHEN 'Pickled Herring' THEN 10 WHEN 'Piri Piri Chicken' THEN 4 WHEN 'Lomo Saltado' THEN 44
        WHEN 'Beef Wellington' THEN 22 WHEN 'Greek Salad' THEN 10 WHEN 'Norwegian Salmon Soup' THEN 16
      END,
      CASE r.title
        WHEN 'Jerk Chicken' THEN 24 WHEN 'Fish and Chips' THEN 28 WHEN 'Moussaka' THEN 26
        WHEN 'Swedish Meatballs' THEN 24 WHEN 'Jollof Rice' THEN 10 WHEN 'Beef Empanadas' THEN 24
        WHEN 'Ceviche' THEN 2 WHEN 'Shepherd''s Pie' THEN 20 WHEN 'Spanakopita' THEN 18
        WHEN 'Gravlax' THEN 8 WHEN 'Chicken Tagine' THEN 24 WHEN 'Arepas' THEN 12
        WHEN 'Sticky Toffee Pudding' THEN 24 WHEN 'Souvlaki' THEN 18 WHEN 'Kanelbullar' THEN 12
        WHEN 'Bobotie' THEN 24 WHEN 'Tres Leches Cake' THEN 16 WHEN 'Bangers and Mash' THEN 26
        WHEN 'Baklava' THEN 12 WHEN 'Smörgåsbord' THEN 24 WHEN 'Egusi Soup' THEN 28
        WHEN 'Ropa Vieja' THEN 20 WHEN 'Full English Breakfast' THEN 38 WHEN 'Tzatziki' THEN 5
        WHEN 'Pickled Herring' THEN 4 WHEN 'Piri Piri Chicken' THEN 24 WHEN 'Lomo Saltado' THEN 20
        WHEN 'Beef Wellington' THEN 32 WHEN 'Greek Salad' THEN 18 WHEN 'Norwegian Salmon Soup' THEN 14
      END,
      CASE r.title
        WHEN 'Jerk Chicken' THEN 1 WHEN 'Fish and Chips' THEN 4 WHEN 'Moussaka' THEN 5
        WHEN 'Swedish Meatballs' THEN 1 WHEN 'Jollof Rice' THEN 3 WHEN 'Beef Empanadas' THEN 2
        WHEN 'Ceviche' THEN 1 WHEN 'Shepherd''s Pie' THEN 4 WHEN 'Spanakopita' THEN 3
        WHEN 'Gravlax' THEN 0 WHEN 'Chicken Tagine' THEN 2 WHEN 'Arepas' THEN 8
        WHEN 'Sticky Toffee Pudding' THEN 3 WHEN 'Souvlaki' THEN 2 WHEN 'Kanelbullar' THEN 1
        WHEN 'Bobotie' THEN 2 WHEN 'Tres Leches Cake' THEN 0 WHEN 'Bangers and Mash' THEN 3
        WHEN 'Baklava' THEN 1 WHEN 'Smörgåsbord' THEN 2 WHEN 'Egusi Soup' THEN 3
        WHEN 'Ropa Vieja' THEN 4 WHEN 'Full English Breakfast' THEN 6 WHEN 'Tzatziki' THEN 0
        WHEN 'Pickled Herring' THEN 0 WHEN 'Piri Piri Chicken' THEN 1 WHEN 'Lomo Saltado' THEN 4
        WHEN 'Beef Wellington' THEN 2 WHEN 'Greek Salad' THEN 3 WHEN 'Norwegian Salmon Soup' THEN 2
      END,
      CASE r.title
        WHEN 'Jerk Chicken' THEN 3 WHEN 'Fish and Chips' THEN 3 WHEN 'Moussaka' THEN 8
        WHEN 'Swedish Meatballs' THEN 4 WHEN 'Jollof Rice' THEN 5 WHEN 'Beef Empanadas' THEN 3
        WHEN 'Ceviche' THEN 2 WHEN 'Shepherd''s Pie' THEN 5 WHEN 'Spanakopita' THEN 3
        WHEN 'Gravlax' THEN 2 WHEN 'Chicken Tagine' THEN 2 WHEN 'Arepas' THEN 2
        WHEN 'Sticky Toffee Pudding' THEN 48 WHEN 'Souvlaki' THEN 3 WHEN 'Kanelbullar' THEN 16
        WHEN 'Bobotie' THEN 6 WHEN 'Tres Leches Cake' THEN 40 WHEN 'Bangers and Mash' THEN 4
        WHEN 'Baklava' THEN 18 WHEN 'Smörgåsbord' THEN 6 WHEN 'Egusi Soup' THEN 2
        WHEN 'Ropa Vieja' THEN 6 WHEN 'Full English Breakfast' THEN 10 WHEN 'Tzatziki' THEN 3
        WHEN 'Pickled Herring' THEN 8 WHEN 'Piri Piri Chicken' THEN 1 WHEN 'Lomo Saltado' THEN 5
        WHEN 'Beef Wellington' THEN 2 WHEN 'Greek Salad' THEN 5 WHEN 'Norwegian Salmon Soup' THEN 3
      END,
      CASE r.title
        WHEN 'Jerk Chicken' THEN 480 WHEN 'Fish and Chips' THEN 680 WHEN 'Moussaka' THEN 580
        WHEN 'Swedish Meatballs' THEN 520 WHEN 'Jollof Rice' THEN 380 WHEN 'Beef Empanadas' THEN 580
        WHEN 'Ceviche' THEN 340 WHEN 'Shepherd''s Pie' THEN 520 WHEN 'Spanakopita' THEN 480
        WHEN 'Gravlax' THEN 680 WHEN 'Chicken Tagine' THEN 520 WHEN 'Arepas' THEN 420
        WHEN 'Sticky Toffee Pudding' THEN 280 WHEN 'Souvlaki' THEN 480 WHEN 'Kanelbullar' THEN 180
        WHEN 'Bobotie' THEN 520 WHEN 'Tres Leches Cake' THEN 180 WHEN 'Bangers and Mash' THEN 820
        WHEN 'Baklava' THEN 120 WHEN 'Smörgåsbord' THEN 820 WHEN 'Egusi Soup' THEN 440
        WHEN 'Ropa Vieja' THEN 620 WHEN 'Full English Breakfast' THEN 1420 WHEN 'Tzatziki' THEN 180
        WHEN 'Pickled Herring' THEN 580 WHEN 'Piri Piri Chicken' THEN 420 WHEN 'Lomo Saltado' THEN 720
        WHEN 'Beef Wellington' THEN 620 WHEN 'Greek Salad' THEN 480 WHEN 'Norwegian Salmon Soup' THEN 480
      END
    FROM public.recipes r
    WHERE r.title IN (
      'Jerk Chicken', 'Fish and Chips', 'Moussaka', 'Swedish Meatballs', 'Jollof Rice',
      'Beef Empanadas', 'Ceviche', 'Shepherd''s Pie', 'Spanakopita', 'Gravlax',
      'Chicken Tagine', 'Arepas', 'Sticky Toffee Pudding', 'Souvlaki', 'Kanelbullar',
      'Bobotie', 'Tres Leches Cake', 'Bangers and Mash', 'Baklava', 'Smörgåsbord',
      'Egusi Soup', 'Ropa Vieja', 'Full English Breakfast', 'Tzatziki', 'Pickled Herring',
      'Piri Piri Chicken', 'Lomo Saltado', 'Beef Wellington', 'Greek Salad', 'Norwegian Salmon Soup'
    )
    ON CONFLICT DO NOTHING;

    -- Insert sample recipe steps for a subset of recipes
    -- (Steps use the recipe_steps table, not recipe_instructions)
    INSERT INTO public.recipe_steps (recipe_id, step_number, instruction)
    SELECT r.id, n, 
      CASE r.title || '-' || n
        -- Jerk Chicken
        WHEN 'Jerk Chicken-1' THEN 'Blend scotch bonnet, allspice, thyme, garlic, ginger, soy sauce, and brown sugar into a paste.'
        WHEN 'Jerk Chicken-2' THEN 'Rub jerk paste all over chicken pieces. Marinate at least 4 hours or overnight.'
        WHEN 'Jerk Chicken-3' THEN 'Grill over indirect heat for 35-45 minutes until cooked through.'
        WHEN 'Jerk Chicken-4' THEN 'Serve with rice and peas, fried plantains, and a squeeze of lime.'
        -- Fish and Chips
        WHEN 'Fish and Chips-1' THEN 'Fry chips at 325°F for 5 minutes until soft. Remove and increase oil to 375°F.'
        WHEN 'Fish and Chips-2' THEN 'Make batter: whisk flour, baking powder, salt, and cold beer until smooth.'
        WHEN 'Fish and Chips-3' THEN 'Dip cod in batter, fry at 375°F for 4-5 minutes until golden and crispy.'
        WHEN 'Fish and Chips-4' THEN 'Refry chips at 375°F for 2-3 minutes until crispy. Serve with mushy peas and tartar sauce.'
        -- Moussaka
        WHEN 'Moussaka-1' THEN 'Slice and salt eggplant. Let sweat 20 minutes, then brush with olive oil and roast at 400°F for 20 minutes.'
        WHEN 'Moussaka-2' THEN 'Cook lamb with onion, garlic, cinnamon, and tomato sauce. Simmer 15 minutes.'
        WHEN 'Moussaka-3' THEN 'Make béchamel: melt butter, add flour, whisk in milk until thick. Add nutmeg and egg.'
        WHEN 'Moussaka-4' THEN 'Layer eggplant, meat sauce, repeat. Top with béchamel and bake at 375°F for 45 minutes.'
        -- Jollof Rice
        WHEN 'Jollof Rice-1' THEN 'Blend red bell peppers and scotch bonnet peppers into a smooth paste.'
        WHEN 'Jollof Rice-2' THEN 'Heat oil and fry onion until translucent. Add tomato paste and pepper blend. Cook 15 minutes.'
        WHEN 'Jollof Rice-3' THEN 'Add thyme, bay leaf, and season with salt. Add washed rice and stir to coat.'
        WHEN 'Jollof Rice-4' THEN 'Add water to just above rice level. Cook covered on low heat for 25 minutes until rice is fluffy.'
        ELSE 'Prepare and cook as directed.'
      END
    FROM public.recipes r
    CROSS JOIN generate_series(1, 4) AS n
    WHERE r.title IN ('Jerk Chicken', 'Fish and Chips', 'Moussaka', 'Jollof Rice')
    ON CONFLICT DO NOTHING;

    -- Insert sample tags for all recipes
    INSERT INTO public.recipe_tags (recipe_id, tag)
    SELECT r.id, t
    FROM public.recipes r
    CROSS JOIN LATERAL unnest(
      CASE r.title
        WHEN 'Jerk Chicken' THEN ARRAY['jerk','jamaican','chicken','grilled','spicy']
        WHEN 'Fish and Chips' THEN ARRAY['fish and chips','british','fried','cod','pub food']
        WHEN 'Moussaka' THEN ARRAY['moussaka','greek','eggplant','lamb','casserole']
        WHEN 'Swedish Meatballs' THEN ARRAY['meatballs','swedish','gravy','lingonberry','comfort food']
        WHEN 'Jollof Rice' THEN ARRAY['jollof','rice','west african','one-pot','spicy']
        WHEN 'Beef Empanadas' THEN ARRAY['empanada','beef','pastry','handheld','baked']
        WHEN 'Ceviche' THEN ARRAY['ceviche','seafood','no-cook','fresh','light']
        WHEN 'Shepherd''s Pie' THEN ARRAY['shepherd''s pie','british','lamb','pie','comfort food']
        WHEN 'Spanakopita' THEN ARRAY['spanakopita','greek','spinach','feta','phyllo']
        WHEN 'Gravlax' THEN ARRAY['gravlax','scandinavian','salmon','cured','dill']
        WHEN 'Chicken Tagine' THEN ARRAY['tagine','moroccan','chicken','olive','preserved lemon']
        WHEN 'Arepas' THEN ARRAY['arepa','venezuelan','corn','stuffed','vegetarian']
        WHEN 'Sticky Toffee Pudding' THEN ARRAY['sticky toffee','pudding','british','dessert','date']
        WHEN 'Souvlaki' THEN ARRAY['souvlaki','greek','pork','skewer','grilled']
        WHEN 'Kanelbullar' THEN ARRAY['kanelbullar','cinnamon bun','swedish','pastry','fika']
        WHEN 'Bobotie' THEN ARRAY['bobotie','south african','curry','bake','comfort food']
        WHEN 'Tres Leches Cake' THEN ARRAY['tres leches','cake','dessert','milk','sweet']
        WHEN 'Bangers and Mash' THEN ARRAY['bangers and mash','british','sausage','mash','comfort food']
        WHEN 'Baklava' THEN ARRAY['baklava','greek','dessert','phyllo','honey']
        WHEN 'Smörgåsbord' THEN ARRAY['smörgåsbord','swedish','buffet','herring','spread']
        WHEN 'Egusi Soup' THEN ARRAY['egusi','nigerian','soup','melon seed','palm oil']
        WHEN 'Ropa Vieja' THEN ARRAY['ropa vieja','cuban','beef','stew','shredded']
        WHEN 'Full English Breakfast' THEN ARRAY['full english','breakfast','british','fry-up','traditional']
        WHEN 'Tzatziki' THEN ARRAY['tzatziki','greek','yogurt','dip','cucumber']
        WHEN 'Pickled Herring' THEN ARRAY['herring','pickled','scandinavian','preserved','appetizer']
        WHEN 'Piri Piri Chicken' THEN ARRAY['piri piri','mozambican','grilled','chicken','spicy']
        WHEN 'Lomo Saltado' THEN ARRAY['lomo saltado','peruvian','stir-fry','beef','fusion']
        WHEN 'Beef Wellington' THEN ARRAY['beef wellington','british','beef','puff pastry','elegant']
        WHEN 'Greek Salad' THEN ARRAY['greek salad','greek','salad','feta','vegetarian']
        WHEN 'Norwegian Salmon Soup' THEN ARRAY['salmon soup','norwegian','chowder','fish','creamy']
      END
    ) AS t
    ON CONFLICT DO NOTHING;

    -- Insert dietary info for all sample recipes
    INSERT INTO public.recipe_dietary_info (recipe_id, restriction, is_compliant)
    SELECT r.id, d.restriction, d.is_compliant
    FROM public.recipes r
    CROSS JOIN LATERAL unnest(
      ARRAY['vegetarian','vegan','keto','gluten-free','dairy-free','nut-free','halal','kosher','paleo'],
      CASE r.title
        WHEN 'Ceviche' THEN ARRAY[false,false,true,true,true,true,true,true,true]
        WHEN 'Jollof Rice' THEN ARRAY[true,true,false,true,true,true,true,true,false]
        WHEN 'Arepas' THEN ARRAY[true,false,false,true,false,true,true,true,false]
        WHEN 'Tzatziki' THEN ARRAY[true,false,true,true,false,true,true,true,false]
        WHEN 'Greek Salad' THEN ARRAY[true,false,true,true,false,true,true,false,false]
        WHEN 'Gravlax' THEN ARRAY[false,false,true,true,true,true,false,true,true]
        WHEN 'Chicken Tagine' THEN ARRAY[false,false,true,true,true,true,true,true,true]
        WHEN 'Jerk Chicken' THEN ARRAY[false,false,true,true,true,true,true,false,true]
        WHEN 'Moussaka' THEN ARRAY[false,false,false,false,false,true,true,false,false]
        WHEN 'Fish and Chips' THEN ARRAY[false,false,false,false,true,true,false,false,false]
        WHEN 'Swedish Meatballs' THEN ARRAY[false,false,false,false,false,true,false,false,false]
        WHEN 'Beef Empanadas' THEN ARRAY[false,false,false,false,true,true,true,false,false]
        WHEN 'Shepherd''s Pie' THEN ARRAY[false,false,false,true,false,true,true,false,false]
        WHEN 'Spanakopita' THEN ARRAY[true,false,false,false,false,true,true,false,false]
        WHEN 'Sticky Toffee Pudding' THEN ARRAY[true,false,false,false,false,true,true,true,false]
        WHEN 'Souvlaki' THEN ARRAY[false,false,false,false,false,true,true,false,false]
        WHEN 'Kanelbullar' THEN ARRAY[true,false,false,false,false,true,true,true,false]
        WHEN 'Bobotie' THEN ARRAY[false,false,false,false,false,true,true,false,false]
        WHEN 'Tres Leches Cake' THEN ARRAY[true,false,false,true,false,true,true,true,false]
        WHEN 'Bangers and Mash' THEN ARRAY[false,false,false,false,false,true,false,false,false]
        WHEN 'Baklava' THEN ARRAY[true,false,false,false,false,false,true,true,false]
        WHEN 'Smörgåsbord' THEN ARRAY[false,false,false,false,false,true,false,false,false]
        WHEN 'Egusi Soup' THEN ARRAY[false,false,true,true,true,true,true,false,true]
        WHEN 'Ropa Vieja' THEN ARRAY[false,false,false,true,true,true,true,false,false]
        WHEN 'Full English Breakfast' THEN ARRAY[false,false,false,false,false,true,false,false,false]
        WHEN 'Pickled Herring' THEN ARRAY[false,false,false,true,true,true,false,false,false]
        WHEN 'Piri Piri Chicken' THEN ARRAY[false,false,true,true,true,true,true,false,true]
        WHEN 'Lomo Saltado' THEN ARRAY[false,false,false,true,true,true,true,false,false]
        WHEN 'Beef Wellington' THEN ARRAY[false,false,false,false,false,true,false,false,false]
        WHEN 'Norwegian Salmon Soup' THEN ARRAY[false,false,false,true,false,true,false,false,false]
      END
    ) AS d(restriction, is_compliant)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed data created: test@mealme.app → Personal org → The Test Family → preferences, meal plan, shopping list, sample invites';
    RAISE NOTICE 'Sample recipes: 30 recipes with nutrition, tags, dietary info, and steps seeded across 8 cuisines';
  END;
