# Observability Standards

## Structured logging conventions

All server-side logs should be JSON payloads emitted via `createStructuredLogger` in `lib/observability/logger.ts`.

Required fields:

- `timestamp`
- `level`
- `surface` (`route_handler`, `server_action`, `webhook_processor`, `job`)
- `message`
- `component`
- `requestId`
- `correlationId`

Recommended fields:

- `lifecyclePhase` to map request/webhook progress (`request.received`, `request.completed`, `webhook.received`, `webhook.processed`, `webhook.failed`)
- `eventName` for webhook event names / domain operations
- `tenantId`, `unitId`, `actorId` where available
- `reason` for failures

## Correlation-ID propagation

- Generate or reuse correlation IDs with `getCorrelationId(headers, requestId)`.
- Accept inbound `x-correlation-id`; fallback to `x-request-id`; otherwise generate UUID.
- Attach `x-correlation-id` response header from operational endpoints for downstream traceability.
- Include the same correlation ID in operational metric tags so log streams and metric points can be joined during incident response.

## Usage by execution surface

- **Route handlers**: create one logger per request and include request-scoped metadata (`requestId`, `correlationId`, route name).
- **Server actions**: use logger to record validation, auth and persistence decisions; include `correlationId` when actions are initiated from traced requests.
- **Webhook processors**: always log receive → process → complete phases, include provider event IDs, and preserve upstream correlation IDs.

## Analytics and operational metrics wiring

- Vercel Analytics remains enabled in `app/layout.tsx` through `<Analytics />`.
- Operational metrics are emitted via `incrementOperationalMetric` / `recordOperationalMetric` in `lib/observability/metrics.ts`.
- Current metrics:
  - `payment_attempts_total`
  - `payment_success_total`
  - `payment_failures_total`
  - `booking_conflicts_total`
  - `webhook_failures_total`
  - `maintenance_sla_met_total`
  - `maintenance_sla_breaches_total`
  - `message_moderation_actions_total`
  - `auth_failures_total`

### Event mapping

- Stripe webhook payment events increment `payment_attempts_total` and either `payment_success_total` or `payment_failures_total`.
- Stripe checkout creation failures increment `payment_failures_total` for operator visibility.
- Amenity conflict checks emit `booking_conflicts_total` for policy/rules friction monitoring.
- Maintenance workflows should emit `maintenance_sla_met_total`/`maintenance_sla_breaches_total` when tickets resolve.
- Moderation tools should emit `message_moderation_actions_total` with action tags (`delete`, `flag`, `pin`, `unpin`).
- Auth middleware and protected APIs should emit `auth_failures_total` on abnormal 401/403 spikes.

## Log drain expectations

Forward Vercel function logs to Datadog or equivalent SIEM and parse JSON payloads into facets for:

- `surface`
- `component`
- `lifecyclePhase`
- `eventName`
- `correlationId`
- `tenantId` / `unitId`
- `level`
