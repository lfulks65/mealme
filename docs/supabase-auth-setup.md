# Supabase Auth Setup Guide — MealMe

This guide walks you through configuring authentication for the MealMe
monorepo, covering email/password, Google OAuth, Apple OAuth, redirect
URLs, local development, and environment variables.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Email / Password Auth](#email--password-auth)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Apple OAuth Setup](#apple-oauth-setup)
5. [Redirect URL Configuration](#redirect-url-configuration)
6. [Local Development](#local-development)
7. [Environment Variables Reference](#environment-variables-reference)

---

## Prerequisites

| Requirement            | Install / Verify                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Supabase CLI**       | `brew install supabase/tap/supabase` (macOS) or see [docs](https://supabase.com/docs/guides/cli)             |
| **A Supabase project** | Create at [supabase.com/dashboard](https://supabase.com/dashboard) or via `supabase init` + `supabase start` |
| **Node.js ≥ 18**       | `node -v`                                                                                                    |
| **pnpm**               | `corepack enable && corepack prepare pnpm@latest --activate`                                                 |

After creating a project, note your **Project Ref** (found in
Dashboard → Settings → General). It is used in redirect URIs and API
URLs.

---

## Email / Password Auth

### Enable in the Dashboard

1. Go to **Authentication → Providers → Email**.
2. Toggle **Enable Email Provider** on.
3. Configure the following options:

| Setting               | Recommended Value              | Notes                                           |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| Enable Sign Ups       | ✅                             | Allows new registrations                        |
| Confirm Email         | ✅                             | Users must verify their email before signing in |
| Secure Email Change   | ✅                             | Requires confirmation when changing email       |
| Min Password Length   | 8                              | Enforced on the Supabase side                   |
| Password Requirements | upper + lower + digit + symbol | Recommended for production                      |

### Email Templates

Custom branded email templates are stored in
`supabase/templates/`. The `config.toml` references these for
confirm signup, invite, and password reset flows. When running locally
with `supabase start`, the CLI serves the templates automatically.

### Testing Email Auth Locally

With `supabase start` running, inbucket is available at
`http://localhost:54324`. Any confirmation emails sent during local
development appear there — no real email delivery needed.

---

## Google OAuth Setup

### 1. Create a Google Cloud Project & OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Credentials**.
4. Click **Create Credentials → OAuth 2.0 Client ID**.
5. Set the application type to **Web application**.
6. Under **Authorized redirect URIs**, add:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   Replace `<project-ref>` with your Supabase project ref.

7. Note the **Client ID** and **Client Secret**.

### 2. Configure in Supabase Dashboard

1. Go to **Authentication → Providers → Google**.
2. Toggle **Enable Google Provider**.
3. Paste the **Client ID** and **Client Secret** from step 1.
4. Click **Save**.

### 3. Set Environment Variables

In your `.env.local` (root) and `supabase/.env.local`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

The `supabase/config.toml` reads these via `env(GOOGLE_CLIENT_ID)` and
`env(GOOGLE_CLIENT_SECRET)`.

---

## Apple OAuth Setup

### 1. Create an Apple App ID & Services ID

1. Go to [Apple Developer](https://developer.apple.com/).
2. Under **Certificates, Identifiers & Profiles**:
   - Create an **App ID** (e.g. `com.mealme.app`).
   - Create a **Services ID** — this is the OAuth client ID.
3. Configure the Services ID:
   - Enable **Sign In with Apple**.
   - Add the following **Redirect URL**:

     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```

4. Create a **Sign In with Apple Key** (`.p8` file) for the client
   secret. Note the **Key ID** and your **Team ID**.

### 2. Generate the Client Secret

Apple requires a JWT-based client secret. You can generate one with:

```bash
node -e "
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({}, process.env.APPLE_PRIVATE_KEY, {
    algorithm: 'ES256',
    expiresIn: '180d',
    issuer: process.env.APPLE_TEAM_ID,
    subject: process.env.APPLE_CLIENT_ID,
    keyid: process.env.APPLE_KEY_ID,
  });
  console.log(token);
"
```

Or let Supabase handle it by providing the Team ID, Key ID, and
private key in the dashboard.

### 3. Configure in Supabase Dashboard

1. Go to **Authentication → Providers → Apple**.
2. Toggle **Enable Apple Provider**.
3. Enter the **Client ID** (Services ID), **Team ID**, **Key ID**, and
   paste the **Private Key** (`.p8` contents).
4. Click **Save**.

### 4. Set Environment Variables

In your `.env.local` (root) and `supabase/.env.local`:

```bash
APPLE_CLIENT_ID=your-apple-services-id
APPLE_CLIENT_SECRET=your-generated-client-secret
```

The `supabase/config.toml` reads these via `env(APPLE_CLIENT_ID)` and
`env(APPLE_CLIENT_SECRET)`.

---

## Redirect URL Configuration

Redirect URLs tell Supabase where to send users after they complete an
OAuth flow. **Every redirect URL used in the app must be registered in
the Supabase dashboard**, or the auth callback will be rejected.

### URLs to Register

| Platform       | Environment | Redirect URL                          |
| -------------- | ----------- | ------------------------------------- |
| Expo (dev)     | Development | `mealme://auth/callback`              |
| Expo (prod)    | Production  | `com.mealme.app://auth/callback`      |
| Next.js (dev)  | Development | `http://localhost:3000/auth/callback` |
| Next.js (prod) | Production  | `https://mealme.app/auth/callback`    |

### How to Add Redirect URLs

1. Go to **Authentication → URL Configuration** in the Supabase
   dashboard.
2. Under **Redirect URLs**, add each URL from the table above.
3. Click **Save**.

### Local Development (config.toml)

The `supabase/config.toml` already includes these redirect URLs in the
`additional_redirect_urls` list:

```toml
[auth]
additional_redirect_urls = [
  "http://localhost:3000/auth/callback",
  "mealme://auth/callback",
  "com.mealme.app://auth/callback",
  "https://mealme.app/auth/callback",
]
```

When running `supabase start` locally, these are applied automatically.
For the hosted project, you must add them in the dashboard.

### How the App Selects the Redirect URL

The `getRedirectUrl()` function in
`packages/api/src/auth/functions.ts` automatically picks the correct
URL based on the runtime:

- **Next.js (browser)**: `window.location.origin + '/auth/callback'`
- **Expo (native)**: `EXPO_PUBLIC_SUPABASE_REDIRECT_URL` env var, or
  defaults to `mealme://auth/callback`

---

## Local Development

### Start the Local Supabase Stack

```bash
# From the repo root
supabase start
```

This starts all Supabase services (Postgres, Auth, Storage, Realtime,
etc.) using Docker. The first run may take a few minutes.

### Apply Migrations

```bash
# Apply all pending migrations to the local database
supabase db reset   # resets the DB and re-applies all migrations
# — or —
supabase migration up  # applies only new migrations
```

### Link to a Remote Project (Optional)

To push local schema changes to a hosted project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Test Auth Flows Locally

| Flow               | How to Test                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Email signup**   | Use the app's signup form; check Inbucket at `http://localhost:54324` for the confirmation email                        |
| **Email login**    | After confirming via Inbucket, sign in with credentials                                                                 |
| **Google OAuth**   | Requires a publicly accessible callback URL — use `supabase login` + a hosted project, or tunnel with `ngrok http 3000` |
| **Apple OAuth**    | Same as Google — requires a public callback URL                                                                         |
| **Password reset** | Trigger from the app; check Inbucket for the reset email                                                                |

### Useful Local Endpoints

| Service           | URL                      |
| ----------------- | ------------------------ |
| API (PostgREST)   | `http://localhost:54321` |
| Studio            | `http://localhost:54323` |
| Inbucket (emails) | `http://localhost:54324` |
| Auth              | `http://localhost:9999`  |

---

## Environment Variables Reference

All auth-related environment variables used across the MealMe monorepo.

### Root `.env.local`

| Variable                    | Required  | Description                                       |
| --------------------------- | --------- | ------------------------------------------------- |
| `SUPABASE_URL`              | ✅        | Supabase project URL (used server-side)           |
| `SUPABASE_ANON_KEY`         | ✅        | Public anon key (used server-side)                |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️        | Service role key — **never expose to the client** |
| `GOOGLE_CLIENT_ID`          | For OAuth | Google OAuth 2.0 client ID                        |
| `GOOGLE_CLIENT_SECRET`      | For OAuth | Google OAuth 2.0 client secret                    |
| `APPLE_CLIENT_ID`           | For OAuth | Apple Services ID (OAuth client ID)               |
| `APPLE_CLIENT_SECRET`       | For OAuth | Apple-generated JWT client secret                 |

### Expo (React Native) — `EXPO_PUBLIC_*` prefix

These are bundled into the Expo client at build time and must use the
`EXPO_PUBLIC_` prefix so Metro can inline them.

| Variable                            | Required | Description                                                                                                                  |
| ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`          | ✅       | Same as `SUPABASE_URL` (for Expo)                                                                                            |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`     | ✅       | Same as `SUPABASE_ANON_KEY` (for Expo)                                                                                       |
| `EXPO_PUBLIC_SUPABASE_REDIRECT_URL` | ⬜       | Override the default redirect URL (`mealme://auth/callback`). Set to `com.mealme.app://auth/callback` for production builds. |

### Next.js — `NEXT_PUBLIC_*` prefix

These are inlined by Next.js at build time.

| Variable                        | Required | Description                               |
| ------------------------------- | -------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | Same as `SUPABASE_URL` (for Next.js)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Same as `SUPABASE_ANON_KEY` (for Next.js) |

### Supabase CLI — `supabase/.env.local`

Read by `supabase/config.toml` via `env()` references. Only needed for
local development with OAuth providers.

| Variable               | Required  | Description               |
| ---------------------- | --------- | ------------------------- |
| `GOOGLE_CLIENT_ID`     | For OAuth | Same Google client ID     |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Same Google client secret |
| `APPLE_CLIENT_ID`      | For OAuth | Same Apple client ID      |
| `APPLE_CLIENT_SECRET`  | For OAuth | Same Apple client secret  |

### Quick Start

```bash
# 1. Copy the example files
cp .env.example .env.local
cp supabase/.env.example supabase/.env.local

# 2. Fill in your values
#    - SUPABASE_URL, SUPABASE_ANON_KEY from the Supabase dashboard
#    - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (if using Google OAuth)
#    - APPLE_CLIENT_ID / APPLE_CLIENT_SECRET (if using Apple OAuth)

# 3. Start local Supabase
supabase start

# 4. Start the app
pnpm --filter @mealme/web dev      # Next.js
pnpm --filter @mealme/expo start   # Expo
```

---

## Architecture Overview

```
┌─────────────┐         ┌──────────────────────┐         ┌─────────────┐
│  Expo App   │────────▶│                      │────────▶│  mealme://  │
│  (native)   │  OAuth  │  Supabase Auth       │  Redirect│  auth/      │
└─────────────┘         │                      │         │  callback   │
                        │  - Email/Password     │         └─────────────┘
┌─────────────┐         │  - Google OAuth       │
│  Next.js    │────────▶│  - Apple OAuth        │────────▶┌─────────────────────┐
│  (web)      │  OAuth  │                      │  Redirect│  https://mealme.app │
└─────────────┘         └──────────────────────┘         │  /auth/callback      │
                                                          └─────────────────────┘
```

The `signInWithProvider()` function in
`packages/api/src/auth/functions.ts` initiates the OAuth flow with the
correct `redirectTo` URL. After the user authenticates with the
provider, Supabase redirects them back to the app:

- **Next.js**: The `apps/web/app/auth/callback/route.ts` handler
  exchanges the auth code for a session and sets cookies.
- **Expo**: The `apps/expo/app/auth/callback.tsx` screen extracts the
  access token and refresh token from the redirect URL and sets the
  Supabase session.
