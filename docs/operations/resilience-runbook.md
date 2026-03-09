# Resilience Validation Runbook

## 1) Webhook retries and dead-letter handling

- Stripe webhook processing retries transient failures with exponential backoff (3 retries).
- Events that still fail are marked `dead_lettered` in `webhook_events` with retry metadata.
- Operators replay dead-lettered events after remediation from Stripe dashboard or internal replay tooling.

## 2) Third-party outage graceful degradation

When providers are unavailable:

- **Stripe**: checkout APIs return a user-safe outage message and avoid exposing raw provider errors.
- **Cal.com**: amenity booking requests surface a degraded-state message and avoid false confirmations.
- **Documenso**: lease-signing initiation returns a degraded-state message so users can retry safely.

## 3) Supabase backup/restore and rollback validation

### Backup validation (staging, weekly)

1. Create backup snapshot: `supabase db dump --linked --schema public --file backup.sql`.
2. Validate snapshot checksum and retention policy in object storage.
3. Record snapshot ID and timestamp in ops change log.

### Restore drill (staging, monthly)

1. Provision isolated restore database.
2. Restore snapshot: `psql "$RESTORE_DB_URL" -f backup.sql`.
3. Run smoke checks for auth, payments, bookings, and documents flows.
4. Compare row counts for critical tables (`profiles`, `rent_payments`, `bookings`, `documents`, `webhook_events`).

### Migration rollback validation

1. Apply latest migrations in staging: `supabase db push`.
2. If a regression appears, execute targeted rollback SQL migration and redeploy last known good app release.
3. Re-run test suite and readiness checks before traffic restore.

## 4) Health/readiness checks

- Liveness: `GET /api/health`.
- Core readiness: `GET /api/readiness` (app process + Supabase DB connectivity). This endpoint determines service readiness and should page primary on-call when degraded/down.
- Extended readiness: `GET /api/readiness?full=1` (adds Stripe, Cal.com, Documenso optional probes). Use for diagnostics and integration-specific paging.
- Operations dashboard includes dependency health indicators for Supabase, Stripe, Cal.com, Documenso.

### Alert handling policy

- **Core check failure (`/api/readiness`)**
  - Severity: P1 by default.
  - Immediate actions: halt risky deploys, run Supabase connectivity triage, validate app error rates and auth flows.
- **Optional check failure (`/api/readiness?full=1`)**
  - Severity: P2 by default.
  - Immediate actions: engage provider-specific playbook (payment outage, booking sync drift, document signing delays) while keeping core platform online.
  - Promotion to P1: if optional degradation causes sustained tenant-facing failures in critical funnels.

## 5) Incident playbooks and testing cadence

### Payment failures
- Trigger: sustained `payment_failures_total` increase.
- Actions: verify Stripe status, inspect dead-lettered webhooks, replay after fix, notify affected tenants.

### Booking sync drift
- Trigger: mismatch between Cal.com bookings and Supabase booking rows.
- Actions: pause sync workers, run reconciliation query, replay missing webhook payloads, backfill corrected slots.

### Auth outages
- Trigger: elevated auth callback failures or widespread 401 spikes.
- Actions: verify Supabase auth status, rotate keys/cookies if needed, enforce temporary read-only mode for privileged flows.

## Validation evidence template

Document each drill with:

- Date/time and owner.
- Scope and affected environment.
- Commands run and outputs.
- Recovery time achieved versus objective.
- Follow-up actions with owners and due dates.
