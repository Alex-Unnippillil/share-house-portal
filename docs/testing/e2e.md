# End-to-End Smoke Tests

This project exercises critical tenant journeys with [Playwright](https://playwright.dev/).
The suite is designed to validate the onboarding, payments, bookings, documents, and messaging
surfaces against a live Roomsily deployment.

## Running the suite locally

1. Ensure the target app and Supabase project are available. When testing against a deployed
   preview, export the preview URL and Supabase credentials; for local runs start `npm run dev`.
2. Install dependencies and Playwright browsers if you have not already:

   ```bash
   npm install
   npx playwright install --with-deps
   ```

3. Provide the required environment variables (see below) and run the smoke suite:

   ```bash
   PLAYWRIGHT_BASE_URL="https://preview.roomsily.app" \
   PLAYWRIGHT_SUPABASE_URL="https://<project>.supabase.co" \
   PLAYWRIGHT_SUPABASE_ANON_KEY="anon-key" \
   PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY="service-role-key" \
   PLAYWRIGHT_SEEDED_EMAIL="tenant.e2e@roomsily.dev" \
   PLAYWRIGHT_SEEDED_PASSWORD="Roomsily!123" \
   npm run test:e2e
   ```

The Playwright configuration lives in `tests/e2e/playwright.config.ts`. Base URLs and Supabase
credentials default to the seeded demo values when no overrides are supplied.

## Supabase fixture maintenance

`tests/e2e/global-setup.ts` seeds Supabase via the service-role key before each run. The script:

- Ensures the smoke-test tenant user exists (defaults: `tenant.e2e@roomsily.dev` / `Roomsily!123`).
- Upserts the matching `profiles` row with role `tenant` and unit `unit-e2e-1`.
- Inserts deterministic records for rent payments, an active lease, and two documents
  (`E2E Lease Agreement` pending signature and `E2E House Rules` already signed).
- Creates a pending `document_signatures` entry so the UI renders “Sign Document”.

When Supabase schemas change, update these fixtures to keep the smoke suite green:

1. Adjust any new required columns within the upsert payloads—keep IDs stable so stats remain
   deterministic.
2. If new relations are introduced, seed companion rows (e.g., a new `units` table) inside the
   same script using the shared `SEED_TAG` metadata for discoverability.
3. Use `npm run test:e2e -- --debug` to iterate on fixture changes; the setup runs once per suite.

All seeded records include `metadata.seed = "playwright-smoke"` to make cleanup or manual
inspection simple within the Supabase dashboard.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PLAYWRIGHT_BASE_URL` | Base URL for the app under test (preview deployment or local dev). |
| `PLAYWRIGHT_SUPABASE_URL` | Supabase project URL used for seeding and browser auth. |
| `PLAYWRIGHT_SUPABASE_ANON_KEY` | Anon key required by the client during tests. |
| `PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY` | Service role key used in `global-setup` to provision fixtures. |
| `PLAYWRIGHT_SEEDED_EMAIL` / `PLAYWRIGHT_SEEDED_PASSWORD` | Credentials for the seeded tenant user. |
| `PLAYWRIGHT_SEEDED_NAME`, `PLAYWRIGHT_SEEDED_UNIT_ID`, `PLAYWRIGHT_SEEDED_DOCUMENT_TITLE`, `PLAYWRIGHT_SEEDED_SIGNED_DOCUMENT_TITLE` | Optional overrides for seeded profile metadata and document titles. |

## Retries, traces, and videos

- CI retries are configured in `tests/e2e/playwright.config.ts` (`retries: 2` on CI, none locally).
  Increase cautiously only after reviewing flaky behaviour and ensuring fixtures are deterministic.
- The config retains traces, screenshots, and videos for failed tests (`retain-on-failure`).
  Artifacts are written to `tests/e2e/test-results` and `tests/e2e/playwright-report`.
- `.github/workflows/playwright.yml` runs on successful Vercel preview deployments and uploads the
  Playwright artifacts via `actions/upload-artifact`. Inspect these when debugging failures.

## Troubleshooting

- If onboarding fails locally, confirm Supabase env vars match your seeded tenant and that the
  `global-setup` script is using the same service-role key as your preview deployment.
- To wipe smoke data manually, delete rows tagged with `metadata->>seed = 'playwright-smoke'` in
  Supabase and rerun the suite to repopulate fixtures.
