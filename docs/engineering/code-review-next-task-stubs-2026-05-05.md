# Code Review and Next Task Stubs (May 5, 2026)

## Executive Summary

This review found strong breadth across product surface area (payments, bookings, visitors, messaging, docs, dashboards) and a good baseline in tests and operational runbooks. The highest-impact opportunities now are:

1. tighten RBAC coverage beyond `/dashboard/members`,
2. remove/reshape non-goal marketing content routes, and
3. harden data consistency and observability around external-provider flows.

The sections below include prioritized task stubs with concrete scope, dependencies, and acceptance criteria.

---

## What is Working Well

- **Auth-first root flow** is implemented cleanly and redirects authenticated users directly to `/dashboard`.  
- **Middleware role resolution** is present with profile fallback and route-level gating hooks.  
- **Stripe webhook route** includes duplicate-event handling, retry-oriented resilience primitives, and triage/dead-letter concepts.  
- **Testing baseline** already spans unit + integration + e2e and documents launch order clearly.  
- **Design system conventions** are clearly leaning on shared primitives and predictable layout components.

---

## Key Gaps and Risks Identified

### 1) RBAC route policy is under-scoped
Current route rules explicitly protect only `/dashboard/members`, while many high-risk domains (payments reconciliation/export, moderation, operations dashboards) are not listed in central role-route rules. This creates drift risk where privileged routes depend on ad hoc checks.

### 2) Product non-goal drift (marketing-oriented surfaces)
The product spec excludes marketing/landing pages beyond essential login/onboarding. Yet there are broad public-facing/about-company style pages and persona-rich landing content patterns in the repo that appear out of scope and increase maintenance/test burden.

### 3) Middleware matcher excludes all `/api/*`
The global middleware intentionally skips API routes. While many APIs may validate auth internally, this increases the chance of inconsistent authorization implementation and elevates security regression risk over time.

### 4) Dashboard render strategy may overuse dynamic SSR
Primary dashboard page is `force-dynamic`, which can be appropriate for realtime signals, but without explicit segment-level caching/partial static strategy it may increase infra costs and TTFB under load.

### 5) Test matrix has partial traceability per feature vertical
The matrix is strong, but several entries are intentionally indirect ("state conventions" / "visibility checks") rather than domain-specific scenario tests for policy boundaries and unhappy paths.

---

## Detailed Task Stubs (Prioritized)

## P0 — Security & Authorization

### STUB-001: Centralize and Expand RBAC Route Policy Coverage
- **Problem:** Route-level authorization rules are narrowly scoped.
- **Scope:**
  - Expand `ROLE_ROUTE_RULES` to include all privileged route families:
    - `/dashboard/operations/*`
    - `/api/exports/*`
    - `/api/payments/reconciliation/*`
    - moderation/admin operations surfaces.
  - Add an explicit route-role matrix artifact and unit tests that lock policy behavior.
- **Deliverables:**
  - Updated `lib/auth-rbac.ts` rules.
  - New `tests/auth-rbac-route-matrix.test.ts` with role-by-route assertions.
  - Security doc update linking policy source-of-truth.
- **Acceptance criteria:**
  - Non-privileged roles denied on protected routes.
  - Admin/property manager flows remain functional.
  - CI fails on unauthorized matrix regressions.
- **Dependencies:** none.

### STUB-002: API Authorization Consistency Audit + Guardrail Harness
- **Problem:** `/api/*` bypasses middleware; auth correctness relies on per-handler implementation.
- **Scope:**
  - Inventory every `app/api/**/route.ts` auth mode: public, authenticated, elevated-role.
  - Add a lightweight test harness that ensures each non-public API route invokes one approved auth guard path.
  - Add docs table mapping endpoint → auth requirement.
- **Deliverables:**
  - `docs/security/api-authz-matrix.md`.
  - Integration tests for unauthorized/forbidden cases on critical endpoints.
- **Acceptance criteria:**
  - Every non-public API endpoint has explicit guard coverage.
  - Unauthorized and wrong-role responses are deterministic.
- **Dependencies:** STUB-001 recommended first.

## P1 — Product Scope & UX Coherence

### STUB-003: Remove/Refactor Out-of-Scope Marketing Content
- **Problem:** Company-marketing style pages conflict with non-goals.
- **Scope:**
  - Replace broad marketing/about-company copy with support/help/legal context tied to tenant workflows.
  - Keep only essential public routes for auth/onboarding/support.
  - Remove dead persona/marketing section code paths if unused.
- **Deliverables:**
  - Route/content refactor PR.
  - Updated nav/public-route definitions and tests.
- **Acceptance criteria:**
  - Public unauthenticated surface is minimal and product-relevant.
  - No broken links from root/auth flows.
- **Dependencies:** none.

### STUB-004: Tenant Journey Quality Pass (Mobile-first)
- **Problem:** Feature breadth exists, but experience consistency likely varies across flows.
- **Scope:**
  - Perform structured UX QA on onboarding, payments, bookings, visitors, messaging with mobile viewport baselines.
  - Patch component-level inconsistencies (labels, status badges, empty/error states, focus order).
- **Deliverables:**
  - QA checklist results doc.
  - Follow-up fixes in shared primitives where possible.
- **Acceptance criteria:**
  - All core journeys meet baseline a11y semantics and consistent status language.
- **Dependencies:** STUB-003 (optional).

## P1 — Reliability, Observability, and Data Integrity

### STUB-005: External Webhook Replay + Dead-letter Runbook Test Kit
- **Problem:** Webhook code has resilient primitives, but operational confidence requires deterministic replay/testing tooling.
- **Scope:**
  - Add scripts/test fixtures to replay Stripe/Cal.com/Documenso webhook payloads into local/staging.
  - Verify dedupe, triage queue behavior, and alert hooks.
- **Deliverables:**
  - Replay CLI scripts and fixture payloads.
  - Runbook additions with expected outcomes and SQL sanity checks.
- **Acceptance criteria:**
  - Repeatable replay validates idempotency and failure-path observability.
- **Dependencies:** STUB-002 helpful.

### STUB-006: Supabase RLS Regression Pack Expansion
- **Problem:** RLS tests exist but should track newly added tables/routes and cross-unit tenancy boundaries.
- **Scope:**
  - Extend SQL tests to include documents, bookings conflicts, visitor logs, and messaging moderation scopes.
  - Add "negative tenant" access assertions.
- **Deliverables:**
  - Expanded `supabase/tests/*` coverage.
  - CI command for RLS regression execution.
- **Acceptance criteria:**
  - Cross-tenant read/write attempts fail by default.
  - Manager/admin exception paths documented and verified.
- **Dependencies:** none.

## P2 — Performance & Maintainability

### STUB-007: Dashboard Data-Fetching Strategy Optimization
- **Problem:** `force-dynamic` dashboard may over-fetch and reduce cache leverage.
- **Scope:**
  - Profile data fetch waterfalls in dashboard cards.
  - Introduce segment-level caching/revalidation where realtime is not required.
  - Keep realtime widgets dynamic while static-ish widgets adopt bounded revalidation.
- **Deliverables:**
  - Perf profile report before/after.
  - selective caching/revalidate patches.
- **Acceptance criteria:**
  - Reduced dashboard TTFB and backend query load without stale critical data.
- **Dependencies:** none.

### STUB-008: Domain Module Boundaries Cleanup
- **Problem:** Utility and domain logic is broad; boundaries can be sharpened to reduce coupling.
- **Scope:**
  - Consolidate domain modules by vertical (`payments`, `bookings`, `documents`, `visitors`, `messaging`).
  - Standardize validation and error contracts per domain.
- **Deliverables:**
  - Refactor plan ADR + incremental module moves.
- **Acceptance criteria:**
  - Cleaner ownership map and reduced cross-domain imports.
- **Dependencies:** none.

---

## Suggested Execution Sequence (6-Week Cadence)

1. **Week 1–2:** STUB-001, STUB-002 (security baseline hardening).
2. **Week 2–3:** STUB-003, STUB-004 (scope alignment + journey quality).
3. **Week 3–4:** STUB-005, STUB-006 (operational reliability + tenancy protections).
4. **Week 5–6:** STUB-007, STUB-008 (performance and maintainability uplift).

---

## Success Metrics to Track

- Authorization regression rate (should trend to zero after route-matrix enforcement).
- Unauthorized API access test pass rate (target 100% on protected endpoints).
- Dashboard p95 TTFB and query count per page load.
- Webhook failure triage MTTR.
- Cross-tenant access violation count from RLS regression suite.

