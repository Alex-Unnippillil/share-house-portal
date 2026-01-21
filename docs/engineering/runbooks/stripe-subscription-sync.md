# Stripe ↔ Supabase Subscription Sync Runbook

## Overview
The `scripts/stripe-sync.ts` task compares subscription records between Stripe Billing and our Supabase `public.subscriptions` table. The script reconciles status drift, refreshes the current billing period metadata, and raises alerts when records are missing on either side.

The job executes nightly via the `stripe-subscription-sync` GitHub Actions workflow and can be invoked manually with `workflow_dispatch`.

## Preconditions
Ensure the following environment variables are available (GitHub Secrets for production, `.env.local` for ad-hoc runs):

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key with write access |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `SLACK_WEBHOOK_URL` | (Optional) Incoming webhook for the #alerts channel |
| `SENTRY_DSN` | (Optional) Sentry DSN for structured alerting |

## Running Manually
```
npm install
npm run stripe:sync -- --apply
```

Omit `--apply` for a dry run; the command exits with a non-zero code if drift is detected but not reconciled.

## Alerting & Metrics
- **Slack**: When `SLACK_WEBHOOK_URL` is configured, the job posts a summary with counts of mismatched statuses, missing IDs, and updates applied.
- **Sentry**: When `SENTRY_DSN` is present, the script emits a message tagged with metrics and drift context. Failures flush to Sentry before exit.
- **GitHub Actions logs**: Full drift tables print to the workflow logs for forensic review.

## Reconciliation Logic
1. Fetch the complete subscription list from Supabase and Stripe (paginated in batches of 100).
2. Map Stripe statuses to Supabase statuses:
   - `active`, `trialing` → `active`
   - `past_due`, `paused`, `incomplete` → `past_due`
   - `unpaid` → `unpaid`
   - `canceled`, `incomplete_expired` → `canceled`
3. Flag records missing cross-system IDs for manual investigation.
4. When run with `--apply`, update Supabase with:
   - Normalised status
   - `current_period_start`
   - `current_period_end`
   - `cancel_at_period_end`

## Troubleshooting
- **GitHub Action failures**: Review the run logs to identify validation errors from Supabase or Stripe rate limiting. Re-run manually with `npm run stripe:sync` to reproduce locally.
- **Supabase permission errors**: Confirm the service role key is configured; anon keys lack update rights on `public.subscriptions`.
- **High drift counts**: Investigate recent billing changes (refunds, cancellations). Confirm that webhooks are functioning so that future updates flow automatically.
- **Missing Stripe subscriptions**: Validate that the `stripe_subscription_id` column is populated during tenant onboarding.

## Escalation
If reconciliation fails for more than 24 hours:
1. Notify the payments lead in Slack (#payments channel).
2. Create an incident in the engineering tracker with the failing run logs.
3. Pause automated retries if Stripe API rate limits are observed to avoid service degradation.
