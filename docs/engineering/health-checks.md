# Health Check Endpoints

Roomsily exposes dedicated health probes under `/api/health` to simplify orchestrator integrations, uptime monitoring, and on-call troubleshooting.

## Endpoints

| Path | Purpose | HTTP Status Contract |
| --- | --- | --- |
| `GET /api/health/liveness` | Confirms the process is running and able to serve requests. Includes uptime, PID, and RSS memory metrics. | Always returns `200 OK` with `status: "pass"` unless the runtime cannot be reached. |
| `GET /api/health/readiness` | Validates external dependencies required for tenant workflows. | Returns `200 OK` for `pass` / `warn` states and `503 Service Unavailable` for `fail`. |

All responses follow the [IETF Health Check](https://datatracker.ietf.org/doc/html/rfc9457) status vocabulary (`pass`, `warn`, `fail`) and expose a `checks` object keyed by dependency name.

### Example readiness response

```json
{
  "status": "fail",
  "timestamp": "2024-07-12T16:42:10.221Z",
  "checks": {
    "supabase": {
      "status": "fail",
      "message": "Supabase query failed: Invalid API key",
      "meta": {
        "code": "401",
        "httpStatus": 401,
        "latencyMs": 187
      },
      "checkedAt": "2024-07-12T16:42:10.219Z"
    },
    "stripeWebhook": {
      "status": "pass",
      "message": "Stripe webhook configuration verified",
      "meta": {
        "sampleSignature": "t=1699870000",
        "latencyMs": 12
      },
      "checkedAt": "2024-07-12T16:42:10.219Z"
    },
    "resend": {
      "status": "warn",
      "message": "RESEND_API_KEY is not configured; transactional email will be disabled",
      "checkedAt": "2024-07-12T16:42:10.219Z"
    }
  }
}
```

## Dependency coverage

The readiness probe performs the following checks in parallel:

- **Supabase** – Uses the service-role key to perform a lightweight `SELECT` against the `profiles` table. Timeouts and query errors surface as `fail` with diagnostic metadata.
- **Stripe webhook configuration** – Ensures `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are present, validates expected prefixes, and exercises the Stripe SDK by generating a test webhook signature header.
- **Resend** – Flags absence of `RESEND_API_KEY` as `warn` so deployments know transactional email is disabled.
- **Documenso** – Confirms `DOCUMENSO_API_KEY` and `DOCUMENSO_BASE_URL` are configured. Missing values produce a `warn` status.
- **Cal.com** – Confirms `CALCOM_API_KEY` and `CALCOM_BASE_URL` are configured. Missing values produce a `warn` status.

Future dependencies can be added by extending `app/api/health/checks.ts` with an additional async check and including it in the readiness route.

## Using the probes in deployments

### Vercel

1. Add both URLs (`/api/health/liveness` and `/api/health/readiness`) as [Monitors](https://vercel.com/docs/observability/monitors) to receive alerts on regression.
2. Enable the project-level **Health Checks** feature and point it to `/api/health/readiness` so failed dependencies prevent traffic promotion during deployments.

### Kubernetes

Attach the following probes to the Next.js container:

```yaml
livenessProbe:
  httpGet:
    path: /api/health/liveness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3
readinessProbe:
  httpGet:
    path: /api/health/readiness
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 15
  failureThreshold: 3
```

### Docker Compose / Swarm

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/liveness"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      update_config:
        order: start-first
      restart_policy:
        condition: on-failure
```

Gate load balancer traffic by polling `/api/health/readiness` and waiting for a `pass`/`warn` response before announcing the container.

## Troubleshooting

- **Supabase failures** – Confirm `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and that the service role has network access to the Supabase REST endpoint.
- **Stripe warnings** – Validate the secret formats (`sk_live_` / `sk_test_` and `whsec_`). The readiness response includes a sample generated signature header prefix for debugging.
- **Optional integrations** – `warn` statuses for Resend, Documenso, or Cal.com indicate missing API keys. Provision credentials before enabling features that rely on them.

Use the `meta.latencyMs` values to spot unusual delays that might point to network issues.
