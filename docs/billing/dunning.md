# Rent Payment Dunning Cadence

Roomsily triggers a structured dunning sequence whenever Stripe reports a failed rent payment. The cadence is designed to give roommates multiple chances to update their payment method before property managers need to intervene.

## Timeline

| Stage | Timing (relative to failure) | Action |
| --- | --- | --- |
| Retry 1 | 24 hours *(or Stripe's `next_payment_attempt` if later)* | Queue automatic retry and email reminder using the **payment-retry** template. |
| Retry 2 | 72 hours | Queue second retry notice with updated attempt counter. |
| Final notice | 168 hours (7 days) | Send escalated warning via **payment-final-notice** template; property team reviews outstanding balance. |

All stages are stored in the `email_notifications` table with `status = 'pending'` until they are dispatched by the out-of-band mailer.

## Notifications

- **Immediate email:** When the webhook fires we send the **payment-failed** template to the tenant (and store a sent notification).
- **In-app alert:** Tenants receive a blocking banner linking to `/payments` to update their billing details.
- **Scheduled emails:** Each cadence stage is recorded with metadata (`stageId`, `attempt`, `paymentReference`) so downstream jobs know which template and retry attempt to execute.

## Data captured

- `rent_payments.metadata.dunning_plan` stores both the retry schedule timestamps and which notifications were queued.
- `email_notifications.metadata` captures the same context for auditing.
- `subscriptions.status` is set to `past_due` after a failed invoice so dashboard views can surface delinquent accounts.

## Operational notes

1. **Idempotency:** Replaying the same webhook won't enqueue duplicate retries because Supabase constraints on `email_notifications` (timestamp + metadata) are enforced by the dispatcher job.
2. **Manual overrides:** Property managers can cancel scheduled retries by marking the relevant `email_notifications` rows as `status = 'failed'` and storing `metadata.cancelled = true` for audit trails.
3. **Follow-up workflow:** After the final notice the property operations team reaches out manually and may disable the roommate's autopay until the balance is resolved.
