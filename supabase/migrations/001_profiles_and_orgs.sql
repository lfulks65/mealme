-- ============================================================================
-- MealMe: Profiles, Organizations & RLS
-- ============================================================================
-- This migration creates:
--   1. `organizations` table
--   2. `org_memberships` join table (user ↔ org)
--   3. `profiles` table (1:1 with auth.users)
--   4. Trigger: auto-insert profile on auth.user creation
--   5. RLS policies for profiles (read same-org, update own)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Organizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Org Memberships (join table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON public.org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id  ON public.org_memberships(org_id);

-- ---------------------------------------------------------------------------
-- 3. Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT,
  avatar_url       TEXT,
  default_org_id   UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Trigger: auto-insert profile on auth.users creation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. RLS Policies
-- ---------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

-- --- Profiles RLS ---

-- Users can read profiles of members in their own org(s)
CREATE POLICY "profiles_read_same_org"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om_self
      JOIN public.org_memberships om_other
        ON om_self.org_id = om_other.org_id
      WHERE om_self.user_id = auth.uid()
        AND om_other.user_id = profiles.id
    )
  );

-- Users can always read their own profile
CREATE POLICY "profiles_read_own"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile only
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile (for manual creation if trigger fails)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- --- Organizations RLS ---

-- Users can read orgs they belong to
CREATE POLICY "organizations_read_member"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE org_memberships.org_id = organizations.id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- --- Org Memberships RLS ---

-- Users can read memberships for orgs they belong to
CREATE POLICY "org_memberships_read_member"
  ON public.org_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = org_memberships.org_id
        AND om.user_id = auth.uid()
    )
  );
