#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: Supabase CLI is required. Install it from https://supabase.com/docs/guides/cli." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required to apply seed data and run sanity checks." >&2
  exit 1
fi

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SEED_FILE="supabase/demo/seed.sql"

if [[ ! -f "$SEED_FILE" ]]; then
  echo "Error: expected seed file at $SEED_FILE" >&2
  exit 1
fi

echo "[1/3] Applying latest Supabase migrations with 'supabase db push'"
supabase db push

echo "[2/3] Applying demo seed data from $SEED_FILE"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE"

echo "[3/3] Sanity-check row counts"
for table in profiles units rent_payments bookings; do
  count="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -Atqc "SELECT COUNT(*) FROM public.${table};")"
  printf "  - %-14s %s\n" "$table:" "$count"
done

printf "\nDatabase bootstrap complete.\n"
