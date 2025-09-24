# Synthetic Monitoring Runbook

This playbook documents how Roomsily operates synthetic Playwright monitors for the tenant portal. The goal is to detect end-to-end regressions across onboarding, payments, amenity bookings, messaging, and maintenance intake before residents report issues.

## Test Suite Overview

All monitors reuse the Playwright scripts stored in `tests/e2e`. Each journey is executed from three geographic regions (us-east-1, us-west-2, eu-central-1) through Checkly. Alert thresholds are tuned to catch sustained failures while suppressing one-off blips.

| Monitor | Playwright Spec | Frequency | Locations | Alert Threshold |
| --- | --- | --- | --- | --- |
| Tenant onboarding | `tests/e2e/onboarding.spec.ts` | 5 minutes | us-east-1, us-west-2, eu-central-1 | 2 consecutive failures or p95 > 8s |
| Payments workspace | `tests/e2e/payments.spec.ts` | 5 minutes | us-east-1, us-west-2, eu-central-1 | 2 consecutive failures or p95 > 10s |
| Amenity bookings | `tests/e2e/bookings.spec.ts` | 5 minutes | us-east-1, us-west-2, eu-central-1 | 2 consecutive failures or p95 > 10s |
| Messaging moderation | `tests/e2e/messaging.spec.ts` | 10 minutes | us-east-1, us-west-2, eu-central-1 | 3 consecutive failures or p95 > 9s |
| Maintenance intake | `tests/e2e/maintenance.spec.ts` | 10 minutes | us-east-1, us-west-2, eu-central-1 | 2 consecutive failures or p95 > 12s |

> **Regional signals:** The monitors run independently per region. When only a single region fails, treat it as a CDN/network incident; when two or more regions fail, escalate immediately.

## Configuration Source of Truth

The Checkly deployment bundle lives in `config/monitoring/playwright-checks.ts`. Each entry defines the script path, cadence, locations, and alert channel routing. The bundle is consumed via the Checkly CLI:

```bash
pnpm dlx checkly deploy --config config/monitoring/playwright-checks.ts
```

Key configuration notes:

- Project slug: `roomsily-portal`
- Runtime: `2024.10` (Playwright 1.55.1)
- Alert channels: PagerDuty service `roomsily-platform` (critical) and Slack `#alerts-synthetics` (major/minor).
- `PLAYWRIGHT_DISABLE_NETWORK_STUBS=true` disables the Supabase/Stripe stubs when running against production so the monitors exercise live infrastructure.

## Local Development & Validation

1. Install Playwright assets if not already present:
   ```bash
   pnpm exec playwright install --with-deps
   ```
2. Run the synthetic suite locally with network stubs (safe for development data):
   ```bash
   pnpm test:e2e
   ```
3. To mirror production monitoring without stubs, point `PLAYWRIGHT_BASE_URL` to staging/production and disable stubs:
   ```bash
   PLAYWRIGHT_BASE_URL=https://portal.roomsily.com \
   PLAYWRIGHT_DISABLE_NETWORK_STUBS=true \
   pnpm test:e2e:monitor
   ```

## Incident Response Procedures

### General Flow

1. **Acknowledge** the PagerDuty alert. Confirm whether the failure is isolated to a single region.
2. **Review** the Playwright run artifacts (screenshots/trace) attached by Checkly.
3. **Correlate** with platform telemetry: Vercel logs, Supabase dashboards, Stripe/Cal.com status.
4. **Mitigate** using the feature-specific steps below.
5. **Communicate** in Slack `#incidents` and update the Statuspage component if customer impact is confirmed.
6. **Record** findings in the incident retro template within 24 hours.

### Onboarding Failures

- Validate Supabase Auth health (`auth.status.roomsily.com`).
- Re-run the monitor manually with `pnpm test:e2e --grep "Onboarding"` against production.
- If Supabase is healthy, roll back the latest auth-related deployment (`/auth` or `/onboarding`) via Vercel.
- Notify Support to switch to manual onboarding until resolved.

### Payments Workspace Failures

- Check Stripe dashboard for API availability or rate limiting.
- Inspect `/api/stripe/checkout` and `/api/stripe/billing-portal` logs in Vercel for 5xx spikes.
- Toggle `payments:checkout_enabled=false` feature flag if charges fail, then coordinate with Payments squad for remediation.

### Amenity Booking Failures

- Confirm Cal.com API status and Supabase RPC `check_amenity_conflicts` latency.
- If RPC latency exceeds 20ms budget, failover to cached availability by toggling the `bookings:conflict_check_mode=degraded` flag.
- Communicate alternative booking instructions (e.g., Slack channel) to roommates if outage persists.

### Messaging Moderation Failures

- Validate Supabase Realtime channels and moderation queue tables (`messages`, `threads`).
- Confirm `ModerationControls` client build hash matches latest deployment; redeploy if asset missing.
- Escalate to Community Ops to monitor threads manually until automation recovers.

### Maintenance Intake Failures

- Confirm Supabase table `maintenance_requests` is writable and RLS policies pass for tenant role.
- Review Documenso/Notification webhooks if confirmation toasts fail to render.
- Switch to manual Google Form backup (link pinned in `#maintenance`) and notify property managers.

## Post-incident Checklist

- Update the synthetic monitor status in Checkly (maintenance windows, muted alerts).
- Verify `docs/perf/playbook.md` is still accurate or update thresholds if repeated noisy alerts occur.
- File Jira issues for root causes and follow-up automation tasks.
- Schedule a retro if the incident reached PagerDuty severity P1 or higher.

## Contact Matrix

| Role | Contact | Notes |
| --- | --- | --- |
| On-call engineer | PagerDuty `roomsily-platform` | Primary incident commander |
| Payments specialist | Slack `@payments-oncall` | Stripe/Cash reconciliation |
| Community operations | Slack `@community-ops` | Messaging triage & resident comms |
| Facilities lead | Slack `@maintenance-oncall` | Maintenance alternative workflows |

Maintaining green synthetic monitors is a release gate for production deploys. Any sustained failure requires a feature freeze until a mitigation plan is in place.
