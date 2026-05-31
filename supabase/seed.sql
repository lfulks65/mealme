-- ============================================================================
-- MealMe: Local Development Seed Data
-- ============================================================================
-- This file is executed by `supabase db reset` to populate the local
-- development database with test data. It should NEVER be run in
-- production.
--
-- ⚠️  DO NOT use these credentials in any environment other than local dev.
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
-- We capture the user ID to create the personal organization.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_user_id UUID;
  v_org_id  UUID;
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

  INSERT INTO public.organization_members (user_id, org_id, role)
  VALUES (v_user_id, v_org_id, 'owner')
  ON CONFLICT (user_id, org_id) DO NOTHING;

  -- Set the personal org as the default org for the test user
  UPDATE public.profiles
  SET default_org_id = v_org_id
  WHERE id = v_user_id
    AND default_org_id IS NULL;

  RAISE NOTICE 'Seed data created: test@mealme.app with Personal org';
END;
$$;
