# Runbook: Auth/RLS Incident

## Triggers

- Tenant reports unauthorized data access
- Spike in `AUTH_UNAUTHORIZED` errors
- Failed RLS policy checks during security smoke tests

## Immediate containment

1. Freeze affected feature rollout and disable suspect endpoints with feature flag if possible.
2. Restrict admin actions for impacted domain until blast radius is known.
3. Capture request IDs and affected tenant/unit IDs from structured logs.

## Investigation checklist

1. Validate Supabase RLS policies for impacted tables.
2. Inspect middleware/auth callback behavior for role propagation issues.
3. Confirm JWT claims and session context include expected tenant and role data.
4. Run targeted integrity query to detect cross-tenant records written during incident.

## Recovery

1. Patch policy or middleware error.
2. Backfill or remove unauthorized records.
3. Notify security and compliance contacts.
4. Run tenant-level access verification before declaring resolved.

## Exit criteria

- Security sign-off received.
- No cross-tenant access in validation tests.
- Incident postmortem and policy regression tests merged.
