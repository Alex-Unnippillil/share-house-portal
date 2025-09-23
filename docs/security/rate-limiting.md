# Rate Limiting and Abuse Monitoring

## Overview

Roomsily protects sensitive auth and messaging surfaces with server-side rate
limiting. Requests are bucketed per client identifier (derived from
`X-Forwarded-For` and related headers) and evaluated before executing the route
handler. Production deployments use Upstash Redis for shared counters while
local development falls back to an in-memory store with the same thresholds.

## Quotas

| Surface | Endpoint | Limit | Window | Rationale |
| --- | --- | --- | --- | --- |
| OAuth initiation | `GET /api/auth/google` | 10 requests | 60 seconds | Blocks credential-stuffing bots and repeated consent loops. |
| OAuth callback | `GET /api/auth/callback` | 20 requests | 60 seconds | Allows concurrent browser tabs finishing login while throttling replay attempts. |
| Transactional email trigger | `POST /api/send` | 5 requests | 60 seconds | Prevents automated email blasts from compromised accounts. |

Adjust limits by editing `lib/rate-limit.ts` and updating any Upstash Redis
configuration applied to the deployment environment.

## Implementation Details

* `lib/rate-limit.ts` exposes `enforceRateLimit` that each route calls before
  executing business logic.
* When quotas are exceeded the helper emits a `429` response via
  `rateLimitResponse` and stops further processing.
* Upstash is accessed through the REST pipeline API to increment counters and
  set expirations atomically. If the Upstash request fails, the utility logs the
  error and transparently falls back to the in-memory store to avoid outages.

## Logging and Monitoring

* Every breach writes a structured `rate_limit_exceeded` log containing
  method, route, request identifier headers, and user agent string.
* These logs surface in Vercel log drains/DataDog for anomaly detection. Add
  dashboards and alerts for spikes in rate-limit denials per route.
* Security operations should review spikes for signs of credential stuffing or
  message abuse and temporarily block offending IP ranges if necessary.

## Local Development

* Without `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` the system uses a
  shared in-memory map keyed per module instance. This preserves ergonomics
  while mirroring production behaviour for manual testing.
* To validate behaviour locally, issue more than the allowed number of requests
  within 60 seconds and confirm a `429` response with a `Retry-After` header is
  returned.
