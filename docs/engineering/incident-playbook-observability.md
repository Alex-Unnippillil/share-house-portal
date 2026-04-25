# Incident Playbook: Webhook, Booking Validation, and Reconciliation Metrics

_Last updated: 2026-04-25_

This playbook covers high-signal alerts tied to operational metrics.

## 1) Spike in Failed Webhook Signatures

### Trigger
- Alert fires on `webhook_delivery_failure_total` with `reason=stripe_signature_verification_failed`.

### Immediate Actions (first 15 minutes)
1. Confirm current Stripe webhook signing secret in environment configuration.
2. Verify no recent deploy or secret rotation mismatch between Stripe dashboard and Vercel env vars.
3. Query recent `webhook_events` rows for status/error spikes.
4. Check if failures are isolated to one environment (`development`, `staging`, `production`).

### Mitigation
- Correct `STRIPE_WEBHOOK_SECRET` and redeploy.
- If attack suspected, rotate secret and block unknown source traffic at edge controls.

### Recovery Criteria
- Failure rate returns below 5% for 15 consecutive minutes.
- New Stripe events are being marked `processed`.

## 2) Sustained Reconciliation Backlog

### Trigger
- Reconciliation backlog exceeds threshold (for example, >25 open failed rows for >=30 minutes).
- `payment_reconciliation_failures_total` also trending upward.

### Immediate Actions (first 30 minutes)
1. Export reconciliation CSV from `/api/payments/reconciliation/export`.
2. Triage top offenders (unmapped webhook events, repeated tenant mapping failures).
3. Validate Supabase availability and recent schema changes impacting payment metadata.
4. Confirm Stripe event processing status and dead-letter entries.

### Mitigation
- Assign on-call property manager/admin to triage queue ownership.
- Patch missing tenant mappings and replay affected events where feasible.
- If API-level failures continue, temporarily pause non-essential exports/triage jobs and focus recovery on ingestion pipeline.

### Recovery Criteria
- Open triage queue steadily decreases over two consecutive 15-minute checks.
- No new P1 reconciliation failures in the last 30 minutes.

## 3) Elevated Booking Conflict Validation Rejections

### Trigger
- `booking_conflict_validation_rejections_total` exceeds threshold in short interval.

### Immediate Actions
1. Split rejection volume by `reason` tag.
2. If mostly `policy_violation`, review policy rollout or client-side validation drift.
3. If mostly `overlap_conflict`, inspect amenity slot capacity/configuration and possible duplicate submissions.

### Mitigation
- Adjust booking policy limits if configuration regression is confirmed.
- Add temporary client-side debounce/lockout for duplicate submit loops.

### Recovery Criteria
- Rejection rate returns to established baseline for same day-of-week traffic profile.

## Incident Communications

- Post updates every 15 minutes in the incident channel.
- Include: current metric values, user impact, mitigation status, ETA.
- Close with a post-incident summary and follow-up actions within 2 business days.
