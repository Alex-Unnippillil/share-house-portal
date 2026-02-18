# Runbook: Auth/RLS Incident

## Triggers

- Tenant reports unauthorized data access
- `auth_failures_total` > 3x baseline and >= 25 failures in 10 minutes
- Spike in `AUTH_UNAUTHORIZED` errors
- Failed RLS policy checks during security smoke tests

## Metric interpretation

- Broad auth-failure spikes across routes may indicate auth-provider outage or token signing issue.
- Route-specific spikes often indicate middleware regressions or role propagation bugs.
- Elevated auth failures paired with moderation spikes can suggest coordinated abuse attempts.

## Immediate containment

1. Freeze affected feature rollout and disable suspect endpoints with feature flag if possible.
2. Restrict admin actions for impacted domain until blast radius is known.
3. Capture `correlationId`, request IDs, and affected tenant/unit IDs from structured logs.

## Investigation checklist

1. Validate Supabase RLS policies for impacted tables.
2. Inspect middleware/auth callback behavior for role propagation issues.
3. Confirm JWT claims and session context include expected tenant and role data.
4. Run targeted integrity query to detect cross-tenant records written during incident.

## First-response mitigation

1. Force session refresh for impacted users and revoke suspicious sessions.
2. Temporarily tighten RLS with deny-by-default fallback on affected tables.
3. Add WAF/rate limits if failure spike is abuse-related.

## Recovery

1. Patch policy or middleware error.
2. Backfill or remove unauthorized records.
3. Notify security and compliance contacts.
4. Run tenant-level access verification before declaring resolved.

## Exit criteria

- Security sign-off received.
- No cross-tenant access in validation tests.
- `auth_failures_total` returns to baseline trend.
- Incident postmortem and policy regression tests merged.
