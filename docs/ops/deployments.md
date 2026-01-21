# Deployment Playbook

This playbook defines how we manage Supabase database replicas for the staging green environment, run automated migration pipelines, and execute controlled cutover tests before switching traffic.

## 1. Configure a Supabase replica for staging green

Staging uses a blue/green strategy so that we can validate migrations on an isolated Supabase branch before moving traffic.

1. Generate a Supabase personal access token with access to the staging project (`Project Settings → API → Access Tokens`).
2. Export the following environment variables:
   ```bash
   export SUPABASE_ACCESS_TOKEN="..."                 # PAT with branch management permissions
   export SUPABASE_STAGING_PROJECT_REF="abcdefgh"     # Supabase project ref for the staging environment
   export STAGING_GREEN_BRANCH="staging-green"        # Optional override
   export STAGING_GREEN_REGION="eu-central-1"         # Optional override, e.g. to co-locate with staging
   export STAGING_GREEN_SIZE="small"                  # Optional override if we need more CPU/RAM
   export STAGING_GREEN_PERSISTENT=true                # Keep the branch alive between deploys
   export STAGING_GREEN_CLONE_DATA=true                # Clone data from the staging primary branch
   ```
3. Create (or verify) the staging green replica:
   ```bash
   pnpm db:replica:staging-green
   ```
   The script wraps `supabase branches create` and is idempotent. If the branch exists nothing is changed. Record the generated database connection string and store it as `STAGING_GREEN_DATABASE_URL` in Vercel and GitHub Actions secrets.

## 2. Automated migration pipeline

All migrations are applied to the green replica before traffic is switched. The pipeline validates typing, dry-runs the changes, then applies them.

1. Ensure `STAGING_GREEN_DATABASE_URL` is percent-encoded and available to your shell (for local runs) or CI job:
   ```bash
   export STAGING_GREEN_DATABASE_URL="postgresql://user:%3Cpass%3E@db.supabase.co:6543/postgres"
   ```
2. Run the migration pipeline script:
   ```bash
   pnpm db:migrate:staging-green
   ```
   The script performs the following steps:
   - `supabase db lint` with `--fail-on error` to catch type and dependency issues.
   - `supabase db push --dry-run` to surface breaking changes without applying them.
   - `supabase db push --include-all` to apply pending migrations when the dry run succeeds.
   - A second `supabase db lint` with `--fail-on warning` to ensure the schema is clean post-migration.

Configure your CI/CD (e.g. GitHub Actions) to run this command after building the application but before publishing artifacts. Block deployment if any step fails.

## 3. Controlled cutover tests

Once migrations succeed, we verify both staging databases (blue and green) before pointing traffic to the green replica.

1. Export both database URLs:
   ```bash
   export STAGING_DATABASE_URL="postgresql://..."           # Current staging/blue URL
   export STAGING_GREEN_DATABASE_URL="postgresql://..."     # Replica created above
   ```
2. Execute the cutover smoke suite:
   ```bash
   pnpm db:cutover:staging-green
   ```
   This runs three checks:
   - Lints both databases with `supabase db lint --fail-on warning` to confirm schema health.
   - Performs a dry run of `supabase db push` against the green replica and fails if any migrations would be applied.
   - Generates a temporary schema diff. Any non-empty diff indicates drift and the script aborts.
3. When the smoke suite passes, run your application smoke tests against the green database URL (e.g. `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` overrides in Vercel preview deploys).
4. Update Vercel environment variables to point staging traffic to the green replica.
5. Monitor Supabase metrics and application logs. If regressions appear, revert the environment variables to the previous staging URL.

## 4. Ongoing maintenance

- Delete stale branches with `npx supabase branches delete <name> --project-ref $SUPABASE_STAGING_PROJECT_REF` once deployments stabilize.
- Schedule weekly refreshes by rerunning `pnpm db:replica:staging-green` with `STAGING_GREEN_CLONE_DATA=true` to ensure the replica includes the latest anonymised data snapshots.
- Keep the Supabase CLI pinned via `npx supabase@latest` invocations in CI so we always run with security patches.

Following this process ensures every staging cutover is validated on a fresh Supabase replica, preventing incompatible migrations from reaching production.
