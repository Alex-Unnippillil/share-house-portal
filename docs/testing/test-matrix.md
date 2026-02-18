# Launch Test Matrix

This matrix defines launch-signoff coverage for roommate onboarding, payments, maintenance, amenity bookings, overnight visitors, and messaging.

| Area | Critical user outcomes | Unit tests (Vitest + Testing Library) | Integration tests (API/services) | E2E coverage (Playwright) | Accessibility + Performance checks |
| --- | --- | --- | --- | --- | --- |
| Onboarding | Tenant can understand progress and complete profile setup | `tests/components/onboarding-progress.test.tsx` validates step highlights and link integrity. | N/A (UI-only progress indicator in current scope). | `e2e/tenant-manager-journeys.spec.ts` validates journey discoverability from landing nav. | Keyboard tab-start and landmark checks in Playwright (`keyboard`, `screen-reader` tests). |
| Payments | Rent payment webhooks persist receipts and trigger tenant comms | Existing payment domain tests in `tests/payments-status.test.ts` and `tests/catch-up.test.ts`. | `tests/integration/api/stripe-webhook.test.ts` validates Stripe webhook handling, Supabase writes, and notification fanout. | Tenant nav discovery includes Payments entry point. | API error assertions + smoke checks under `pnpm test:unit`; performance budget includes `pnpm css:purge`. |
| Maintenance | Tenant can submit maintenance requests and managers can triage | State handling test in `tests/components/sidebar-provider.test.tsx` (client state persistence pattern used across forms). | Existing server utility tests plus webhook/API route tests. | `/maintenance` manager journey visibility check in Playwright. | Keyboard focus assertions exercise actionable controls on `/maintenance`. |
| Bookings | Tenant can reserve amenities with conflict-safe event type selection | Booking logic path verified via service behavior tests. | `tests/integration/services/calcom-service.test.ts` mocks Cal.com payloads and validates booking payload shape + no-slot fallback messaging. | `/bookings` journey path and visible booking prompts in Playwright. | Landmark + heading checks in booking journey; CSS size guard in perf script. |
| Visitor logging | Tenant can submit overnight guest request and inform stakeholders | Form workflow state conventions covered by provider/state tests. | Existing API test suite + service-level mock contracts. | `/visitors` journey includes visible visitor-booking workflow assertions. | Keyboard tab test ensures actionability for visitor flow page. |
| Messaging | Tenants/managers can reach collaboration threads | Existing suspense skeleton tests in `tests/performance/suspense-skeletons.test.tsx`. | Existing API/cache tests for threaded data freshness signals. | `/messaging` included in keyboard and nav discovery flows. | Screen-reader landmark and heading expectations reduce semantic regressions. |

## Execution Order for Release Sign-off

1. `pnpm test:unit`
2. `pnpm test:e2e`
3. `pnpm test:a11y`
4. `pnpm test:perf`

## Risk Notes

- External providers (Stripe, Cal.com, Documenso) remain mock-validated in CI; staging smoke tests should still run against sandbox credentials before production cutover.
- Playwright tests assume app routes are available at `PLAYWRIGHT_BASE_URL` and require the app server to be running.
