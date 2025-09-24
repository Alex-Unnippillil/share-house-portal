#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run the Supabase CLI" >&2
  exit 1
fi

: "${STAGING_GREEN_DATABASE_URL:?Set STAGING_GREEN_DATABASE_URL to the Postgres connection string for the staging green replica.}"

export SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-}

echo "Running Supabase lint against staging green replica..." >&2
npx --yes supabase db lint --db-url "${STAGING_GREEN_DATABASE_URL}" --fail-on error --level warning

echo "Dry-running Supabase migrations against staging green replica..." >&2
npx --yes supabase db push --db-url "${STAGING_GREEN_DATABASE_URL}" --dry-run

echo "Applying Supabase migrations to staging green replica..." >&2
npx --yes supabase db push --db-url "${STAGING_GREEN_DATABASE_URL}" --include-all

echo "Re-running lint to ensure schema compatibility after migrations..." >&2
npx --yes supabase db lint --db-url "${STAGING_GREEN_DATABASE_URL}" --fail-on warning --level warning
