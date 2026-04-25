# E2E Failure Triage Map

This guide maps critical Playwright scenarios to their ownership modules so on-call engineers can triage CI failures quickly.

## Scenario ownership matrix

| E2E scenario | Primary spec | Owning module(s) | Key implementation path(s) |
| --- | --- | --- | --- |
| Onboarding completion | `e2e/tenant-critical-flows.spec.ts` (`onboarding completion surfaces all required steps`) | Onboarding UX + onboarding data loaders | `app/onboarding/page.tsx`, `app/onboarding/onboarding-client.tsx`, `app/onboarding/loaders.ts` |
| Stripe checkout success return path | `e2e/tenant-critical-flows.spec.ts` (`successful Stripe checkout return path lands on payments summary`) | Payments experience + Stripe checkout API | `app/payments/page.tsx`, `app/payments/_components/stripe-actions.tsx`, `app/api/stripe/checkout/route.ts` |
| Failed payment recovery flow | `e2e/tenant-critical-flows.spec.ts` (`failed payment recovery flow supports retry after checkout failure`) | Payments retry UX + checkout integration resilience | `app/payments/_components/stripe-actions.tsx`, `app/api/stripe/checkout/route.ts`, `lib/resilience.ts` |
| Amenity booking conflict handling | `e2e/tenant-critical-flows.spec.ts` (`amenity booking conflict handling blocks overlapping reservations`) | Bookings policy + conflict validation API | `app/bookings/components/amenity-booking-form.tsx`, `app/api/bookings/validate/route.ts`, `lib/bookings/policy.ts` |
| Overnight visitor policy limit enforcement | `e2e/tenant-critical-flows.spec.ts` (`overnight visitor policy limit enforcement returns deterministic violations`) | Visitors policy + visitor request API | `components/visitors/visitor-booking-form.tsx`, `app/api/visitors/route.ts`, `lib/visitors.ts` |

## Deterministic fixture ownership

| Fixture/mocks area | Path | Purpose |
| --- | --- | --- |
| Deterministic Supabase browser mocks | `e2e/fixtures/deterministic-backends.ts` (`mockSupabaseBrowserRoutes`) | Keeps visitor flow stable by mocking auth + profile lookups from browser Supabase SDK requests in CI. |
| Deterministic webhook fixtures | `e2e/fixtures/deterministic-backends.ts` (`stripeWebhookFixture`, `calcomWebhookFixture`, `mockWebhookAcks`) | Provides stable Stripe/Cal.com webhook payload fixtures and deterministic API acknowledgements for test isolation. |
| Deterministic test clock | `e2e/fixtures/deterministic-backends.ts` (`installDeterministicClock`) | Removes timing drift and date-based flakiness in date pickers, relative-time UI, and webhook payload assertions. |

## Triage checklist

1. Confirm whether the failure is in smoke (`@smoke`) or full matrix (browser-specific) execution.
2. Re-run the failing test locally with trace enabled:
   - `pnpm exec playwright test e2e/tenant-critical-flows.spec.ts --project=<browser> --grep "<scenario text>"`
3. Inspect route mocks and fixture responses first (`e2e/fixtures/deterministic-backends.ts`) before blaming feature code.
4. If only one browser fails in nightly/main matrix, prioritize layout/selectors and browser-compatibility checks.
5. If all browsers fail, inspect the owning API/module paths in the ownership matrix and recent merges touching those paths.
