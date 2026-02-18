# Runbook: Webhook Degradation

## Triggers

- `webhook_failures_total` >= 3 in 5 minutes
- Repeated signature validation failures
- Provider retries accumulating (Stripe/Cal.com/Documenso)

## Immediate actions

1. Acknowledge alert and assign Incident Commander.
2. Validate webhook secrets in Vercel environment variables.
3. Inspect structured logs for `stripe_webhook_processing_failed` and reason codes.
4. Verify database connectivity and Supabase service-role key health.

## Recovery steps

1. Fix configuration mismatch (secret rotation, malformed env var, revoked API key).
2. Deploy hotfix if schema/handler regression is detected.
3. Replay failed webhook deliveries from provider consoles.
4. Confirm no duplicate side effects in payments, bookings, or documents.

## Post-incident checks

- Review dead-letter events and document replay outcome.
- Ensure failure alert noise drops below threshold.
- Publish timeline and root-cause summary within 24 hours.
