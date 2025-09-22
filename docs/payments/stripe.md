# Stripe Payments Integration

Roomsily relies on Stripe Checkout and Billing Portal for collecting rent while Supabase stores the system of record. This guide
covers how webhook events are normalized, persisted, and monitored.

## Database setup

1. Apply the payments schema migrations (rent payments, subscriptions, and webhook audit log):
   ```bash
   supabase db push --file supabase/migrations/20250103_payments_schema.sql
   supabase db push --file supabase/migrations/20250105_stripe_webhook_events.sql
   ```
2. Confirm the following environment variables are set for the Next.js app:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Create a Stripe webhook endpoint that points to `/api/stripe/webhook` and subscribe to these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Normalized statuses

Stripe responses are mapped to canonical enums before persisting to Supabase:

| Context              | Stripe status                                            | Stored status |
| -------------------- | -------------------------------------------------------- | ------------- |
| Rent payments        | `paid`, `succeeded`, `completed`, `captured`              | `succeeded`   |
|                      | `processing`, `pending`, `requires_*`, `open`, `draft`   | `pending`     |
|                      | `failed`, `declined`, `unpaid`, `uncollectible`          | `failed`      |
|                      | `void`, `canceled`, `cancelled`, `incomplete_expired`    | `cancelled`   |
| Subscriptions        | `trialing`, `active`                                     | `active`      |
|                      | `past_due`, `paused`, `incomplete`                       | `past_due`    |
|                      | `unpaid`                                                 | `unpaid`      |
|                      | `canceled`, `cancelled`, `incomplete_expired`            | `canceled`    |

Webhook payloads are stored in the `stripe_webhook_events` table with a processing status (`received`, `processed`, `failed`,
`ignored`) plus alert metadata for monitoring.

## Reconciliation job

Stripe occasionally retries or drops events, so a scheduled reconciliation job replays missing deliveries by calling:

```
POST /api/jobs/stripe/reconcile?lookback=86400
```

- `lookback` is optional (seconds, default 86,400 / 24 hours).
- The job fetches recent Stripe events, inserts any missing `stripe_webhook_events` rows, and re-runs the same processors used by
the webhook handler.
- Failures are marked in `stripe_webhook_events` and alert recipients are notified.

Configure a Vercel Cron entry similar to:

```json
{
  "path": "/api/jobs/stripe/reconcile",
  "schedule": "0 * * * *",
  "method": "POST",
  "body": "{\"lookback\": 86400}"
}
```

## Webhook monitoring

Use the monitor endpoint to raise alerts when an event is stuck in `received` or marked as `failed`:

```
POST /api/jobs/stripe/monitor?staleMinutes=10&cooldownMinutes=30
```

- `staleMinutes` controls how long a `received` event can sit without being processed (default 10 minutes).
- `cooldownMinutes` throttles repeat notifications (default 30 minutes).
- Alerts are written to the `notifications` table for every admin/property-manager profile.

Schedule the monitor to run frequently (e.g. every five minutes) via Vercel Cron or your job runner.

## Frontend status widgets

The `/payments` page now renders the `PaymentStatusOverview` server component, which queries Supabase for the latest
`rent_payments` and `subscriptions` records and surfaces the normalized statuses instead of calling Stripe directly. This ensures
rent status indicators always reflect the persisted system of record.

## Testing tips

- Use the Stripe CLI or Dashboard to trigger test events and confirm they appear in `stripe_webhook_events` with status
  `processed`.
- Manually set a row to `failed` and run `POST /api/jobs/stripe/monitor` to verify alerts are generated.
- Delete a `stripe_webhook_events` row and run the reconciliation job to confirm it re-creates the record and associated
  `rent_payments` / `subscriptions` entries.
