# Background Worker Agent Template

> Duplicate this template into `agents/<agent-name>/AGENTS.md` when introducing a new background worker. Update every section with agent-specific details before opening a pull request.

## Overview

- **Agent name:** `<agent-name>`
- **Team / Owner:** `<team>`
- **Primary purpose:** Describe what business workflow or automation this worker performs.
- **Trigger cadence:** e.g., event-driven via queue, cron schedule, or manual dispatch.

## Responsibilities

- List the core jobs or message types the worker processes.
- Note any upstream dependencies (topics, queues, webhooks) and downstream systems updated.

## Runtime & Deployment

- **Language / Runtime:** e.g., TypeScript (Node 20), Python 3.11, Go 1.21.
- **Package location:** `<path within monorepo>`
- **Build command:** `<pnpm turbo run build --filter ...>`
- **Deploy target:** e.g., AWS ECS service, serverless function, Kubernetes CronJob.
- **Scaling strategy:** Autoscaling rules, concurrency limits, or worker pool sizing.

## Configuration

- Enumerate required environment variables, secrets, and configuration files.
- Document feature flags or toggles that affect behavior.
- Reference configuration sources (e.g., `infra/secrets/<agent>.tf`, Parameter Store path).

## Observability

- **Logging:** Format, correlation IDs, and log destinations.
- **Metrics:** Key performance indicators emitted (e.g., jobs processed, retry count, latency percentiles) and dashboard links.
- **Tracing:** How traces are exported and sampling configuration.
- **Alerts:** Pager or Slack channels notified, and alert thresholds.

## Failure Modes & Recovery

- Known error conditions and mitigation steps.
- Retry/backoff strategy for transient failures.
- Runbook links for manual intervention.

## Testing Strategy

- Unit, integration, and end-to-end test coverage expectations.
- Commands to run tests locally and in CI.
- How to create fixture data or mocks for external dependencies.

## Release Process

- Checklist for releasing changes, including migration steps or coordination with other teams.
- Rollback strategy and validation checks after deployment.

## Compliance & Security

- Data classifications handled by the worker (PII, PCI, etc.).
- Required security reviews or approvals.
- Access control notes, including least-privilege IAM policies.

## Change Log

| Date | Change | Author |
| --- | --- | --- |
| YYYY-MM-DD | Initial version | `<your-name>` |
