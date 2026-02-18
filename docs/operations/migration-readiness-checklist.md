# Migration Readiness Checklist (Production Window)

This checklist is the go/no-go guide for schema releases affecting payments, bookings, and documents.

## 1) Schema consistency checks

Run against staging after migrations and seed data:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/schema_consistency_checks.sql
```

Pass criteria:
- All required foreign keys exist for `profiles`, `units`, `leases`, `rent_payments`, `bookings`, and `documents`.
- Required unique constraints remain intact.
- Enum values cover expected role/status values.
- No orphaned records in critical relationship paths.

## 2) Staging migration dry-run with high-volume seeded data

1. Seed load profile in staging clone (or disposable DB):

```bash
supabase db reset
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/demo/seed.sql
```

2. Inflate volume for stress coverage (recommend >= 100k bookings, >= 250k payments, >= 100k documents).
3. Validate migration plan without committing:

```bash
supabase db push --dry-run
```

4. Apply migrations and immediately verify rollback path:

```bash
supabase db push
supabase migration list
```

5. Roll back on disposable environment by restoring the pre-migration snapshot (or DB backup) and replay smoke checks.

Rollback evidence required:
- Snapshot restore start/end timestamps.
- Row counts for `rent_payments`, `bookings`, `documents` before and after restore.
- Re-run of schema and reconciliation checks post-restore.

## 3) Provider reconciliation validation

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/provider_reconciliation_checks.sql
```

Pass criteria:
- `rent_payments` status transitions align with `paid_at` values.
- Stripe payment intents are traceable to processed webhook events.
- Cal.com-backed bookings do not contain invalid active ranges.
- Documenso-backed documents are not in contradictory terminal states.

## 4) Automated integrity checks

Migration `202602190001_integrity_monitoring.sql` installs:
- `public.data_integrity_findings`
- `public.capture_integrity_findings()`
- Optional `pg_cron` schedule (`capture-integrity-findings`, every 30 minutes)

Manual execution:

```bash
./scripts/migration-readiness.sh
```

Operational pass criteria:
- No `critical` unresolved findings.
- Any `warning` findings have owner + ETA.

## 5) Production deployment window checklist

### T-24h
- [ ] Confirm staging dry-run evidence archived.
- [ ] Confirm backup/snapshot policy for production is healthy and restorable.
- [ ] Verify Stripe, Cal.com, and Documenso credentials for production.

### T-60m
- [ ] Freeze non-essential writes (if required by release).
- [ ] Capture baseline counts for `rent_payments`, `bookings`, `documents`.
- [ ] Announce migration window to on-call + property management stakeholders.

### T0 (deployment)
- [ ] Run `supabase db push` for approved migrations.
- [ ] Execute schema consistency checks.
- [ ] Execute reconciliation checks.
- [ ] Execute integrity capture function and confirm no critical findings.

### T+30m
- [ ] Validate webhook ingestion latency and failure rate.
- [ ] Check newly inserted rows for `rent_payments`, `bookings`, `documents`.
- [ ] Confirm no spike in booking conflicts or payment mismatches.

### Rollback trigger conditions
- [ ] Any check script fails and cannot be remediated within maintenance window.
- [ ] Critical payment webhook gaps continue increasing for >15 minutes.
- [ ] Duplicate-booking findings show active customer impact.

### Rollback execution
- [ ] Restore pre-deployment snapshot.
- [ ] Re-run smoke checks and integrity scripts.
- [ ] Publish incident summary and remediation follow-up.
