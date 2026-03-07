# Environment Variable Contract

This document defines the environment variables required to run **Share House Portal** across `development`, `staging`, and `production`.

## Principles
- Use environment-specific credentials for every integration.
- Do not share `production` secrets with non-production environments.
- Rotate webhook secrets and API keys on a regular schedule.
- Configure all values in Vercel project settings and local `.env.*` files (never commit secrets).
- Supabase public environment variables are runtime-validated; app startup and Supabase client initialization fail fast when missing.

## Environment Matrix

| Variable | Development | Staging | Production | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Required | Required | Required | Base URL for links and redirects (`http://localhost:3000` locally). |
| `NEXT_PUBLIC_SITE_URL` | Required | Required | Required | Site URL for auth callbacks and OAuth flows. |
| `NEXT_PUBLIC_BASE_URL` | Required | Required | Required | API auth callback base URL. |
| `VERCEL_URL` | Optional | Optional | Optional | Set automatically in Vercel previews/builds. |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Required | Required | Supabase project URL for public and server clients. Missing values trigger runtime configuration errors when Supabase clients initialize. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Required | Required | Public Supabase anon key. Can be replaced by `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; if neither is set, initialization throws a configuration error. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | Required | Required | Server-only key for privileged jobs/webhooks. |
| `SUPABASE_JWT_SECRET` | Required | Required | Required | JWT signing secret for local validation tools/workflows. |
| `STRIPE_SECRET_KEY` | Required | Required | Required | Stripe API secret key (`sk_test_*` in non-prod, `sk_live_*` in prod). |
| `STRIPE_WEBHOOK_SECRET` | Required | Required | Required | Secret for `/api/stripe/webhook` signature verification. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Required | Required | Required | Client-side Stripe publishable key. |
| `CALCOM_BASE_URL` | Optional* | Required | Required | Base URL for Cal.com instance. |
| `CALCOM_API_KEY` | Optional* | Required | Required | API key for creating/syncing amenity bookings. |
| `DOCUMENSO_BASE_URL` | Optional* | Required | Required | Base URL for Documenso instance/API. |
| `DOCUMENSO_API_KEY` | Optional* | Required | Required | API token for document workflows. |
| `GOOGLE_CLIENT_ID` | Optional | Optional | Optional | Required only if Google OAuth/calendar sync is enabled. |
| `GOOGLE_CLIENT_SECRET` | Optional | Optional | Optional | Required only if Google OAuth/calendar sync is enabled. |
| `GOOGLE_REDIRECT_URI` | Optional | Optional | Optional | OAuth callback URL. |
| `GOOGLE_OWNER_REFRESH_TOKEN` | Optional | Optional | Optional | Calendar integration token for owner calendar automation. |
| `GOOGLE_OWNER_CALENDAR_ID` | Optional | Optional | Optional | Target Google calendar id for booking sync. |
| `SUPABASE_WORKOS_CONNECTION_ID` | Optional | Optional | Optional | Needed only if WorkOS-backed auth is enabled. |
| `RESEND_API_KEY` | Optional | Optional | Optional | For email notifications/receipt delivery. |
| `RESEND_RECEIPTS_FROM` | Optional | Optional | Optional | Sender identity for receipt emails. |
| `ENCRYPTION_KEY` | Optional | Optional | Optional | Encryption support for sensitive local payloads. |

`Optional*` means local development can run without the integration if related features are not exercised.


## Supabase Public Variable Enforcement

The following variables are strictly required before any server or browser Supabase client can initialize:
- `NEXT_PUBLIC_SUPABASE_URL`
- One of `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Expected behavior:
- `hasSupabasePublicEnv()` may still be used for conditional UI states before initialization attempts.
- Calls to Supabase env resolvers throw explicit configuration errors when required values are missing.
- There are no fallback placeholder values for Supabase URL or public key resolution.

## Dashboard Data Source Modes (Local Development)

The dashboard supports two local development modes:

1. **DB mode (default when env present)**
   - Default behavior when Supabase public env vars are present.
   - Required env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - one of `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - With these values set, dashboard loaders resolve to production-backed data automatically.

2. **Mock mode (explicit opt-in)**
   - Enable only by setting `DASHBOARD_DATA_SOURCE=mock`.
   - Intended for UI iteration when DB-backed data is unavailable.
   - App startup emits a warning log when mock mode is active to prevent accidental long-term use.

## Webhook Secret Contract

| Service | Variable | Endpoint | Rotation Guidance |
| --- | --- | --- | --- |
| Stripe | `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` | Rotate immediately if leaked; coordinate with Stripe Dashboard endpoint signing secret update. |

## Environment Files

Use these files locally and in CI (with GitHub/Vercel secrets):
- `.env.local` for developer machine overrides.
- `.env.development` for shared development defaults (non-secret only).
- `.env.staging` for staging deployment settings.
- `.env.production` for production deployment settings.

For CI, inject secrets via GitHub Actions `secrets` rather than committing env files.
