# External API Resilience Configuration

The portal wraps integrations with Cal.com, Documenso, and Google Calendar with common retry, timeout, and circuit-breaker logic. This page documents the configuration knobs that control that behaviour.

## Global settings

The following environment variables apply to all providers unless a provider-specific override is supplied. Values are read at process start and expressed in milliseconds unless noted otherwise.

| Variable | Description | Default |
| --- | --- | --- |
| `EXTERNAL_API_TIMEOUT_MS` | Maximum duration for a single outbound request before it is aborted. | `10000` (10 seconds) |
| `EXTERNAL_API_MAX_RETRIES` | Number of retry attempts performed via `p-retry` after a transient failure or timeout. | `2` |
| `EXTERNAL_API_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Consecutive failures before a circuit transitions to the open state. | `3` |
| `EXTERNAL_API_CIRCUIT_BREAKER_COOLDOWN_MS` | How long an open circuit waits before allowing a half-open probe. | `60000` (60 seconds) |
| `EXTERNAL_API_CACHE_TTL_MS` | Time-to-live for cached successful responses that are used when a provider is unavailable. | `300000` (5 minutes) |
| `EXTERNAL_API_HALF_OPEN_SUCCESS_THRESHOLD` | Number of consecutive half-open successes required before closing the circuit. | `1` |

## Provider overrides

Each provider can override the global defaults by exporting environment variables that follow the pattern `<PROVIDER>_API_<SETTING>`. Provider prefixes are:

- `CALCOM`
- `DOCUMENSO`
- `GOOGLE_CALENDAR`

Available suffixes mirror the global settings: `API_TIMEOUT_MS`, `API_MAX_RETRIES`, `API_FAILURE_THRESHOLD`, `API_COOLDOWN_MS`, `API_CACHE_TTL_MS`, and `API_HALF_OPEN_SUCCESS_THRESHOLD`.

For example, to increase the Cal.com timeout to 15 seconds while leaving other services untouched:

```bash
CALCOM_API_TIMEOUT_MS=15000
```

## Behaviour summary

- Calls are retried with `p-retry` and aborted when the configured timeout is exceeded.
- When a circuit is open, read operations return cached responses (if available) or the configured fallback value instead of making upstream calls.
- Circuit state and cache metadata are exposed to the UI so we can surface degraded mode notices.

## User-facing fallbacks

When cached data is served or a provider is unavailable:

- Document signing flows display a toast warning and inline banner explaining that Documenso data may be stale.
- Scheduling events through Google Calendar raises a warning toast and inline callout whenever the service falls back to cached metadata or cannot create a new event.

These cues help operators understand when external systems are degraded and decide whether to retry or escalate.
