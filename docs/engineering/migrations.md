# Database migration conventions

Our Supabase migrations are version-controlled under `supabase/migrations`. Follow these practices when adding new migrations so that they remain deterministic and safe to re-run.

## File naming

- Name files with the pattern `YYYYMMDD_snake_case.sql`.
  - Use a zero-padded calendar date.
  - Keep the description lowercase, using numbers and underscores only.
  - Example: `20250318_add_profile_indexes.sql`.

The migration linter will reject files that do not comply with this naming scheme.

## Required `IF NOT EXISTS`

- Every `CREATE TABLE` statement must include `IF NOT EXISTS`.
- Every `CREATE INDEX` or `CREATE UNIQUE INDEX` statement must include `IF NOT EXISTS`.
- For conditional operations inside `DO $$ ... $$` blocks, wrap the statement in an `IF` guard or include the `IF NOT EXISTS` clause within the dynamic SQL string.

This keeps migrations idempotent when they are replayed in local environments and in CI.

## Local workflow

1. Run `npm run lint:migrations` (or `pnpm lint:migrations`) before committing migration changes.
2. Apply migrations locally with `supabase db push` once the lint check passes.
3. Keep migration files focused on a single logical change so they remain readable during reviews.

The CI pipeline runs the migration linter before migrations are applied to guard against accidental violations.
