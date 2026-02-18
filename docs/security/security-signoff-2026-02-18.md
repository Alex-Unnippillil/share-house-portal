# Security Sign-off Report — 2026-02-18

## Scope
This review re-validated:
1. RBAC route protection and Supabase RLS behavior for cross-tenant/cross-role access.
2. Stripe, Cal.com, and Documenso webhook signature validation and replay/idempotency behavior.
3. CSRF defenses, cookie security flags, and security headers.
4. Storage access controls for avatar/document uploads.

## Executive Decision
**Sign-off status: ❌ Not approved for production yet.**

The Stripe webhook and core RBAC/RLS scaffolding are in place, but there are critical/high control gaps in Cal.com webhook hardening, Documenso webhook coverage, CSRF enforcement, and storage policy explicitness.

## Control-by-Control Validation

### 1) RBAC route protection + Supabase RLS
- **Route middleware:** authenticated routes are enforced and role-gated rules exist for `/dashboard/members` (manager/admin only). This is a positive control for route-level RBAC. 
- **RLS hardening migration:** helper functions and scoped policies are implemented across core tables (`documents`, `rent_payments`, `maintenance_requests`, `visitor_logs`, etc.).
- **RLS verification script:** includes both positive and negative checks for cross-unit read denials and admin override.

**Assessment:** ✅ **Pass (with residual risk)** — controls exist and are testable, but rely on running SQL verification regularly in CI/staging.

### 2) Webhook signature validation + replay/idempotency
- **Stripe webhook:** signature verification uses Stripe SDK `constructEvent`; replay protection persists `(provider,event_id)` in `webhook_events` with unique constraint; duplicate events return success without reprocessing.
- **Cal.com webhook:** supports HMAC verification, but currently allows all payloads when `CALCOM_WEBHOOK_SECRET` is unset.
- **Documenso webhook:** no inbound webhook route detected in `app/api`; no signature-validation or idempotency pathway currently implemented for Documenso event callbacks.

**Assessment:** ⚠️ **Partial** — Stripe is strong; Cal.com and Documenso controls are incomplete.

### 3) CSRF, secure cookies, and sensitive headers
- **Sensitive headers:** security headers are configured globally (`CSP`, `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, etc.).
- **CSRF:** no centralized CSRF token/origin enforcement found for mutating API handlers.
- **Cookies:** auth cookies are managed via Supabase SSR integration, but this review found no app-level explicit CSRF countermeasure for authenticated state-changing endpoints.

**Assessment:** ⚠️ **Partial** — header baseline is present; CSRF control posture is insufficiently explicit.

### 4) Storage access controls (avatars, lease docs, private uploads)
- Upload paths and signed URL generation for avatars/personal-documents/documents are implemented through Supabase storage.
- Repository migrations do not currently define explicit `storage.objects` RLS policies or bucket bootstrap SQL for these buckets, making effective access control dependent on out-of-band/project-console configuration.

**Assessment:** ⚠️ **Partial** — implementation expects private bucket usage but lacks codified, auditable storage policy definitions in-repo.

## Severity-ranked Findings & Remediation Ownership

| ID | Severity | Finding | Evidence | Remediation Owner | Recommended Remediation |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | **Critical** | Cal.com webhook accepts requests when secret is not configured (`verifyWebhookSignature` returns `true` on missing secret). | `app/api/calcom/webhook/route.ts` | Backend Platform | Fail closed: if `CALCOM_WEBHOOK_SECRET` missing, return 500 and alert; require signature for all non-local envs. |
| SEC-002 | **High** | No Documenso inbound webhook endpoint/signature verification/idempotency path for callback-driven state sync. | `app/api` route inventory + `lib/documenso.ts` usage only for outbound calls | Integrations Team (Documents) | Add `/api/documenso/webhook` with signed-payload verification + replay table (`provider,event_id`) and deterministic upserts. |
| SEC-003 | **High** | No explicit CSRF validation middleware/token checks on mutating API routes. | Example mutating endpoint: `app/api/visitors/route.ts` (`POST`) without origin/CSRF checks | App Security + Backend Platform | Implement CSRF middleware (double-submit or synchronizer token) and strict Origin/Referer validation for cookie-authenticated mutations. |
| SEC-004 | **Medium** | Storage bucket/object policies for `avatars`, `personal-documents`, and lease docs are not codified in migrations. | Upload/sign URL flows in app code; no `storage.objects` policies in migrations | Data Platform / Supabase Owners | Add migration-managed bucket creation + `storage.objects` RLS policies scoped by authenticated user/unit/role. |
| SEC-005 | **Low** | CSP currently includes permissive directives (`connect-src *`, `img-src *`, `unsafe-inline`, `unsafe-eval`). | `next.config.js` security headers | Frontend Platform | Tighten CSP by environment and remove wildcard/eval where feasible; add CSP report-only rollout then enforce. |

## Positive Controls Confirmed
- Stripe webhook signature verification and idempotent event processing with unique replay key table are implemented.
- RBAC middleware + Supabase RLS helper functions/policies exist for core multi-tenant entities.
- Security header baseline is configured globally in Next.js.

## Target Remediation Plan
- **P0 (24-48h):** SEC-001.
- **P1 (this sprint):** SEC-002, SEC-003.
- **P2 (next sprint):** SEC-004.
- **P3 (hardening backlog):** SEC-005.

## Exit Criteria for Production Security Sign-off
1. Cal.com webhook fails closed on missing secret and has automated tests for invalid signature + replay.
2. Documenso webhook endpoint deployed with signature verification and replay idempotency table.
3. CSRF protections applied to all cookie-authenticated mutating endpoints and covered by tests.
4. Storage bucket/object policies committed as migrations and validated in staging.
5. Security regression job executes RLS verification SQL plus webhook replay tests in CI.
