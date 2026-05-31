-- ============================================================================
-- MealMe: Auth Settings — Audit Logging, Trigger Improvements, Session Helpers
-- ============================================================================
-- This migration adds:
--   1. Password policy documentation (application-layer enforcement)
--   2. Improved `handle_new_user()` trigger with OAuth provider support
--   3. `handle_user_delete()` trigger for cleanup on user deletion
--   4. `auth_audit_log` table with RLS for auth event tracking
--   5. `get_user_session_info()` helper for session hydration
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Password Requirements (Documentation)
-- ---------------------------------------------------------------------------
-- Password policy is enforced at the application layer via Supabase Auth
-- configuration (config.toml) and client-side validation. This comment
-- documents the expected policy for reference.
--
-- Policy:
--   - Minimum 8 characters
--   - At least one uppercase letter
--   - At least one lowercase letter
--   - At least one digit
--   - At least one special character
--   - Cannot be a commonly used password
--
-- Enforced via:
--   - Supabase Auth config (config.toml [auth.email])
--   - Client-side validation before signup
--   - Application-layer checks in auth callbacks
-- ---------------------------------------------------------------------------

COMMENT ON SCHEMA public IS 'MealMe public schema. Password policy: min 8 chars, upper+lower+digit+special, enforced at app layer.';

-- ---------------------------------------------------------------------------
-- 2. Improved `handle_new_user()` trigger — OAuth provider support
-- ---------------------------------------------------------------------------
-- The original trigger (migration 001) only reads from raw_user_meta_data.
-- This version extends it to also handle OAuth provider signups where
-- avatar and name come from raw_app_meta_data or provider-specific
-- metadata in raw_user_meta_data.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_provider TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Determine the auth provider
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- Extract display name: prefer user_meta_data, fall back to OAuth claims
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'nickname',
    CASE
      WHEN v_provider IN ('google', 'apple') THEN
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
      ELSE ''
    END
  );

  -- Extract avatar URL: prefer user_meta_data, fall back to OAuth picture
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'profile_image',
    CASE
      WHEN v_provider = 'google' THEN
        NEW.raw_user_meta_data->>'picture'
      WHEN v_provider = 'apple' THEN
        NEW.raw_user_meta_data->>'picture'
      ELSE NULL
    END
  );

  -- Upsert the profile (handles both initial creation and re-trigger scenarios)
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, v_full_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 3. `handle_user_delete()` trigger — cleanup on user deletion
-- ---------------------------------------------------------------------------
-- When a user is deleted from auth.users, this trigger cleans up
-- related data in the public schema. Most tables use ON DELETE CASCADE
-- on the FK to auth.users, but this trigger handles additional cleanup
-- such as logging the deletion event and any orphaned data.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the deletion to auth_audit_log (using OLD.id since user is being deleted)
  -- The FK to auth.users uses ON DELETE SET NULL, so the audit entry survives
  -- user deletion with user_id = NULL. This runs in BEFORE DELETE so the user
  -- row still exists when we insert the FK reference.
  INSERT INTO public.auth_audit_log (user_id, action, provider, ip_address, user_agent)
  VALUES (
    OLD.id,
    'account_deleted',
    COALESCE(OLD.raw_app_meta_data->>'provider', 'email'),
    NULL,
    NULL
  );

  -- Explicitly clean up org_memberships (even though FK has ON DELETE CASCADE,
  -- this ensures cleanup runs in the correct order with the audit log)
  DELETE FROM public.org_memberships WHERE user_id = OLD.id;

  -- Clean up family_memberships
  DELETE FROM public.family_memberships WHERE user_id = OLD.id;

  -- Clean up profile (FK has ON DELETE CASCADE, but explicit for clarity)
  DELETE FROM public.profiles WHERE id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger on auth.users to include both functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add the delete trigger
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();

-- ---------------------------------------------------------------------------
-- 4. Auth Audit Log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN (
    'login', 'signup', 'logout', 'password_reset', 'oauth_login',
    'account_deleted'
  )),
  provider    TEXT NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google', 'apple')),
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id    ON public.auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action      ON public.auth_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at   ON public.auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_provider     ON public.auth_audit_log(provider);

-- Enable RLS
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit entries
CREATE POLICY "auth_audit_log_read_own"
  ON public.auth_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert audit entries (for triggers and edge functions)
-- Regular users should NOT be able to insert/update/delete audit entries
CREATE POLICY "auth_audit_log_insert_service"
  ON public.auth_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Prevent updates and deletes by regular users
CREATE POLICY "auth_audit_log_no_update"
  ON public.auth_audit_log
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "auth_audit_log_no_delete"
  ON public.auth_audit_log
  FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------------
-- 5. Trigger: Log signup events to auth_audit_log
-- ---------------------------------------------------------------------------
-- This trigger fires after a new user is created in auth.users and
-- logs the signup event. It runs AFTER the handle_new_user trigger
-- so the profile already exists.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_auth_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auth_audit_log (user_id, action, provider)
  VALUES (
    NEW.id,
    'signup',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_signup_logged ON auth.users;

CREATE TRIGGER on_auth_signup_logged
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_auth_signup();

-- ---------------------------------------------------------------------------
-- 6. Session Management Helper: get_user_session_info()
-- ---------------------------------------------------------------------------
-- Returns the current user's profile and org memberships in a single
-- call, useful for the app's session hydration on login.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_session_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile JSONB;
  v_orgs JSONB;
BEGIN
  -- Get the current user's profile
  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'default_org_id', p.default_org_id,
    'created_at', p.created_at
  )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Get the user's org memberships with org details
  SELECT jsonb_agg(
    jsonb_build_object(
      'org_id', om.org_id,
      'org_name', o.name,
      'org_slug', o.slug,
      'role', om.role,
      'is_default', (p.default_org_id = om.org_id)
    )
    ORDER BY
      CASE WHEN p.default_org_id = om.org_id THEN 0 ELSE 1 END,
      om.created_at
  )
  INTO v_orgs
  FROM public.org_memberships om
  JOIN public.organizations o ON o.id = om.org_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE om.user_id = auth.uid()
    AND o.deleted_at IS NULL;

  -- Build the response
  RETURN jsonb_build_object(
    'profile', v_profile,
    'organizations', COALESCE(v_orgs, '[]'::jsonb)
  );
END;
$$;
