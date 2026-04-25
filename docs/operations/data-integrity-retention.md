# Data Integrity Checks & Retention Jobs

## Scheduled jobs

Two authenticated cron endpoints are available:

- `GET /api/ops/data-integrity`
- `GET /api/ops/retention`

Both require `Authorization: Bearer ${CRON_SECRET}`.

## Integrity checks (`/api/ops/data-integrity`)

Current checks:

- Visitor logs with invalid arrival/departure windows.
- Rent payment rows missing both tenant and unit linkage.

Behavior:

- Emits `data_integrity_job_completed` structured log.
- Marks `hasIssue=true` when anomalies are detected.
- Emits an operational anomaly metric for alerting.

## Retention execution (`/api/ops/retention`)

Current retention windows:

- `visitor_logs`: anonymize PII after 180 days from `check_out_date`; purge entries after 365 days.
- `documents` (`status='signed'`): minimize searchable metadata after 365 days while retaining immutable audit evidence.
- `notifications`: delete entries older than 90 days from `created_at`.

Behavior:

- Emits `retention_job_completed` structured log.
- Supports `dryRun=true` for preflight analysis.
- Writes per-entity execution records to append-only `retention_execution_audit_logs` including `actor_id` and `job_id`.
- Returns per-entity mutation/error details for debugging.

Runbook:

- See `docs/operations/runbooks/retention-scheduler.md` for Vercel Cron and incident fallback procedures.

## Operational cadence

- Integrity checks: every 6 hours.
- Retention cleanup: daily at 03:00 UTC.
- Review policy windows quarterly with Legal and Security.
