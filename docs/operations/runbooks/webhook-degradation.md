# Runbook: Webhook Degradation

## Triggers

- `webhook_failures_total` >= 3 in 5 minutes
- Repeated signature validation failures
- Provider retries accumulating (Stripe/Cal.com/Documenso)

## Metric interpretation

- High `webhook_failures_total` with stable API latency typically points to secret/config mismatch.
- Failures concentrated on one provider/event type imply contract drift or payload schema changes.
- A concurrent drop in `payment_success_total` indicates downstream payment lifecycle impact.

## Immediate actions

1. Acknowledge alert and assign Incident Commander.
2. Validate webhook secrets in Vercel environment variables.
3. Inspect structured logs for `stripe_webhook_processing_failed` and reason codes.
4. Trace one failing `correlationId` across receive/process/fail lifecycle logs.
5. Verify database connectivity and Supabase service-role key health.

## First-response mitigation

1. Increase webhook consumer concurrency only if DB pressure is healthy.
2. Disable non-critical webhook side effects (notifications, enrichment) behind feature flags.
3. Queue incoming payloads for replay if processing risk remains high.

## Recovery steps

1. Fix configuration mismatch (secret rotation, malformed env var, revoked API key).
2. Deploy hotfix if schema/handler regression is detected.
3. Replay failed webhook deliveries from provider consoles.
4. Confirm no duplicate side effects in payments, bookings, or documents.

## Post-incident checks

- Review dead-letter events and document replay outcome.
- Ensure failure alert noise drops below threshold.
- Publish timeline and root-cause summary within 24 hours.
