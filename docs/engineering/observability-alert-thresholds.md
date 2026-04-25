# Observability Alert Thresholds

_Last updated: 2026-04-25_

This document defines alert thresholds for webhook delivery, booking conflict validation, and payment reconciliation operations.

## Alert Scope

| Metric | Severity | Threshold | Evaluation Window | Suggested Response |
| --- | --- | --- | --- | --- |
| `webhook_delivery_failure_total` | P1 | `>= 10` failures OR failure rate `> 15%` | 5 minutes | Trigger webhook incident playbook immediately. |
| `webhook_delivery_failure_total` with `reason=stripe_signature_verification_failed` | P1 | `>= 5` failures | 5 minutes | Treat as potential secret rotation/configuration drift. |
| `webhook_delivery_failure_latency_ms` p95 | P2 | `> 4,000ms` | 15 minutes | Investigate Stripe/Supabase latency and retry pressure. |
| `booking_conflict_validation_rejections_total` | P3 | `>= 75` rejections | 15 minutes | Validate policy configuration and potential UI misuse loops. |
| `payment_reconciliation_failures_total` | P1 | `>= 6` failures | 10 minutes | Open incident; reconciliation flow is degraded. |
| Reconciliation backlog (failed rows with open triage) | P2 | `> 25` rows for `>= 30` minutes | 30 minutes | Escalate to property manager on call. |

## Notes on Metric Interpretation

- `webhook_delivery_*` metrics include success/failure counters and latency histograms emitted by `/api/stripe/webhook`.
- `booking_conflict_validation_rejections_total` includes both policy violations and overlap conflicts from `/api/bookings/validate`.
- `payment_reconciliation_failures_total` tracks operational failures in reconciliation triage and export APIs.

## Dashboard Panels

Recommended dashboard panels:

1. **Webhook delivery reliability**
   - Success count, failure count, failure rate percentage.
2. **Webhook latency**
   - p50 and p95 for success and failure histograms.
3. **Booking conflict rejection trend**
   - Stacked by `reason` tag (`policy_violation`, `overlap_conflict`).
4. **Payment reconciliation health**
   - Failure count trend + open backlog count from reconciliation tables.
