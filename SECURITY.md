# Security Policy

See nextconfig.js for CSP and header config.

## Rate Limiting

Authentication flows and transactional messaging endpoints are rate limited to
reduce automated abuse and credential stuffing. Quotas are enforced per client
identifier (IP address header) using Upstash Redis in production with an
in-memory fallback for local development.

| Endpoint | Limit | Window | Notes |
| --- | --- | --- | --- |
| `POST /api/send` | 5 requests | 60 seconds | Blocks transactional email abuse; alerts log metadata for investigation. |
| `GET /api/auth/google` | 10 requests | 60 seconds | Prevents repeated OAuth initiation attempts. |
| `GET /api/auth/callback` | 20 requests | 60 seconds | Throttles token exchanges; higher threshold to accommodate multi-tab redirects. |

Exceeding a quota emits a structured `rate_limit_exceeded` log with method,
path, user agent, request identifier, and forwarded IP chain. Monitor these
logs via the Vercel log drain/observability stack and escalate to Security if
patterns suggest automated credential abuse or account takeover attempts.

To adjust quotas, update `lib/rate-limit.ts` and redeploy with corresponding
Upstash configuration changes.

## Reporting a Vulnerability

Please head to Advisories to submit a private vulnerability report.
If needed, check out the docs explaining [how to submit a private vulnerability report](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository#enabling-or-disabling-private-vulnerability-reporting-for-a-repository).
