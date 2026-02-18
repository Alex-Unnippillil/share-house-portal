# Observability Standards

## Structured logging conventions

All server-side logs should be JSON payloads emitted via `createStructuredLogger` in `lib/observability/logger.ts`.

Required fields:

- `timestamp`
- `level`
- `surface` (`route_handler`, `server_action`, `webhook_processor`, `job`)
- `message`
- `component`

Recommended fields:

- `requestId` propagated from `x-request-id` or generated UUID
- `eventName` for webhook event names / domain operations
- `tenantId`, `unitId`, `actorId` where available
- `reason` for failures

## Usage by execution surface

- **Route handlers**: create one logger per request and include request-scoped metadata (`requestId`, route name).
- **Server actions**: use logger to record validation, auth and persistence decisions.
- **Webhook processors**: always log receive → process → complete phases and include provider event IDs.

## Analytics and operational metrics wiring

- Vercel Analytics remains enabled in `app/layout.tsx` through `<Analytics />`.
- Operational metrics are emitted via `incrementOperationalMetric` / `recordOperationalMetric` in `lib/observability/metrics.ts`.
- Current metrics:
  - `payment_failures_total`
  - `booking_conflicts_total`
  - `webhook_failures_total`

### Event mapping

- Stripe checkout failures increment `payment_failures_total`.
- Stripe webhook processing failures increment `webhook_failures_total`.
- Amenity conflict checks emit Vercel Analytics events: `booking_conflict_check`, `booking_conflict_detected`, `booking_conflict_check_failed`.

## Log drain expectations

Forward Vercel function logs to Datadog or equivalent SIEM and parse JSON payloads into facets for:

- `surface`
- `component`
- `eventName`
- `tenantId` / `unitId`
- `level`
