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
    -- Insert 55 sample recipes across multiple cuisines
    INSERT INTO public.recipes (id, title, description, cuisine, prep_minutes, cook_minutes, servings, calories)
    VALUES
      -- Caribbean
      (gen_random_uuid(), 'Jerk Chicken', 'Smoky, spicy Jamaican grilled chicken marinated in scotch bonnet, allspice, and thyme.', 'Caribbean', 20, 45, 6, 380),
      -- British
      (gen_random_uuid(), 'Fish and Chips', 'Beer-battered cod with thick-cut chips, mushy peas, and tartar sauce.', 'British', 20, 20, 4, 580),
      (gen_random_uuid(), 'Shepherd''s Pie', 'Lamb and vegetable filling topped with creamy mashed potatoes and baked golden.', 'British', 25, 35, 6, 420),
      (gen_random_uuid(), 'Sticky Toffee Pudding', 'Moist date sponge drenched in warm toffee sauce, served with custard or ice cream.', 'British', 20, 30, 8, 480),
      (gen_random_uuid(), 'Bangers and Mash', 'Pork sausages with creamy mashed potatoes and onion gravy.', 'British', 15, 25, 4, 480),
      (gen_random_uuid(), 'Full English Breakfast', 'Traditional fry-up with eggs, bacon, sausage, baked beans, mushrooms, and toast.', 'British', 15, 20, 2, 720),
      (gen_random_uuid(), 'Beef Wellington', 'Tender beef fillet wrapped in mushroom duxelles and puff pastry, roasted golden.', 'British', 45, 30, 8, 520),
      -- Greek
      (gen_random_uuid(), 'Moussaka', 'Layered eggplant and lamb casserole with béchamel sauce, baked golden.', 'Greek', 40, 60, 8, 420),
      (gen_random_uuid(), 'Spanakopita', 'Crispy phyllo pie filled with spinach, feta, and herbs.', 'Greek', 30, 40, 8, 280),
      (gen_random_uuid(), 'Souvlaki', 'Greek marinated pork skewers grilled and served with pita, tomato, and tzatziki.', 'Greek', 20, 12, 4, 380),
      (gen_random_uuid(), 'Baklava', 'Flaky phyllo layers with walnuts and pistachios drenched in honey syrup.', 'Greek', 30, 45, 24, 200),
      (gen_random_uuid(), 'Tzatziki', 'Cool Greek yogurt dip with cucumber, garlic, dill, and olive oil.', 'Greek', 15, 0, 8, 80),
      (gen_random_uuid(), 'Greek Salad', 'Chunky salad of tomatoes, cucumbers, olives, and feta with olive oil and oregano.', 'Greek', 10, 0, 4, 220),
      -- Scandinavian
      (gen_random_uuid(), 'Swedish Meatballs', 'Tender meatballs in creamy gravy served with lingonberry sauce and pickled cucumber.', 'Scandinavian', 25, 20, 6, 380),
      (gen_random_uuid(), 'Gravlax', 'Nordic cured salmon with dill, sugar, and salt, sliced thin and served with mustard-dill sauce.', 'Scandinavian', 15, 0, 8, 180),
      (gen_random_uuid(), 'Kanelbullar', 'Cardamom-scented Swedish cinnamon buns with pearl sugar topping.', 'Scandinavian', 30, 15, 12, 260),
      (gen_random_uuid(), 'Smörgåsbord', 'Swedish buffet spread with herring, gravlax, meatballs, cheese, and crispbread.', 'Scandinavian', 30, 0, 10, 420),
      (gen_random_uuid(), 'Pickled Herring', 'Scandinavian herring cured in vinegar, onion, and spice brine.', 'Scandinavian', 20, 0, 8, 120),
      (gen_random_uuid(), 'Norwegian Salmon Soup', 'Creamy fish chowder with salmon, root vegetables, and dill.', 'Scandinavian', 15, 25, 6, 280),
      -- African
      (gen_random_uuid(), 'Jollof Rice', 'One-pot West African tomato and pepper rice with smoky depth and spicy kick.', 'African', 20, 45, 6, 350),
      (gen_random_uuid(), 'Chicken Tagine', 'Moroccan slow-braised chicken with preserved lemons, olives, and warm spices.', 'African', 20, 60, 6, 380),
      (gen_random_uuid(), 'Bobotie', 'South African curried minced meat bake topped with a golden egg custard.', 'African', 25, 45, 6, 400),
      (gen_random_uuid(), 'Egusi Soup', 'Rich Nigerian melon seed soup with leafy greens and assorted meat.', 'African', 20, 40, 6, 380),
      (gen_random_uuid(), 'Piri Piri Chicken', 'Mozambican-Portuguese grilled chicken marinated in fiery piri piri chili sauce.', 'African', 15, 35, 4, 380),
      -- Latin American
      (gen_random_uuid(), 'Beef Empanadas', 'Flaky pastry turnovers filled with seasoned ground beef, onions, olives, and hard-boiled eggs.', 'Latin American', 30, 25, 6, 420),
      (gen_random_uuid(), 'Ceviche', 'Fresh white fish cured in citrus juice with red onion, cilantro, and aji pepper.', 'Latin American', 25, 0, 4, 150),
      (gen_random_uuid(), 'Arepas', 'Crispy corn cakes split and stuffed with black beans, cheese, and avocado.', 'Latin American', 15, 15, 4, 320),
      (gen_random_uuid(), 'Tres Leches Cake', 'Light sponge cake soaked in three kinds of milk, topped with whipped cream.', 'Latin American', 25, 30, 10, 380),
      (gen_random_uuid(), 'Ropa Vieja', 'Cuban shredded beef stew with bell peppers, onions, and tomatoes served over rice.', 'Latin American', 20, 180, 6, 450),
      (gen_random_uuid(), 'Lomo Saltado', 'Peruvian stir-fry of marinated beef, onions, tomatoes, and fries served with rice.', 'Latin American', 20, 15, 4, 480),
      -- Mexican
      (gen_random_uuid(), 'Chicken Enchiladas', 'Corn tortillas rolled around shredded chicken, smothered in red chile sauce and melted cheese.', 'Mexican', 25, 25, 6, 420),
      (gen_random_uuid(), 'Guacamole', 'Fresh avocado mashed with lime, cilantro, onion, and jalapeño.', 'Mexican', 10, 0, 6, 120),
      (gen_random_uuid(), 'Tacos al Pastor', 'Spit-grilled marinated pork with pineapple on soft corn tortillas.', 'Mexican', 30, 20, 4, 380),
      (gen_random_uuid(), 'Chiles Rellenos', 'Roasted poblano peppers stuffed with cheese, dipped in egg batter and fried golden.', 'Mexican', 30, 20, 4, 340),
      (gen_random_uuid(), 'Pozole Rojo', 'Hearty hominy stew with pork and red chile broth, topped with cabbage and radish.', 'Mexican', 20, 90, 8, 380),
      -- Italian
      (gen_random_uuid(), 'Spaghetti Carbonara', 'Classic Roman pasta with guanciale, egg yolk, pecorino romano, and black pepper.', 'Italian', 15, 20, 4, 480),
      (gen_random_uuid(), 'Margherita Pizza', 'Neapolitan pizza with San Marzano tomatoes, fresh mozzarella, and basil.', 'Italian', 30, 12, 4, 320),
      (gen_random_uuid(), 'Risotto alla Milanese', 'Creamy saffron-infused Arborio rice with parmesan and butter.', 'Italian', 10, 30, 4, 420),
      (gen_random_uuid(), 'Osso Buco', 'Braised veal shanks in white wine and vegetables, served with gremolata.', 'Italian', 20, 120, 4, 480),
      (gen_random_uuid(), 'Tiramisu', 'Espresso-soaked ladyfingers layered with mascarpone cream and cocoa.', 'Italian', 30, 0, 8, 380),
      -- Asian
      (gen_random_uuid(), 'Pad Thai', 'Stir-fried rice noodles with shrimp, bean sprouts, peanuts, and tamarind sauce.', 'Asian', 15, 10, 4, 420),
      (gen_random_uuid(), 'Kung Pao Chicken', 'Spicy Sichuan stir-fry with chicken, peanuts, and dried chilies.', 'Asian', 15, 10, 4, 380),
      (gen_random_uuid(), 'Sushi Roll Platter', 'Assorted maki rolls with fresh fish, avocado, and cucumber.', 'Asian', 40, 0, 4, 320),
      (gen_random_uuid(), 'Pho Bo', 'Vietnamese beef noodle soup with star anise, cinnamon, and fresh herbs.', 'Asian', 20, 180, 6, 380),
      (gen_random_uuid(), 'Bibimbap', 'Korean rice bowl with sautéed vegetables, gochujang, and fried egg.', 'Asian', 25, 15, 4, 480),
      -- Indian
      (gen_random_uuid(), 'Butter Chicken', 'Tender chicken in a rich tomato-cream sauce with warm spices.', 'Indian', 20, 30, 4, 420),
      (gen_random_uuid(), 'Chana Masala', 'Spiced chickpea curry with tomatoes, onions, and garam masala.', 'Indian', 15, 25, 6, 280),
      (gen_random_uuid(), 'Palak Paneer', 'Creamy spinach puree with cubes of paneer cheese and aromatic spices.', 'Indian', 15, 20, 4, 320),
      (gen_random_uuid(), 'Biryani', 'Fragrant basmati rice layered with spiced meat, saffron, and fried onions.', 'Indian', 30, 45, 6, 480),
      (gen_random_uuid(), 'Dal Tadka', 'Yellow lentils tempered with cumin, mustard seeds, garlic, and ghee.', 'Indian', 10, 25, 6, 220),
      -- American
      (gen_random_uuid(), 'Classic Cheeseburger', 'Juicy beef patty with cheddar, lettuce, tomato, and special sauce on a brioche bun.', 'American', 15, 10, 4, 580),
      (gen_random_uuid(), 'Mac and Cheese', 'Creamy baked elbow pasta in cheddar-bechamel sauce with a crispy breadcrumb topping.', 'American', 15, 25, 6, 480),
      (gen_random_uuid(), 'BBQ Pulled Pork', 'Slow-smoked pork shoulder pulled and tossed in tangy barbecue sauce.', 'American', 15, 360, 8, 420),
      (gen_random_uuid(), 'Buffalo Wings', 'Crispy fried chicken wings tossed in spicy buffalo sauce with blue cheese dip.', 'American', 15, 25, 4, 480),
      (gen_random_uuid(), 'Apple Pie', 'All-American double-crust pie with cinnamon-spiced apples, baked golden.', 'American', 30, 55, 8, 380),
      -- Mediterranean
      (gen_random_uuid(), 'Shakshuka', 'Eggs poached in spiced tomato and pepper sauce with feta and herbs.', 'Mediterranean', 15, 20, 4, 280),
      (gen_random_uuid(), 'Hummus', 'Creamy blended chickpeas with tahini, lemon, garlic, and olive oil.', 'Mediterranean', 15, 0, 8, 180),
      (gen_random_uuid(), 'Lamb Kofta Kebabs', 'Spiced ground lamb skewers grilled and served with tzatziki and flatbread.', 'Mediterranean', 25, 12, 4, 380),
      (gen_random_uuid(), 'Falafel', 'Crispy fried chickpea patties with herbs and spices, served in pita.', 'Mediterranean', 20, 15, 4, 320),
      (gen_random_uuid(), 'Stuffed Grape Leaves', 'Tender grape leaves filled with rice, herbs, and pine nuts.', 'Mediterranean', 40, 45, 8, 180)
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
      'Piri Piri Chicken', 'Lomo Saltado', 'Beef Wellington', 'Greek Salad', 'Norwegian Salmon Soup',
      'Chicken Enchiladas', 'Guacamole', 'Tacos al Pastor', 'Chiles Rellenos', 'Pozole Rojo',
      'Spaghetti Carbonara', 'Margherita Pizza', 'Risotto alla Milanese', 'Osso Buco', 'Tiramisu',
      'Pad Thai', 'Kung Pao Chicken', 'Sushi Roll Platter', 'Pho Bo', 'Bibimbap',
      'Butter Chicken', 'Chana Masala', 'Palak Paneer', 'Biryani', 'Dal Tadka',
      'Classic Cheeseburger', 'Mac and Cheese', 'BBQ Pulled Pork', 'Buffalo Wings', 'Apple Pie',
      'Shakshuka', 'Hummus', 'Lamb Kofta Kebabs', 'Falafel', 'Stuffed Grape Leaves'
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
        WHEN 'Chicken Enchiladas' THEN 28 WHEN 'Guacamole' THEN 2 WHEN 'Tacos al Pastor' THEN 26
        WHEN 'Chiles Rellenos' THEN 14 WHEN 'Pozole Rojo' THEN 32 WHEN 'Spaghetti Carbonara' THEN 22
        WHEN 'Margherita Pizza' THEN 16 WHEN 'Risotto alla Milanese' THEN 10 WHEN 'Osso Buco' THEN 38
        WHEN 'Tiramisu' THEN 8 WHEN 'Pad Thai' THEN 18 WHEN 'Kung Pao Chicken' THEN 32
        WHEN 'Sushi Roll Platter' THEN 18 WHEN 'Pho Bo' THEN 28 WHEN 'Bibimbap' THEN 22
        WHEN 'Butter Chicken' THEN 32 WHEN 'Chana Masala' THEN 12 WHEN 'Palak Paneer' THEN 16
        WHEN 'Biryani' THEN 28 WHEN 'Dal Tadka' THEN 12 WHEN 'Classic Cheeseburger' THEN 32
        WHEN 'Mac and Cheese' THEN 18 WHEN 'BBQ Pulled Pork' THEN 38 WHEN 'Buffalo Wings' THEN 34
        WHEN 'Apple Pie' THEN 3 WHEN 'Shakshuka' THEN 14 WHEN 'Hummus' THEN 8
        WHEN 'Lamb Kofta Kebabs' THEN 28 WHEN 'Falafel' THEN 10 WHEN 'Stuffed Grape Leaves' THEN 4
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
        WHEN 'Chicken Enchiladas' THEN 32 WHEN 'Guacamole' THEN 8 WHEN 'Tacos al Pastor' THEN 28
        WHEN 'Chiles Rellenos' THEN 18 WHEN 'Pozole Rojo' THEN 22 WHEN 'Spaghetti Carbonara' THEN 52
        WHEN 'Margherita Pizza' THEN 36 WHEN 'Risotto alla Milanese' THEN 58 WHEN 'Osso Buco' THEN 8
        WHEN 'Tiramisu' THEN 42 WHEN 'Pad Thai' THEN 48 WHEN 'Kung Pao Chicken' THEN 12
        WHEN 'Sushi Roll Platter' THEN 42 WHEN 'Pho Bo' THEN 44 WHEN 'Bibimbap' THEN 52
        WHEN 'Butter Chicken' THEN 16 WHEN 'Chana Masala' THEN 34 WHEN 'Palak Paneer' THEN 12
        WHEN 'Biryani' THEN 56 WHEN 'Dal Tadka' THEN 32 WHEN 'Classic Cheeseburger' THEN 38
        WHEN 'Mac and Cheese' THEN 48 WHEN 'BBQ Pulled Pork' THEN 18 WHEN 'Buffalo Wings' THEN 8
        WHEN 'Apple Pie' THEN 52 WHEN 'Shakshuka' THEN 14 WHEN 'Hummus' THEN 22
        WHEN 'Lamb Kofta Kebabs' THEN 8 WHEN 'Falafel' THEN 30 WHEN 'Stuffed Grape Leaves' THEN 18
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
        WHEN 'Chicken Enchiladas' THEN 22 WHEN 'Guacamole' THEN 10 WHEN 'Tacos al Pastor' THEN 18
        WHEN 'Chiles Rellenos' THEN 22 WHEN 'Pozole Rojo' THEN 14 WHEN 'Spaghetti Carbonara' THEN 26
        WHEN 'Margherita Pizza' THEN 12 WHEN 'Risotto alla Milanese' THEN 18 WHEN 'Osso Buco' THEN 24
        WHEN 'Tiramisu' THEN 22 WHEN 'Pad Thai' THEN 16 WHEN 'Kung Pao Chicken' THEN 22
        WHEN 'Sushi Roll Platter' THEN 8 WHEN 'Pho Bo' THEN 6 WHEN 'Bibimbap' THEN 18
        WHEN 'Butter Chicken' THEN 28 WHEN 'Chana Masala' THEN 10 WHEN 'Palak Paneer' THEN 22
        WHEN 'Biryani' THEN 18 WHEN 'Dal Tadka' THEN 6 WHEN 'Classic Cheeseburger' THEN 32
        WHEN 'Mac and Cheese' THEN 24 WHEN 'BBQ Pulled Pork' THEN 18 WHEN 'Buffalo Wings' THEN 30
        WHEN 'Apple Pie' THEN 18 WHEN 'Shakshuka' THEN 16 WHEN 'Hummus' THEN 10
        WHEN 'Lamb Kofta Kebabs' THEN 22 WHEN 'Falafel' THEN 14 WHEN 'Stuffed Grape Leaves' THEN 8
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
        WHEN 'Chicken Enchiladas' THEN 3 WHEN 'Guacamole' THEN 6 WHEN 'Tacos al Pastor' THEN 2
        WHEN 'Chiles Rellenos' THEN 2 WHEN 'Pozole Rojo' THEN 4 WHEN 'Spaghetti Carbonara' THEN 1
        WHEN 'Margherita Pizza' THEN 2 WHEN 'Risotto alla Milanese' THEN 0 WHEN 'Osso Buco' THEN 0
        WHEN 'Tiramisu' THEN 0 WHEN 'Pad Thai' THEN 2 WHEN 'Kung Pao Chicken' THEN 2
        WHEN 'Sushi Roll Platter' THEN 2 WHEN 'Pho Bo' THEN 2 WHEN 'Bibimbap' THEN 4
        WHEN 'Butter Chicken' THEN 1 WHEN 'Chana Masala' THEN 8 WHEN 'Palak Paneer' THEN 4
        WHEN 'Biryani' THEN 2 WHEN 'Dal Tadka' THEN 8 WHEN 'Classic Cheeseburger' THEN 2
        WHEN 'Mac and Cheese' THEN 1 WHEN 'BBQ Pulled Pork' THEN 1 WHEN 'Buffalo Wings' THEN 0
        WHEN 'Apple Pie' THEN 3 WHEN 'Shakshuka' THEN 3 WHEN 'Hummus' THEN 6
        WHEN 'Lamb Kofta Kebabs' THEN 1 WHEN 'Falafel' THEN 5 WHEN 'Stuffed Grape Leaves' THEN 2
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
        WHEN 'Chicken Enchiladas' THEN 4 WHEN 'Guacamole' THEN 1 WHEN 'Tacos al Pastor' THEN 6
        WHEN 'Chiles Rellenos' THEN 2 WHEN 'Pozole Rojo' THEN 3 WHEN 'Spaghetti Carbonara' THEN 1
        WHEN 'Margherita Pizza' THEN 4 WHEN 'Risotto alla Milanese' THEN 1 WHEN 'Osso Buco' THEN 2
        WHEN 'Tiramisu' THEN 28 WHEN 'Pad Thai' THEN 8 WHEN 'Kung Pao Chicken' THEN 4
        WHEN 'Sushi Roll Platter' THEN 4 WHEN 'Pho Bo' THEN 2 WHEN 'Bibimbap' THEN 5
        WHEN 'Butter Chicken' THEN 6 WHEN 'Chana Masala' THEN 4 WHEN 'Palak Paneer' THEN 3
        WHEN 'Biryani' THEN 3 WHEN 'Dal Tadka' THEN 2 WHEN 'Classic Cheeseburger' THEN 8
        WHEN 'Mac and Cheese' THEN 3 WHEN 'BBQ Pulled Pork' THEN 12 WHEN 'Buffalo Wings' THEN 1
        WHEN 'Apple Pie' THEN 22 WHEN 'Shakshuka' THEN 5 WHEN 'Hummus' THEN 2
        WHEN 'Lamb Kofta Kebabs' THEN 2 WHEN 'Falafel' THEN 2 WHEN 'Stuffed Grape Leaves' THEN 1
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
        WHEN 'Chicken Enchiladas' THEN 680 WHEN 'Guacamole' THEN 120 WHEN 'Tacos al Pastor' THEN 520
        WHEN 'Chiles Rellenos' THEN 580 WHEN 'Pozole Rojo' THEN 680 WHEN 'Spaghetti Carbonara' THEN 580
        WHEN 'Margherita Pizza' THEN 480 WHEN 'Risotto alla Milanese' THEN 420 WHEN 'Osso Buco' THEN 380
        WHEN 'Tiramisu' THEN 120 WHEN 'Pad Thai' THEN 680 WHEN 'Kung Pao Chicken' THEN 820
        WHEN 'Sushi Roll Platter' THEN 580 WHEN 'Pho Bo' THEN 820 WHEN 'Bibimbap' THEN 680
        WHEN 'Butter Chicken' THEN 580 WHEN 'Chana Masala' THEN 420 WHEN 'Palak Paneer' THEN 480
        WHEN 'Biryani' THEN 520 WHEN 'Dal Tadka' THEN 280 WHEN 'Classic Cheeseburger' THEN 820
        WHEN 'Mac and Cheese' THEN 680 WHEN 'BBQ Pulled Pork' THEN 580 WHEN 'Buffalo Wings' THEN 820
        WHEN 'Apple Pie' THEN 180 WHEN 'Shakshuka' THEN 380 WHEN 'Hummus' THEN 280
        WHEN 'Lamb Kofta Kebabs' THEN 420 WHEN 'Falafel' THEN 380 WHEN 'Stuffed Grape Leaves' THEN 320
      END
    FROM public.recipes r
    WHERE r.title IN (
      'Jerk Chicken', 'Fish and Chips', 'Moussaka', 'Swedish Meatballs', 'Jollof Rice',
      'Beef Empanadas', 'Ceviche', 'Shepherd''s Pie', 'Spanakopita', 'Gravlax',
      'Chicken Tagine', 'Arepas', 'Sticky Toffee Pudding', 'Souvlaki', 'Kanelbullar',
      'Bobotie', 'Tres Leches Cake', 'Bangers and Mash', 'Baklava', 'Smörgåsbord',
      'Egusi Soup', 'Ropa Vieja', 'Full English Breakfast', 'Tzatziki', 'Pickled Herring',
      'Piri Piri Chicken', 'Lomo Saltado', 'Beef Wellington', 'Greek Salad', 'Norwegian Salmon Soup',
      'Chicken Enchiladas', 'Guacamole', 'Tacos al Pastor', 'Chiles Relenos', 'Pozole Rojo',
      'Spaghetti Carbonara', 'Margherita Pizza', 'Risotto alla Milanese', 'Osso Buco', 'Tiramisu',
      'Pad Thai', 'Kung Pao Chicken', 'Sushi Roll Platter', 'Pho Bo', 'Bibimbap',
      'Butter Chicken', 'Chana Masala', 'Palak Paneer', 'Biryani', 'Dal Tadka',
      'Classic Cheeseburger', 'Mac and Cheese', 'BBQ Pulled Pork', 'Buffalo Wings', 'Apple Pie',
      'Shakshuka', 'Hummus', 'Lamb Kofta Kebabs', 'Falafel', 'Stuffed Grape Leaves'
    )
    ON CONFLICT DO NOTHING;

    -- Insert sample recipe steps for all recipes
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
        -- Shepherd's Pie
        WHEN 'Shepherd''s Pie-1' THEN 'Brown lamb with onion, carrots, and peas. Add tomato paste and broth. Simmer 15 minutes.'
        WHEN 'Shepherd''s Pie-2' THEN 'Boil potatoes until tender. Mash with butter and milk until smooth.'
        WHEN 'Shepherd''s Pie-3' THEN 'Spread meat mixture in a baking dish. Top with mashed potatoes and fork the surface.'
        WHEN 'Shepherd''s Pie-4' THEN 'Bake at 400°F for 25 minutes until golden and bubbling.'
        -- Swedish Meatballs
        WHEN 'Swedish Meatballs-1' THEN 'Mix ground beef and pork with breadcrumbs, egg, onion, and allspice. Form into balls.'
        WHEN 'Swedish Meatballs-2' THEN 'Brown meatballs in butter on all sides. Remove and set aside.'
        WHEN 'Swedish Meatballs-3' THEN 'Make gravy in the same pan with flour, beef broth, and cream. Return meatballs.'
        WHEN 'Swedish Meatballs-4' THEN 'Simmer 10 minutes. Serve with lingonberry sauce and pickled cucumber.'
        -- Chicken Enchiladas
        WHEN 'Chicken Enchiladas-1' THEN 'Shred cooked chicken and mix with half the enchilada sauce and cheese.'
        WHEN 'Chicken Enchiladas-2' THEN 'Warm tortillas, fill with chicken mixture, roll tightly, and place seam-down in a baking dish.'
        WHEN 'Chicken Enchiladas-3' THEN 'Pour remaining sauce over enchiladas and top with cheese.'
        WHEN 'Chicken Enchiladas-4' THEN 'Bake at 375°F for 20 minutes until bubbly and cheese is melted.'
        -- Guacamole
        WHEN 'Guacamole-1' THEN 'Halve avocados and scoop flesh into a bowl. Mash with a fork to desired consistency.'
        WHEN 'Guacamole-2' THEN 'Add lime juice, diced onion, jalapeño, cilantro, and salt. Mix well.'
        WHEN 'Guacamole-3' THEN 'Taste and adjust seasoning. Serve immediately with tortilla chips.'
        -- Tacos al Pastor
        WHEN 'Tacos al Pastor-1' THEN 'Blend dried chiles, pineapple juice, achiote, and spices into a marinade.'
        WHEN 'Tacos al Pastor-2' THEN 'Marinate thinly sliced pork for at least 2 hours.'
        WHEN 'Tacos al Pastor-3' THEN 'Grill or pan-fry pork slices until charred. Dice pineapple and grill alongside.'
        WHEN 'Tacos al Pastor-4' THEN 'Serve on warm corn tortillas with pineapple, onion, and cilantro.'
        -- Spaghetti Carbonara
        WHEN 'Spaghetti Carbonara-1' THEN 'Cook spaghetti in salted boiling water until al dente. Reserve 1 cup pasta water.'
        WHEN 'Spaghetti Carbonara-2' THEN 'Crisp guanciale in a pan until golden. Remove from heat.'
        WHEN 'Spaghetti Carbonara-3' THEN 'Whisk egg yolks with pecorino romano and black pepper in a bowl.'
        WHEN 'Spaghetti Carbonara-4' THEN 'Toss hot pasta with guanciale, then quickly stir in egg mixture. Add pasta water as needed for creamy consistency.'
        -- Margherita Pizza
        WHEN 'Margherita Pizza-1' THEN 'Stretch pizza dough into a 12-inch round on a floured surface.'
        WHEN 'Margherita Pizza-2' THEN 'Spread crushed San Marzano tomatoes over dough. Drizzle with olive oil.'
        WHEN 'Margherita Pizza-3' THEN 'Bake at 500°F for 8 minutes. Add fresh mozzarella and bake 4 more minutes.'
        WHEN 'Margherita Pizza-4' THEN 'Top with fresh basil, a drizzle of olive oil, and serve immediately.'
        -- Pad Thai
        WHEN 'Pad Thai-1' THEN 'Soak rice noodles in warm water for 20 minutes. Drain.'
        WHEN 'Pad Thai-2' THEN 'Stir-fry shrimp in hot oil until pink. Push to side and scramble egg.'
        WHEN 'Pad Thai-3' THEN 'Add noodles, tamarind sauce, fish sauce, and sugar. Toss until noodles absorb sauce.'
        WHEN 'Pad Thai-4' THEN 'Top with bean sprouts, crushed peanuts, lime wedges, and cilantro.'
        -- Butter Chicken
        WHEN 'Butter Chicken-1' THEN 'Marinate chicken in yogurt, garam masala, turmeric, and chili powder for 1 hour.'
        WHEN 'Butter Chicken-2' THEN 'Grill or pan-sear marinated chicken until charred. Cut into pieces.'
        WHEN 'Butter Chicken-3' THEN 'Sauté onion, garlic, ginger. Add tomato puree, cream, and spices. Simmer 15 minutes.'
        WHEN 'Butter Chicken-4' THEN 'Add chicken to sauce. Simmer 10 minutes. Finish with butter and serve with naan.'
        -- Chana Masala
        WHEN 'Chana Masala-1' THEN 'Sauté onion until golden. Add garlic, ginger, and green chile.'
        WHEN 'Chana Masala-2' THEN 'Add tomatoes, cumin, coriander, turmeric, and garam masala. Cook until oil separates.'
        WHEN 'Chana Masala-3' THEN 'Add chickpeas and water. Simmer 15 minutes. Mash some chickpeas for thickness.'
        WHEN 'Chana Masala-4' THEN 'Finish with lemon juice and cilantro. Serve with rice or roti.'
        -- Classic Cheeseburger
        WHEN 'Classic Cheeseburger-1' THEN 'Form ground beef into 4 patties, season with salt and pepper.'
        WHEN 'Classic Cheeseburger-2' THEN 'Grill or pan-fry patties 4 minutes per side for medium.'
        WHEN 'Classic Cheeseburger-3' THEN 'Top with cheddar cheese in the last minute. Toast buns.'
        WHEN 'Classic Cheeseburger-4' THEN 'Assemble with lettuce, tomato, onion, pickles, and special sauce.'
        -- Mac and Cheese
        WHEN 'Mac and Cheese-1' THEN 'Cook elbow macaroni until al dente. Drain and set aside.'
        WHEN 'Mac and Cheese-2' THEN 'Make roux with butter and flour. Whisk in milk until thickened.'
        WHEN 'Mac and Cheese-3' THEN 'Stir in cheddar and gruyère until melted. Add pasta and mix.'
        WHEN 'Mac and Cheese-4' THEN 'Top with breadcrumbs and bake at 375°F for 20 minutes until golden.'
        -- Shakshuka
        WHEN 'Shakshuka-1' THEN 'Sauté onion and bell pepper until soft. Add garlic and cumin.'
        WHEN 'Shakshuka-2' THEN 'Add crushed tomatoes and simmer 10 minutes until thickened.'
        WHEN 'Shakshuka-3' THEN 'Make wells in the sauce and crack eggs into them.'
        WHEN 'Shakshuka-4' THEN 'Cover and cook 5-8 minutes until eggs are set. Top with feta and cilantro.'
        -- Hummus
        WHEN 'Hummus-1' THEN 'Blend chickpeas, tahini, lemon juice, garlic, and olive oil in a food processor until smooth.'
        WHEN 'Hummus-2' THEN 'Add ice water as needed for creamy consistency. Season with salt.'
        WHEN 'Hummus-3' THEN 'Serve drizzled with olive oil and sprinkled with paprika and parsley.'
        -- Falafel
        WHEN 'Falafel-1' THEN 'Blend soaked chickpeas with onion, garlic, parsley, cumin, and coriander. Do not over-process.'
        WHEN 'Falafel-2' THEN 'Form mixture into small patties. Refrigerate 30 minutes to firm up.'
        WHEN 'Falafel-3' THEN 'Deep fry at 350°F for 3-4 minutes until golden and crispy.'
        WHEN 'Falafel-4' THEN 'Serve in warm pita with tahini sauce, lettuce, tomato, and pickles.'
        -- Biryani
        WHEN 'Biryani-1' THEN 'Parboil basmati rice with whole spices. Drain when 70% cooked.'
        WHEN 'Biryani-2' THEN 'Brown marinated meat with onions, ginger, and garlic. Add yogurt and spices.'
        WHEN 'Biryani-3' THEN 'Layer meat and rice in a pot. Add saffron milk, fried onions, and mint.'
        WHEN 'Biryani-4' THEN 'Seal pot and cook on low heat for 30 minutes. Gently mix before serving.'
        -- Bibimbap
        WHEN 'Bibimbap-1' THEN 'Cook rice. Sauté spinach, carrots, bean sprouts, mushrooms, and zucchini separately.'
        WHEN 'Bibimbap-2' THEN 'Fry an egg sunny-side up. Brown beef with soy sauce and sesame oil.'
        WHEN 'Bibimbap-3' THEN 'Arrange vegetables and beef over rice in a bowl. Top with fried egg.'
        WHEN 'Bibimbap-4' THEN 'Serve with gochujang. Mix everything together before eating.'
        -- Pho Bo
        WHEN 'Pho Bo-1' THEN 'Char onion and ginger under the broiler. Toast star anise, cinnamon, and cloves.'
        WHEN 'Pho Bo-2' THEN 'Simmer beef bones with charred aromatics for 3-4 hours, skimming fat.'
        WHEN 'Pho Bo-3' THEN 'Strain broth and season with fish sauce and sugar.'
        WHEN 'Pho Bo-4' THEN 'Serve over rice noodles with sliced beef, bean sprouts, Thai basil, lime, and hoisin.'
        -- BBQ Pulled Pork
        WHEN 'BBQ Pulled Pork-1' THEN 'Rub pork shoulder with brown sugar, paprika, garlic powder, and cayenne.'
        WHEN 'BBQ Pulled Pork-2' THEN 'Smoke at 225°F for 6-8 hours until internal temp reaches 205°F.'
        WHEN 'BBQ Pulled Pork-3' THEN 'Rest 30 minutes, then shred with two forks.'
        WHEN 'BBQ Pulled Pork-4' THEN 'Toss with barbecue sauce. Serve on buns with coleslaw.'
        -- Buffalo Wings
        WHEN 'Buffalo Wings-1' THEN 'Pat chicken wings dry and season with salt and pepper.'
        WHEN 'Buffalo Wings-2' THEN 'Fry wings at 375°F for 10-12 minutes until crispy.'
        WHEN 'Buffalo Wings-3' THEN 'Toss in melted butter mixed with hot sauce.'
        WHEN 'Buffalo Wings-4' THEN 'Serve with blue cheese dip and celery sticks.'
        -- Apple Pie
        WHEN 'Apple Pie-1' THEN 'Make pie dough with flour, butter, and ice water. Chill 1 hour.'
        WHEN 'Apple Pie-2' THEN 'Toss sliced apples with sugar, cinnamon, nutmeg, and lemon juice.'
        WHEN 'Apple Pie-3' THEN 'Fill bottom crust with apples. Cover with top crust, crimp edges, and cut vents.'
        WHEN 'Apple Pie-4' THEN 'Bake at 400°F for 55 minutes until golden and bubbly.'
        -- Tiramisu
        WHEN 'Tiramisu-1' THEN 'Whisk egg yolks with sugar until pale. Fold in mascarpone cheese.'
        WHEN 'Tiramisu-2' THEN 'Whip heavy cream to stiff peaks and fold into mascarpone mixture.'
        WHEN 'Tiramisu-3' THEN 'Dip ladyfingers in espresso. Layer in a dish with cream mixture.'
        WHEN 'Tiramisu-4' THEN 'Refrigerate 4 hours. Dust with cocoa powder before serving.'
        -- Risotto alla Milanese
        WHEN 'Risotto alla Milanese-1' THEN 'Toast Arborio rice in butter for 2 minutes until translucent edges appear.'
        WHEN 'Risotto alla Milanese-2' THEN 'Add white wine and stir until absorbed.'
        WHEN 'Risotto alla Milanese-3' THEN 'Add warm saffron-infused broth one ladle at a time, stirring constantly for 18 minutes.'
        WHEN 'Risotto alla Milanese-4' THEN 'Finish with parmesan and butter. Season and serve immediately.'
        ELSE 'Prepare and cook as directed.'
      END
    FROM public.recipes r
    CROSS JOIN generate_series(1, 4) AS n
    WHERE r.title IN (
      'Jerk Chicken', 'Fish and Chips', 'Moussaka', 'Jollof Rice', 'Shepherd''s Pie',
      'Swedish Meatballs', 'Chicken Enchiladas', 'Guacamole', 'Tacos al Pastor',
      'Spaghetti Carbonara', 'Margherita Pizza', 'Pad Thai', 'Butter Chicken',
      'Chana Masala', 'Classic Cheeseburger', 'Mac and Cheese', 'Shakshuka',
      'Hummus', 'Falafel', 'Biryani', 'Bibimbap', 'Pho Bo', 'BBQ Pulled Pork',
      'Buffalo Wings', 'Apple Pie', 'Tiramisu', 'Risotto alla Milanese'
    )
    ON CONFLICT DO NOTHING;

    -- Insert steps for 3-step recipes
    INSERT INTO public.recipe_steps (recipe_id, step_number, instruction)
    SELECT r.id, n,
      CASE r.title || '-' || n
        -- Guacamole (3 steps, already handled above with 4)
        -- Chiles Rellenos
        WHEN 'Chiles Rellenos-1' THEN 'Roast poblanos under the broiler until charred. Place in a bag to steam 10 minutes, then peel.'
        WHEN 'Chiles Rellenos-2' THEN 'Slit peppers and stuff with cheese. Dredge in flour, then dip in whipped egg batter.'
        WHEN 'Chiles Rellenos-3' THEN 'Fry in hot oil until golden on all sides. Drain and serve with tomato sauce.'
        -- Pozole Rojo
        WHEN 'Pozole Rojo-1' THEN 'Simmer pork with onion and garlic in water for 1.5 hours until tender.'
        WHEN 'Pozole Rojo-2' THEN 'Blend dried guajillo and ancho chiles into a smooth sauce. Strain into the pot.'
        WHEN 'Pozole Rojo-3' THEN 'Add hominy and simmer 30 minutes. Serve with cabbage, radish, lime, and oregano.'
        -- Osso Buco
        WHEN 'Osso Buco-1' THEN 'Season veal shanks and brown in olive oil. Remove and set aside.'
        WHEN 'Osso Buco-2' THEN 'Sauté onion, carrot, celery. Add white wine and reduce by half. Add tomatoes and broth.'
        WHEN 'Osso Buco-3' THEN 'Return shanks to pot, cover, and braise at 325°F for 2 hours until fork-tender. Serve with gremolata.'
        -- Kung Pao Chicken
        WHEN 'Kung Pao Chicken-1' THEN 'Marinate diced chicken in soy sauce and cornstarch for 15 minutes.'
        WHEN 'Kung Pao Chicken-2' THEN 'Stir-fry chicken in hot oil until golden. Add dried chilies and Sichuan peppercorns.'
        WHEN 'Kung Pao Chicken-3' THEN 'Add sauce mixture of soy sauce, vinegar, sugar, and sesame oil. Toss with peanuts and serve.'
        -- Sushi Roll Platter
        WHEN 'Sushi Roll Platter-1' THEN 'Cook sushi rice with rice vinegar, sugar, and salt. Fan until cooled.'
        WHEN 'Sushi Roll Platter-2' THEN 'Place nori on bamboo mat, spread rice, add fish and vegetables, roll tightly.'
        WHEN 'Sushi Roll Platter-3' THEN 'Slice rolls with a wet knife. Serve with soy sauce, wasabi, and pickled ginger.'
        -- Palak Paneer
        WHEN 'Palak Paneer-1' THEN 'Blanch spinach and blend into a smooth puree.'
        WHEN 'Palak Paneer-2' THEN 'Sauté onion, garlic, ginger, and spices. Add spinach puree and cream. Simmer 10 minutes.'
        WHEN 'Palak Paneer-3' THEN 'Pan-fry paneer cubes until golden. Add to spinach sauce and serve with naan.'
        -- Dal Tadka
        WHEN 'Dal Tadka-1' THEN 'Boil lentils with turmeric and water until soft and creamy.'
        WHEN 'Dal Tadka-2' THEN 'Heat ghee, add cumin seeds, mustard seeds, garlic, and dried chilies until they splutter.'
        WHEN 'Dal Tadka-3' THEN 'Pour tempering over lentils. Add lemon juice and cilantro. Serve with rice.'
        -- Lamb Kofta Kebabs
        WHEN 'Lamb Kofta Kebabs-1' THEN 'Mix ground lamb with onion, parsley, cumin, coriander, and cinnamon. Form onto skewers.'
        WHEN 'Lamb Kofta Kebabs-2' THEN 'Grill kebabs over high heat for 3-4 minutes per side until charred and cooked through.'
        WHEN 'Lamb Kofta Kebabs-3' THEN 'Serve with tzatziki, warm flatbread, and sliced tomatoes.'
        -- Stuffed Grape Leaves
        WHEN 'Stuffed Grape Leaves-1' THEN 'Mix rice with herbs, pine nuts, lemon juice, and olive oil.'
        WHEN 'Stuffed Grape Leaves-2' THEN 'Place a spoonful of filling on each grape leaf and roll tightly, tucking in sides.'
        WHEN 'Stuffed Grape Leaves-3' THEN 'Arrange in a pot, add broth and lemon juice, weigh down, and simmer 45 minutes.'
        ELSE 'Prepare and cook as directed.'
      END
    FROM public.recipes r
    CROSS JOIN generate_series(1, 3) AS n
    WHERE r.title IN (
      'Chiles Rellenos', 'Pozole Rojo', 'Osso Buco', 'Kung Pao Chicken',
      'Sushi Roll Platter', 'Palak Paneer', 'Dal Tadka', 'Lamb Kofta Kebabs',
      'Stuffed Grape Leaves'
    )
    ON CONFLICT DO NOTHING;

    -- Insert sample ingredients for all recipes
    INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit)
    SELECT r.id, i.name, i.quantity, i.unit
    FROM public.recipes r
    CROSS JOIN LATERAL unnest(
      CASE r.title
        WHEN 'Jerk Chicken' THEN ARRAY['chicken thighs','scotch bonnet peppers','allspice','thyme','soy sauce','brown sugar']::text[]
        WHEN 'Fish and Chips' THEN ARRAY['cod fillets','beer','flour','potatoes','baking powder','salt']::text[]
        WHEN 'Moussaka' THEN ARRAY['eggplant','ground lamb','onion','tomato sauce','butter','flour','milk']::text[]
        WHEN 'Swedish Meatballs' THEN ARRAY['ground beef','ground pork','breadcrumbs','egg','butter','beef broth','cream']::text[]
        WHEN 'Jollof Rice' THEN ARRAY['long grain rice','tomato paste','red bell pepper','scotch bonnet','onion','thyme']::text[]
        WHEN 'Beef Empanadas' THEN ARRAY['ground beef','empanada dough','onion','olives','hard-boiled eggs','cumin']::text[]
        WHEN 'Ceviche' THEN ARRAY['white fish','lime juice','red onion','cilantro','aji pepper','salt']::text[]
        WHEN 'Shepherd''s Pie' THEN ARRAY['ground lamb','potatoes','carrots','peas','onion','butter','milk']::text[]
        WHEN 'Spanakopita' THEN ARRAY['spinach','feta cheese','phyllo dough','onion','dill','olive oil']::text[]
        WHEN 'Gravlax' THEN ARRAY['salmon fillet','dill','sugar','salt','white pepper','mustard']::text[]
        WHEN 'Chicken Tagine' THEN ARRAY['chicken thighs','preserved lemons','green olives','onion','ginger','saffron']::text[]
        WHEN 'Arepas' THEN ARRAY['cornmeal','water','black beans','cheese','avocado','salt']::text[]
        WHEN 'Sticky Toffee Pudding' THEN ARRAY['dates','flour','butter','brown sugar','eggs','cream']::text[]
        WHEN 'Souvlaki' THEN ARRAY['pork shoulder','lemon juice','oregano','garlic','olive oil','pita bread']::text[]
        WHEN 'Kanelbullar' THEN ARRAY['flour','butter','sugar','yeast','cardamom','cinnamon']::text[]
        WHEN 'Bobotie' THEN ARRAY['ground beef','bread','milk','onion','curry powder','eggs']::text[]
        WHEN 'Tres Leches Cake' THEN ARRAY['flour','eggs','sugar','evaporated milk','condensed milk','whole milk']::text[]
        WHEN 'Bangers and Mash' THEN ARRAY['pork sausages','potatoes','onion','butter','milk','gravy mix']::text[]
        WHEN 'Baklava' THEN ARRAY['phyllo dough','walnuts','pistachios','butter','honey','sugar']::text[]
        WHEN 'Smörgåsbord' THEN ARRAY['herring','gravlax','meatballs','cheese','crispbread','butter']::text[]
        WHEN 'Egusi Soup' THEN ARRAY['melon seeds','spinach','assorted meat','palm oil','onion','crayfish']::text[]
        WHEN 'Ropa Vieja' THEN ARRAY['beef flank','bell peppers','onion','tomatoes','garlic','cumin']::text[]
        WHEN 'Full English Breakfast' THEN ARRAY['eggs','bacon','sausages','baked beans','mushrooms','bread']::text[]
        WHEN 'Tzatziki' THEN ARRAY['greek yogurt','cucumber','garlic','dill','olive oil','lemon juice']::text[]
        WHEN 'Pickled Herring' THEN ARRAY['herring','vinegar','onion','bay leaves','allspice','sugar']::text[]
        WHEN 'Piri Piri Chicken' THEN ARRAY['chicken','piri piri sauce','olive oil','garlic','lemon','paprika']::text[]
        WHEN 'Lomo Saltado' THEN ARRAY['beef sirloin','onion','tomatoes','soy sauce','french fries','rice']::text[]
        WHEN 'Beef Wellington' THEN ARRAY['beef tenderloin','mushrooms','puff pastry','prosciutto','egg','mustard']::text[]
        WHEN 'Greek Salad' THEN ARRAY['tomatoes','cucumbers','feta cheese','olives','red onion','olive oil']::text[]
        WHEN 'Norwegian Salmon Soup' THEN ARRAY['salmon','potatoes','carrots','dill','cream','onion']::text[]
        WHEN 'Chicken Enchiladas' THEN ARRAY['chicken','corn tortillas','enchilada sauce','cheese','onion','sour cream']::text[]
        WHEN 'Guacamole' THEN ARRAY['avocados','lime','onion','jalapeño','cilantro','salt']::text[]
        WHEN 'Tacos al Pastor' THEN ARRAY['pork shoulder','pineapple','achiote paste','dried chiles','corn tortillas','cilantro']::text[]
        WHEN 'Chiles Rellenos' THEN ARRAY['poblano peppers','cheese','eggs','flour','oil','tomato sauce']::text[]
        WHEN 'Pozole Rojo' THEN ARRAY['pork shoulder','hominy','guajillo chiles','ancho chiles','onion','garlic']::text[]
        WHEN 'Spaghetti Carbonara' THEN ARRAY['spaghetti','guanciale','egg yolks','pecorino romano','black pepper','salt']::text[]
        WHEN 'Margherita Pizza' THEN ARRAY['pizza dough','san marzano tomatoes','mozzarella','basil','olive oil','salt']::text[]
        WHEN 'Risotto alla Milanese' THEN ARRAY['arborio rice','saffron','parmesan','butter','white wine','onion']::text[]
        WHEN 'Osso Buco' THEN ARRAY['veal shanks','white wine','tomatoes','onion','carrot','celery']::text[]
        WHEN 'Tiramisu' THEN ARRAY['ladyfingers','espresso','mascarpone','egg yolks','sugar','cocoa powder']::text[]
        WHEN 'Pad Thai' THEN ARRAY['rice noodles','shrimp','bean sprouts','peanuts','tamarind paste','fish sauce']::text[]
        WHEN 'Kung Pao Chicken' THEN ARRAY['chicken breast','peanuts','dried chilies','soy sauce','vinegar','sichuan peppercorns']::text[]
        WHEN 'Sushi Roll Platter' THEN ARRAY['sushi rice','nori','salmon','tuna','avocado','cucumber']::text[]
        WHEN 'Pho Bo' THEN ARRAY['beef bones','rice noodles','star anise','cinnamon','ginger','fish sauce']::text[]
        WHEN 'Bibimbap' THEN ARRAY['rice','spinach','carrots','bean sprouts','gochujang','egg']::text[]
        WHEN 'Butter Chicken' THEN ARRAY['chicken thighs','yogurt','tomato puree','cream','garam masala','butter']::text[]
        WHEN 'Chana Masala' THEN ARRAY['chickpeas','tomatoes','onion','garlic','ginger','garam masala']::text[]
        WHEN 'Palak Paneer' THEN ARRAY['spinach','paneer','onion','garlic','ginger','cream']::text[]
        WHEN 'Biryani' THEN ARRAY['basmati rice','chicken','yogurt','saffron','onion','garam masala']::text[]
        WHEN 'Dal Tadka' THEN ARRAY['yellow lentils','ghee','cumin seeds','mustard seeds','garlic','turmeric']::text[]
        WHEN 'Classic Cheeseburger' THEN ARRAY['ground beef','cheddar cheese','brioche buns','lettuce','tomato','special sauce']::text[]
        WHEN 'Mac and Cheese' THEN ARRAY['elbow macaroni','cheddar','gruyere','butter','flour','milk']::text[]
        WHEN 'BBQ Pulled Pork' THEN ARRAY['pork shoulder','brown sugar','paprika','bbq sauce','apple cider vinegar','garlic']::text[]
        WHEN 'Buffalo Wings' THEN ARRAY['chicken wings','hot sauce','butter','blue cheese','celery','flour']::text[]
        WHEN 'Apple Pie' THEN ARRAY['apples','flour','butter','sugar','cinnamon','lemon juice']::text[]
        WHEN 'Shakshuka' THEN ARRAY['eggs','tomatoes','bell pepper','onion','feta','cumin']::text[]
        WHEN 'Hummus' THEN ARRAY['chickpeas','tahini','lemon juice','garlic','olive oil','salt']::text[]
        WHEN 'Lamb Kofta Kebabs' THEN ARRAY['ground lamb','onion','parsley','cumin','coriander','cinnamon']::text[]
        WHEN 'Falafel' THEN ARRAY['chickpeas','parsley','onion','garlic','cumin','coriander']::text[]
        WHEN 'Stuffed Grape Leaves' THEN ARRAY['grape leaves','rice','pine nuts','lemon juice','olive oil','dill']::text[]
      END,
      CASE r.title
        WHEN 'Jerk Chicken' THEN ARRAY['8','4','2 tbsp','1 tbsp','2 tbsp','2 tbsp']::text[]
        WHEN 'Fish and Chips' THEN ARRAY['4 fillets','1 cup','1 cup','4 large','1 tsp','1 tsp']::text[]
        WHEN 'Moussaka' THEN ARRAY['2','1 lb','1','2 cups','4 tbsp','3 tbsp','2 cups']::text[]
        WHEN 'Swedish Meatballs' THEN ARRAY['1 lb','1 lb','1/2 cup','1','3 tbsp','2 cups','1/2 cup']::text[]
        WHEN 'Jollof Rice' THEN ARRAY['3 cups','3 tbsp','3','2','1','1 tsp']::text[]
        WHEN 'Beef Empanadas' THEN ARRAY['1 lb','12 discs','1','1/2 cup','3','1 tsp']::text[]
        WHEN 'Ceviche' THEN ARRAY['1 lb','1 cup','1','1/2 cup','1','1 tsp']::text[]
        WHEN 'Shepherd''s Pie' THEN ARRAY['1.5 lb','3','2','1 cup','1','4 tbsp','1/2 cup']::text[]
        WHEN 'Spanakopita' THEN ARRAY['2 lbs','8 oz','1 package','1','2 tbsp','1/4 cup']::text[]
        WHEN 'Gravlax' THEN ARRAY['2 lbs','2 bunches','1/4 cup','1/4 cup','1 tsp','2 tbsp']::text[]
        WHEN 'Chicken Tagine' THEN ARRAY['8','3','1 cup','2','1 tbsp','1 pinch']::text[]
        WHEN 'Arepas' THEN ARRAY['2 cups','2 cups','1 cup','4 oz','2','1 tsp']::text[]
        WHEN 'Sticky Toffee Pudding' THEN ARRAY['8 oz','1.5 cups','4 tbsp','1 cup','2','1 cup']::text[]
        WHEN 'Souvlaki' THEN ARRAY['2 lbs','1/4 cup','2 tbsp','4 cloves','1/4 cup','4']::text[]
        WHEN 'Kanelbullar' THEN ARRAY['4 cups','4 tbsp','1/2 cup','2.25 tsp','2 tsp','2 tbsp']::text[]
        WHEN 'Bobotie' THEN ARRAY['1 lb','2 slices','1/2 cup','1','2 tbsp','2']::text[]
        WHEN 'Tres Leches Cake' THEN ARRAY['1.5 cups','5','1 cup','1 can','1 can','1 cup']::text[]
        WHEN 'Bangers and Mash' THEN ARRAY['8','4','1','3 tbsp','1/4 cup','1 packet']::text[]
        WHEN 'Baklava' THEN ARRAY['1 package','2 cups','1 cup','1 cup','1 cup','1/2 cup']::text[]
        WHEN 'Smörgåsbord' THEN ARRAY['1 lb','1 lb','1 lb','8 oz','1 package','4 tbsp']::text[]
        WHEN 'Egusi Soup' THEN ARRAY['1 cup','2 cups','1 lb','1/4 cup','1','2 tbsp']::text[]
        WHEN 'Ropa Vieja' THEN ARRAY['2 lbs','2','1','4','4 cloves','1 tsp']::text[]
        WHEN 'Full English Breakfast' THEN ARRAY['4','8 slices','8','1 can','8 oz','4 slices']::text[]
        WHEN 'Tzatziki' THEN ARRAY['2 cups','1','2 cloves','2 tbsp','2 tbsp','1 tbsp']::text[]
        WHEN 'Pickled Herring' THEN ARRAY['2 lbs','2 cups','1','3','1 tsp','2 tbsp']::text[]
        WHEN 'Piri Piri Chicken' THEN ARRAY['1 whole','1/2 cup','3 tbsp','4 cloves','1','1 tsp']::text[]
        WHEN 'Lomo Saltado' THEN ARRAY['1.5 lbs','2','3','3 tbsp','2 cups','2 cups']::text[]
        WHEN 'Beef Wellington' THEN ARRAY['2 lbs','1 lb','1 sheet','6 slices','1','2 tbsp']::text[]
        WHEN 'Greek Salad' THEN ARRAY['4','2','8 oz','1/2 cup','1','1/4 cup']::text[]
        WHEN 'Norwegian Salmon Soup' THEN ARRAY['1 lb','3','2','2 tbsp','1 cup','1']::text[]
        WHEN 'Chicken Enchiladas' THEN ARRAY['3 cups','12','2 cups','2 cups','1','1/2 cup']::text[]
        WHEN 'Guacamole' THEN ARRAY['3','2','1/2','1','1/4 cup','1/2 tsp']::text[]
        WHEN 'Tacos al Pastor' THEN ARRAY['2 lbs','1','2 tbsp','4','12','1/2 cup']::text[]
        WHEN 'Chiles Rellenos' THEN ARRAY['6','8 oz','4','1/4 cup','2 cups','1 cup']::text[]
        WHEN 'Pozole Rojo' THEN ARRAY['2 lbs','2 cans','4','3','1','4 cloves']::text[]
        WHEN 'Spaghetti Carbonara' THEN ARRAY['1 lb','6 oz','4','1 cup','2 tsp','1 pinch']::text[]
        WHEN 'Margherita Pizza' THEN ARRAY['1 ball','1 can','8 oz','1 bunch','2 tbsp','1 pinch']::text[]
        WHEN 'Risotto alla Milanese' THEN ARRAY['1.5 cups','1 pinch','1/2 cup','3 tbsp','1/2 cup','1']::text[]
        WHEN 'Osso Buco' THEN ARRAY['4 shanks','1 cup','4','1','1','1']::text[]
        WHEN 'Tiramisu' THEN ARRAY['24','1.5 cups','16 oz','4','1/2 cup','2 tbsp']::text[]
        WHEN 'Pad Thai' THEN ARRAY['8 oz','1/2 lb','1 cup','1/4 cup','2 tbsp','2 tbsp']::text[]
        WHEN 'Kung Pao Chicken' THEN ARRAY['1 lb','1/2 cup','8','2 tbsp','1 tbsp','1 tsp']::text[]
        WHEN 'Sushi Roll Platter' THEN ARRAY['3 cups','10 sheets','8 oz','6 oz','1','1']::text[]
        WHEN 'Pho Bo' THEN ARRAY['3 lbs','8 oz','3','2 sticks','3 inches','2 tbsp']::text[]
        WHEN 'Bibimbap' THEN ARRAY['2 cups','1 bunch','2','1 cup','3 tbsp','4']::text[]
        WHEN 'Butter Chicken' THEN ARRAY['8','1 cup','1 can','1 cup','2 tbsp','3 tbsp']::text[]
        WHEN 'Chana Masala' THEN ARRAY['2 cans','3','1','4 cloves','1 tbsp','2 tsp']::text[]
        WHEN 'Palak Paneer' THEN ARRAY['2 lbs','8 oz','1','4 cloves','1 tbsp','1/4 cup']::text[]
        WHEN 'Biryani' THEN ARRAY['2 cups','1.5 lbs','1/2 cup','1 pinch','2','2 tbsp']::text[]
        WHEN 'Dal Tadka' THEN ARRAY['1 cup','2 tbsp','1 tsp','1 tsp','4 cloves','1/2 tsp']::text[]
        WHEN 'Classic Cheeseburger' THEN ARRAY['1 lb','4 slices','4','4','4','4 tbsp']::text[]
        WHEN 'Mac and Cheese' THEN ARRAY['1 lb','2 cups','1 cup','4 tbsp','3 tbsp','3 cups']::text[]
        WHEN 'BBQ Pulled Pork' THEN ARRAY['4 lbs','2 tbsp','2 tbsp','1 cup','2 tbsp','6 cloves']::text[]
        WHEN 'Buffalo Wings' THEN ARRAY['2 lbs','1/2 cup','3 tbsp','4 oz','4 stalks','1/2 cup']::text[]
        WHEN 'Apple Pie' THEN ARRAY['6','2.5 cups','1 cup','3/4 cup','2 tsp','1 tbsp']::text[]
        WHEN 'Shakshuka' THEN ARRAY['6','4','1','1','2 oz','1 tsp']::text[]
        WHEN 'Hummus' THEN ARRAY['2 cans','1/3 cup','3 tbsp','2 cloves','2 tbsp','1/2 tsp']::text[]
        WHEN 'Lamb Kofta Kebabs' THEN ARRAY['1 lb','1','1/4 cup','1 tsp','1 tsp','1/2 tsp']::text[]
        WHEN 'Falafel' THEN ARRAY['2 cups','1/2 cup','1','4 cloves','2 tsp','2 tsp']::text[]
        WHEN 'Stuffed Grape Leaves' THEN ARRAY['1 jar','1 cup','2 tbsp','3 tbsp','1/4 cup','2 tbsp']::text[]
      END,
      CASE r.title
        WHEN 'Jerk Chicken' THEN ARRAY['pieces','whole',''::text,''::text,''::text,''::text]::text[]
        WHEN 'Fish and Chips' THEN ARRAY[''::text,'cup','cup','whole','tsp','tsp']::text[]
        WHEN 'Moussaka' THEN ARRAY['whole','lb','whole','cup','tbsp','tbsp','cup']::text[]
        WHEN 'Swedish Meatballs' THEN ARRAY['lb','lb','cup','whole','tbsp','cup','cup']::text[]
        WHEN 'Jollof Rice' THEN ARRAY['cups','tbsp','whole','whole','whole','tsp']::text[]
        WHEN 'Beef Empanadas' THEN ARRAY['lb','discs','whole','cup','whole','tsp']::text[]
        WHEN 'Ceviche' THEN ARRAY['lb','cup','whole','cup','whole','tsp']::text[]
        WHEN 'Shepherd''s Pie' THEN ARRAY['lb','whole','whole','cup','whole','tbsp','cup']::text[]
        WHEN 'Spanakopita' THEN ARRAY['lbs','oz','package','whole','tbsp','cup']::text[]
        WHEN 'Gravlax' THEN ARRAY['lbs','bunches','cup','cup','tsp','tbsp']::text[]
        WHEN 'Chicken Tagine' THEN ARRAY['whole','whole','cup','whole','tbsp','pinch']::text[]
        WHEN 'Arepas' THEN ARRAY['cups','cups','cup','oz','whole','tsp']::text[]
        WHEN 'Sticky Toffee Pudding' THEN ARRAY['oz','cups','tbsp','cup','whole','cup']::text[]
        WHEN 'Souvlaki' THEN ARRAY['lbs','cup','tbsp','cloves','cup','whole']::text[]
        WHEN 'Kanelbullar' THEN ARRAY['cups','tbsp','cup','tsp','tsp','tbsp']::text[]
        WHEN 'Bobotie' THEN ARRAY['lb','slices','cup','whole','tbsp','whole']::text[]
        WHEN 'Tres Leches Cake' THEN ARRAY['cups','whole','cup','can','can','cup']::text[]
        WHEN 'Bangers and Mash' THEN ARRAY['whole','whole','whole','tbsp','cup','packet']::text[]
        WHEN 'Baklava' THEN ARRAY['package','cups','cup','cup','cup','cup']::text[]
        WHEN 'Smörgåsbord' THEN ARRAY['lb','lb','lb','oz','package','tbsp']::text[]
        WHEN 'Egusi Soup' THEN ARRAY['cup','cups','lb','cup','whole','tbsp']::text[]
        WHEN 'Ropa Vieja' THEN ARRAY['lbs','whole','whole','whole','cloves','tsp']::text[]
        WHEN 'Full English Breakfast' THEN ARRAY['whole','slices','whole','can','oz','slices']::text[]
        WHEN 'Tzatziki' THEN ARRAY['cups','whole','cloves','tbsp','tbsp','tbsp']::text[]
        WHEN 'Pickled Herring' THEN ARRAY['lbs','cups','whole','whole','tsp','tbsp']::text[]
        WHEN 'Piri Piri Chicken' THEN ARRAY['whole','cup','tbsp','cloves','whole','tsp']::text[]
        WHEN 'Lomo Saltado' THEN ARRAY['lbs','whole','whole','tbsp','cups','cups']::text[]
        WHEN 'Beef Wellington' THEN ARRAY['lbs','lb','sheet','slices','whole','tbsp']::text[]
        WHEN 'Greek Salad' THEN ARRAY['whole','whole','oz','cup','whole','cup']::text[]
        WHEN 'Norwegian Salmon Soup' THEN ARRAY['lb','whole','whole','tbsp','cup','whole']::text[]
        WHEN 'Chicken Enchiladas' THEN ARRAY['cups','whole','cups','cups','whole','cup']::text[]
        WHEN 'Guacamole' THEN ARRAY['whole','whole','whole','whole','cup','tsp']::text[]
        WHEN 'Tacos al Pastor' THEN ARRAY['lbs','whole','tbsp','whole','whole','cup']::text[]
        WHEN 'Chiles Rellenos' THEN ARRAY['whole','oz','whole','cup','cups','cup']::text[]
        WHEN 'Pozole Rojo' THEN ARRAY['lbs','cans','whole','whole','whole','cloves']::text[]
        WHEN 'Spaghetti Carbonara' THEN ARRAY['lb','oz','whole','cup','tsp','pinch']::text[]
        WHEN 'Margherita Pizza' THEN ARRAY['ball','can','oz','bunch','tbsp','pinch']::text[]
        WHEN 'Risotto alla Milanese' THEN ARRAY['cups','pinch','cup','tbsp','cup','whole']::text[]
        WHEN 'Osso Buco' THEN ARRAY['shanks','cup','whole','whole','whole','whole']::text[]
        WHEN 'Tiramisu' THEN ARRAY['whole','cups','oz','whole','cup','tbsp']::text[]
        WHEN 'Pad Thai' THEN ARRAY['oz','lb','cup','cup','tbsp','tbsp']::text[]
        WHEN 'Kung Pao Chicken' THEN ARRAY['lb','cup','whole','tbsp','tbsp','tsp']::text[]
        WHEN 'Sushi Roll Platter' THEN ARRAY['cups','sheets','oz','oz','whole','whole']::text[]
        WHEN 'Pho Bo' THEN ARRAY['lbs','oz','whole','sticks','inches','tbsp']::text[]
        WHEN 'Bibimbap' THEN ARRAY['cups','bunch','whole','cup','tbsp','whole']::text[]
        WHEN 'Butter Chicken' THEN ARRAY['whole','cup','can','cup','tbsp','tbsp']::text[]
        WHEN 'Chana Masala' THEN ARRAY['cans','whole','whole','cloves','tbsp','tsp']::text[]
        WHEN 'Palak Paneer' THEN ARRAY['lbs','oz','whole','cloves','tbsp','cup']::text[]
        WHEN 'Biryani' THEN ARRAY['cups','lbs','cup','pinch','whole','tbsp']::text[]
        WHEN 'Dal Tadka' THEN ARRAY['cup','tbsp','tsp','tsp','cloves','tsp']::text[]
        WHEN 'Classic Cheeseburger' THEN ARRAY['lb','slices','whole','whole','whole','tbsp']::text[]
        WHEN 'Mac and Cheese' THEN ARRAY['lb','cups','cup','tbsp','tbsp','cups']::text[]
        WHEN 'BBQ Pulled Pork' THEN ARRAY['lbs','tbsp','tbsp','cup','tbsp','cloves']::text[]
        WHEN 'Buffalo Wings' THEN ARRAY['lbs','cup','tbsp','oz','stalks','cup']::text[]
        WHEN 'Apple Pie' THEN ARRAY['whole','cups','cup','cup','tsp','tbsp']::text[]
        WHEN 'Shakshuka' THEN ARRAY['whole','whole','whole','whole','oz','tsp']::text[]
        WHEN 'Hummus' THEN ARRAY['cans','cup','tbsp','cloves','tbsp','tsp']::text[]
        WHEN 'Lamb Kofta Kebabs' THEN ARRAY['lb','whole','cup','tsp','tsp','tsp']::text[]
        WHEN 'Falafel' THEN ARRAY['cups','cup','whole','cloves','tsp','tsp']::text[]
        WHEN 'Stuffed Grape Leaves' THEN ARRAY['jar','cup','tbsp','tbsp','cup','tbsp']::text[]
      END
    ) AS i(name, quantity, unit)
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
        WHEN 'Chicken Enchiladas' THEN ARRAY['enchiladas','mexican','chicken','cheese','baked']
        WHEN 'Guacamole' THEN ARRAY['guacamole','mexican','avocado','dip','no-cook']
        WHEN 'Tacos al Pastor' THEN ARRAY['tacos al pastor','mexican','pork','pineapple','grilled']
        WHEN 'Chiles Rellenos' THEN ARRAY['chiles rellenos','mexican','poblano','cheese','fried']
        WHEN 'Pozole Rojo' THEN ARRAY['pozole','mexican','hominy','pork','stew']
        WHEN 'Spaghetti Carbonara' THEN ARRAY['carbonara','italian','pasta','guanciale','egg']
        WHEN 'Margherita Pizza' THEN ARRAY['margherita','italian','pizza','mozzarella','basil']
        WHEN 'Risotto alla Milanese' THEN ARRAY['risotto','italian','saffron','parmesan','creamy']
        WHEN 'Osso Buco' THEN ARRAY['osso buco','italian','veal','braised','gremolata']
        WHEN 'Tiramisu' THEN ARRAY['tiramisu','italian','dessert','espresso','mascarpone']
        WHEN 'Pad Thai' THEN ARRAY['pad thai','thai','noodles','shrimp','stir-fry']
        WHEN 'Kung Pao Chicken' THEN ARRAY['kung pao','sichuan','chicken','peanuts','spicy']
        WHEN 'Sushi Roll Platter' THEN ARRAY['sushi','japanese','fish','rice','maki']
        WHEN 'Pho Bo' THEN ARRAY['pho','vietnamese','beef','noodle soup','aromatic']
        WHEN 'Bibimbap' THEN ARRAY['bibimbap','korean','rice bowl','gochujang','vegetables']
        WHEN 'Butter Chicken' THEN ARRAY['butter chicken','indian','curry','tomato','cream']
        WHEN 'Chana Masala' THEN ARRAY['chana masala','indian','chickpea','curry','vegetarian']
        WHEN 'Palak Paneer' THEN ARRAY['palak paneer','indian','spinach','paneer','curry']
        WHEN 'Biryani' THEN ARRAY['biryani','indian','rice','saffron','layered']
        WHEN 'Dal Tadka' THEN ARRAY['dal','indian','lentils','tempered','comfort food']
        WHEN 'Classic Cheeseburger' THEN ARRAY['cheeseburger','american','beef','cheddar','grilled']
        WHEN 'Mac and Cheese' THEN ARRAY['mac and cheese','american','pasta','cheddar','baked']
        WHEN 'BBQ Pulled Pork' THEN ARRAY['pulled pork','american','bbq','smoked','slow-cooked']
        WHEN 'Buffalo Wings' THEN ARRAY['buffalo wings','american','chicken','spicy','appetizer']
        WHEN 'Apple Pie' THEN ARRAY['apple pie','american','dessert','cinnamon','baked']
        WHEN 'Shakshuka' THEN ARRAY['shakshuka','mediterranean','eggs','tomato','skillet']
        WHEN 'Hummus' THEN ARRAY['hummus','mediterranean','chickpea','dip','tahini']
        WHEN 'Lamb Kofta Kebabs' THEN ARRAY['kofta','mediterranean','lamb','grilled','skewer']
        WHEN 'Falafel' THEN ARRAY['falafel','mediterranean','chickpea','fried','pita']
        WHEN 'Stuffed Grape Leaves' THEN ARRAY['grape leaves','mediterranean','rice','herbs','appetizer']
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
        WHEN 'Chicken Enchiladas' THEN ARRAY[false,false,false,false,false,true,true,false,false]
        WHEN 'Guacamole' THEN ARRAY[true,true,true,true,true,true,true,true,true]
        WHEN 'Tacos al Pastor' THEN ARRAY[false,false,false,true,true,true,true,false,false]
        WHEN 'Chiles Rellenos' THEN ARRAY[true,false,false,false,false,true,true,false,false]
        WHEN 'Pozole Rojo' THEN ARRAY[false,false,true,false,true,true,true,false,false]
        WHEN 'Spaghetti Carbonara' THEN ARRAY[false,false,false,false,true,true,false,false,false]
        WHEN 'Margherita Pizza' THEN ARRAY[true,false,false,false,false,true,true,true,false]
        WHEN 'Risotto alla Milanese' THEN ARRAY[true,false,false,true,false,true,true,true,false]
        WHEN 'Osso Buco' THEN ARRAY[false,false,false,true,true,true,true,true,false]
        WHEN 'Tiramisu' THEN ARRAY[true,false,false,false,false,true,true,true,false]
        WHEN 'Pad Thai' THEN ARRAY[false,false,false,false,true,false,true,false,false]
        WHEN 'Kung Pao Chicken' THEN ARRAY[false,false,false,true,true,false,true,false,false]
        WHEN 'Sushi Roll Platter' THEN ARRAY[false,false,true,false,true,true,true,true,false]
        WHEN 'Pho Bo' THEN ARRAY[false,false,true,false,true,true,true,false,false]
        WHEN 'Bibimbap' THEN ARRAY[false,false,false,true,false,true,true,false,false]
        WHEN 'Butter Chicken' THEN ARRAY[false,false,false,false,false,true,true,false,false]
        WHEN 'Chana Masala' THEN ARRAY[true,true,false,true,true,true,true,true,false]
        WHEN 'Palak Paneer' THEN ARRAY[true,false,false,true,false,true,true,false,false]
        WHEN 'Biryani' THEN ARRAY[false,false,false,true,true,true,true,false,false]
        WHEN 'Dal Tadka' THEN ARRAY[true,true,false,true,false,true,true,true,false]
        WHEN 'Classic Cheeseburger' THEN ARRAY[false,false,false,false,true,true,false,false,false]
        WHEN 'Mac and Cheese' THEN ARRAY[true,false,false,false,false,true,true,true,false]
        WHEN 'BBQ Pulled Pork' THEN ARRAY[false,false,false,true,true,true,true,false,false]
        WHEN 'Buffalo Wings' THEN ARRAY[false,false,true,true,true,true,false,false,true]
        WHEN 'Apple Pie' THEN ARRAY[true,false,false,false,false,true,true,true,false]
        WHEN 'Shakshuka' THEN ARRAY[true,false,true,true,false,true,true,true,false]
        WHEN 'Hummus' THEN ARRAY[true,true,false,true,true,true,true,true,false]
        WHEN 'Lamb Kofta Kebabs' THEN ARRAY[false,false,false,true,true,true,true,false,false]
        WHEN 'Falafel' THEN ARRAY[true,true,false,true,true,true,true,true,false]
        WHEN 'Stuffed Grape Leaves' THEN ARRAY[true,true,false,true,true,true,true,true,false]
      END
    ) AS d(restriction, is_compliant)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed data created: test@mealme.app → Personal org → The Test Family → preferences, meal plan, shopping list, sample invites';
    RAISE NOTICE 'Sample recipes: 55 recipes with nutrition, ingredients, tags, dietary info, and steps seeded across 13 cuisines';
  END;
