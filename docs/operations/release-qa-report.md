# Release QA Report — RC Candidate

- **Release branch**: `release/rc-YYYYMMDD` (freeze policy documented in `docs/testing/release-candidate-regression-plan.md`)
- **Report owner**: Engineering QA
- **Generated on**: 2026-02-18

## Scope
This report covers tenant, property manager, and admin regression paths plus integration contract regression checks for Stripe, Cal.com, and Documenso.

## Automated Evidence

| Gate | Command | Result | Evidence |
| --- | --- | --- | --- |
| Lint | `pnpm lint` | ✅ Pass | Local run output captured in PR notes. |
| Typecheck | `pnpm typecheck` | ✅ Pass | Local run output captured in PR notes. |
| Unit + Integration | `pnpm test:unit` | ✅ Pass | Includes Stripe/Cal.com/Documenso contract regression assertions. |
| E2E Regression | `pnpm test:e2e` | ⚠️ Blocked locally (server required) | CI gate is configured as blocking and runs with Playwright browsers installed. |
| Build | `pnpm build` | ✅ Pass | Production build succeeds. |

## Mandatory Regression Paths by Role

| Role | Mandatory paths | Result |
| --- | --- | --- |
| Tenant | Payments, booking validation, visitors, messaging/documents discovery | ✅ Covered by `tenant-manager-journeys` + `release-regression-negative` automation. |
| Property manager | Maintenance, visitor oversight, booking conflict controls, exports | ✅ Covered by existing manager journey smoke + unauthorized export blocking tests. |
| Admin | Operations visibility, privileged route gating, export and reconciliation protections | ✅ Covered by RBAC/unit tests and unauthorized API rejection checks. |

## Negative Case Verification
- **Payment failure path**: webhook contract test validates `invoice.payment_failed` payload handling.
- **Booking conflict path**: E2E negative validates invalid booking windows are rejected.
- **Unauthorized access path**: E2E negative validates finance export endpoint returns `401` when unauthenticated.

## Go/No-Go Recommendation

**Recommendation: GO (conditional on CI E2E green in release branch).**

Rationale:
1. Unit/integration/build gates are passing with new regression coverage.
2. CI now blocks merges on lint, typecheck, unit/integration, E2E, and production build checks.
3. Remaining risk is environment-specific Playwright execution, which is enforced in CI and must remain green before final promotion.
