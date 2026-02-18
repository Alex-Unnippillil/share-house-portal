# Runbook: Payment Outage

## Triggers

- `payment_failures_total` breach (P1)
- Stripe checkout errors > 2% over 5 minutes
- Tenant support reports recurring failed payments

## Immediate actions (first 15 minutes)

1. Acknowledge PagerDuty alert and open incident channel (`#inc-payments-<date>`).
2. Confirm Stripe status page and Roomsily Stripe dashboard health.
3. Check `app/api/stripe/checkout/route.ts` logs for `stripe_checkout_session_failed`.
4. Check `app/api/stripe/webhook/route.ts` logs for delayed or failing webhook processing.

## Stabilization

1. Roll back recent payment route or webhook deployment if regression detected.
2. Replay failed webhooks in Stripe dashboard after recovery.
3. Trigger one manual test charge in staging + production safe test tenant.

## Communication

- Update status every 15 minutes in incident channel.
- Notify Support with impacted tenant cohorts and expected ETA.

## Exit criteria

- Failure metric returns to baseline for 30 minutes.
- Webhook backlog fully replayed.
- Finance reconciliation confirms no untracked charges.
