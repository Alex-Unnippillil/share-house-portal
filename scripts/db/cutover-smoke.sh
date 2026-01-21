#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run the Supabase CLI" >&2
  exit 1
fi

: "${STAGING_DATABASE_URL:?Set STAGING_DATABASE_URL to the current staging (blue) Postgres connection string.}"
: "${STAGING_GREEN_DATABASE_URL:?Set STAGING_GREEN_DATABASE_URL to the green replica connection string.}"

TMP_DIFF=$(mktemp)
trap 'rm -f "${TMP_DIFF}"' EXIT

echo "Verifying both staging databases lint clean..." >&2
npx --yes supabase db lint --db-url "${STAGING_DATABASE_URL}" --fail-on warning --level warning
npx --yes supabase db lint --db-url "${STAGING_GREEN_DATABASE_URL}" --fail-on warning --level warning

echo "Ensuring the green replica has no pending migrations..." >&2
npx --yes supabase db push --db-url "${STAGING_GREEN_DATABASE_URL}" --dry-run >"${TMP_DIFF}" 2>&1 || {
  cat "${TMP_DIFF}" >&2
  echo "Dry run detected issues when applying migrations to staging green." >&2
  exit 1
}

if grep -q "would be applied" "${TMP_DIFF}"; then
  echo "Pending migrations were detected for staging green." >&2
  exit 1
fi

echo "Diffing migrations to confirm staging green is in sync with local state..." >&2
: >"${TMP_DIFF}"
npx --yes supabase db diff --db-url "${STAGING_GREEN_DATABASE_URL}" --file "${TMP_DIFF}" --use-migra >/dev/null 2>&1
if [[ -s "${TMP_DIFF}" ]]; then
  echo "Schema drift detected between local migrations and staging green." >&2
  cat "${TMP_DIFF}" >&2
  exit 1
fi

echo "Controlled cutover smoke checks succeeded. It is safe to proceed with traffic switching once application smoke tests pass." >&2
