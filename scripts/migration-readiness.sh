#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required" >&2
  exit 1
fi

echo "[1/4] Running schema consistency checks"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/schema_consistency_checks.sql

echo "[2/4] Running provider reconciliation checks"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/provider_reconciliation_checks.sql

echo "[3/4] Capturing automated integrity findings"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "SELECT * FROM public.capture_integrity_findings();"

echo "[4/4] Reviewing active findings"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "SELECT finding_type, severity, finding_key, detected_at FROM public.data_integrity_findings WHERE resolved_at IS NULL ORDER BY detected_at DESC LIMIT 50;"

printf '\nMigration readiness checks completed.\n'
