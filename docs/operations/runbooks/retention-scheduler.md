# Retention Scheduler Runbook

## Purpose

This runbook describes how to execute and recover the retention job at `GET /api/ops/retention`, including daily Vercel cron execution and manual fallback procedures.

## Schedule and trigger

- **Primary scheduler**: Vercel Cron.
- **Configured schedule**: `0 3 * * *` (daily at **03:00 UTC**).
- **Configured path**: `/api/ops/retention`.
- **Authentication**: `Authorization: Bearer ${CRON_SECRET}`.

## Runtime options

The endpoint supports optional query parameters:

- `dryRun=true` — calculate candidate counts without mutating data.
- `jobId=<id>` — explicit job identifier for traceability.
- `actor=<actor-id>` — actor override recorded in append-only audit logs.

Examples:

```bash
curl -sS -X GET \
  "${NEXT_PUBLIC_APP_URL}/api/ops/retention?dryRun=true&jobId=retention-preflight-2026-04-25" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "x-request-id: retention-preflight-2026-04-25"
```

```bash
curl -sS -X GET \
  "${NEXT_PUBLIC_APP_URL}/api/ops/retention?jobId=retention-live-2026-04-25" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "x-retention-actor: system:incident-retention" \
  -H "x-request-id: retention-live-2026-04-25"
```

## Retention behavior

The job applies entity-specific rules:

1. `visitor_logs.anonymize`
   - anonymizes visitor PII for rows older than the anonymization window.
2. `visitor_logs.purge`
   - hard-deletes very old visitor rows after the purge window.
3. `documents.signed_metadata_minimize`
   - keeps signed document records while minimizing searchable PII fields.
4. `notifications.purge`
   - deletes stale notification rows.

Each entity execution is written to append-only table `retention_execution_audit_logs` with:

- `job_id`
- `actor_id`
- entity name, mode (`execute`/`dry-run`), candidates, affected counts
- optional error payload

## Manual incident fallback

Use this when Vercel Cron is unhealthy or delayed.

1. **Preflight dry-run**
   - Run with `dryRun=true` and a unique `jobId`.
   - Verify response has `ok: true` and plausible candidate counts.
2. **Execute live run**
   - Re-run without `dryRun` using a new `jobId`.
3. **Validate append-only audit rows**
   - Confirm exactly one log row per entity for the new `jobId`.
4. **Re-run safety check**
   - Trigger the same flow again to verify idempotency (`affected` should trend to `0`).

## Verification checklist

After each scheduled or manual run:

- Endpoint status code is `200`.
- JSON body includes `ok: true` and `results[]`.
- No unexpected per-entity `error` values.
- `retention_execution_audit_logs` has entries for the run's `jobId`.
- Observability search for `retention_job_completed` includes `jobId` and `actorId`.

## Escalation

If retention repeatedly fails:

1. Pause cron for `/api/ops/retention` in Vercel.
2. Open a production incident and post failing `jobId`s.
3. Run dry-run mode hourly until root cause is resolved.
4. Resume cron and execute one manual live run with an explicit `jobId`.
