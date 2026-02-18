# Runbook: Payment Outage

## Triggers

- Payment success rate (`payment_success_total / payment_attempts_total`) drops below 92% for 15 minutes
- `payment_failures_total` breach (P1)
- Stripe checkout errors > 2% over 5 minutes
- Tenant support reports recurring failed payments

## Metric interpretation

- Rising `payment_attempts_total` with flat `payment_success_total` usually indicates provider/API degradation.
- `payment_failures_total` spikes with high webhook failures suggests asynchronous reconciliation lag.
- If failures are isolated to one property or unit cohort, prioritize tenant data/config checks before global rollback.

## Immediate actions (first 15 minutes)

1. Acknowledge PagerDuty alert and open incident channel (`#inc-payments-<date>`).
2. Confirm Stripe status page and Roomsily Stripe dashboard health.
3. Check `app/api/stripe/checkout/route.ts` logs for `stripe_checkout_session_failed` using `correlationId` from alert samples.
4. Check `app/api/stripe/webhook/route.ts` logs for delayed or failing webhook processing.

## First-response mitigation

1. Temporarily pause autopay retries for impacted cohorts to prevent repeated failures.
2. Route tenants to Billing Portal fallback and publish a status banner in-app.
3. If regression is code-related, roll back latest payment/webhook deployment.

## Stabilization

1. Replay failed webhooks in Stripe dashboard after recovery.
2. Trigger one manual test charge in staging + production safe test tenant.
3. Validate payment success rate recovers above 97% for at least 30 minutes.

## Communication

- Update status every 15 minutes in incident channel.
- Notify Support with impacted tenant cohorts and expected ETA.

## Exit criteria

- Success and failure metrics return to baseline for 30 minutes.
- Webhook backlog fully replayed.
- Finance reconciliation confirms no untracked charges.
