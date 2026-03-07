# Security Advisor Remediation Task Stubs

## Context
Supabase Security Advisor currently reports the following production issues:

1. `Security Definer View` on `public.amenity_bookings`
2. `RLS Disabled in Public` on `public.floorplan_annotations`
3. `RLS Disabled in Public` on `public.data_integrity_findings`

This document breaks each issue into implementation-ready task stubs so engineering, QA, and operations can track remediation work clearly.

---

## Task Stub 1 — Convert `public.amenity_bookings` to caller-context view

**Issue**: Security Advisor flags `public.amenity_bookings` as a security definer view, which can evaluate with elevated privileges.

### Objective
Run the compatibility view with the caller's permissions and preserve read compatibility for existing consumers.

### Implementation tasks
- [ ] Add migration to set `security_invoker = true` on `public.amenity_bookings`.
- [ ] Confirm all app-side read paths rely on `public.bookings` as canonical write target and use `amenity_bookings` only for compatibility reads.
- [ ] Validate role behavior (`anon`, `authenticated tenant`, `manager`, `service_role`) against the updated view.
- [ ] Re-run Supabase Security Advisor and confirm the `Security Definer View` error clears.

### Acceptance criteria
- [ ] `public.amenity_bookings` uses caller context (security invoker) after migration.
- [ ] No regressions in booking history/analytics queries.
- [ ] Security Advisor no longer reports this view-level error.

### Owner / effort
- **Suggested owner**: Backend platform engineer
- **Estimate**: 0.5 day

---

## Task Stub 2 — Enable and enforce RLS on `public.floorplan_annotations`

**Issue**: `public.floorplan_annotations` is in public schema with RLS disabled.

### Objective
Protect roommate-specific floorplan overlays so access is limited to in-unit participants and authorized managers/admins.

### Implementation tasks
- [ ] Enable RLS on `public.floorplan_annotations`.
- [ ] Add `SELECT` policy to allow:
  - assigned unit access via `public.can_access_unit(...)`
  - plus annotation visibility checks (`profile_id IS NULL`, own profile, or manager/admin role).
- [ ] Add `INSERT` policy requiring scoped unit access and ownership/manager-admin write authority.
- [ ] Add `UPDATE`/`DELETE` policies restricting edits to creator or manager/admin in scope.
- [ ] Execute RBAC verification tests for tenant, roommate, property manager, and admin personas.
- [ ] Confirm dashboard floorplan overlay experience still works for expected roles.

### Acceptance criteria
- [ ] Unauthorized users cannot read or mutate roommate annotations.
- [ ] Scoped roommates can read allowed overlays.
- [ ] Managers/admins retain moderation/override access.
- [ ] Security Advisor no longer reports RLS disabled for this table.

### Owner / effort
- **Suggested owner**: Backend + app feature pair
- **Estimate**: 1 day

---

## Task Stub 3 — Enable and enforce RLS on `public.data_integrity_findings`

**Issue**: `public.data_integrity_findings` has RLS disabled and may expose sensitive operational findings.

### Objective
Limit finding visibility to operational roles and keep write privileges scoped to service-side automation.

### Implementation tasks
- [ ] Enable RLS on `public.data_integrity_findings`.
- [ ] Add `SELECT` policy for `property_manager` and `admin` roles.
- [ ] Add service-role policy for insert/update/delete lifecycle operations.
- [ ] Validate ops endpoints that surface integrity findings still return expected results for authorized users.
- [ ] Confirm unauthenticated and tenant/roommate roles cannot query findings.

### Acceptance criteria
- [ ] Only authorized operations roles can view findings.
- [ ] Service-side reconciliation jobs retain full write access.
- [ ] Security Advisor no longer reports RLS disabled for this table.

### Owner / effort
- **Suggested owner**: Operations backend engineer
- **Estimate**: 0.5 day

---

## Cross-cutting validation checklist

- [ ] Run database migration in staging.
- [ ] Run SQL verification script for RLS + policy coverage.
- [ ] Re-run Security Advisor (`Errors` tab should show 0 for the three items above).
- [ ] Record before/after screenshots in release notes.
- [ ] Add migration reference to launch-readiness tracker.

## Suggested rollout sequence
1. Deploy migration to staging.
2. Validate role behavior and feature smoke tests.
3. Re-run advisor and save evidence.
4. Deploy to production in low-traffic window.
5. Re-run advisor post-release and attach final sign-off.
