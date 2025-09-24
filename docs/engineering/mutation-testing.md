# Mutation Testing Strategy

This project uses [Stryker](https://stryker-mutator.io/) to mutation test critical TypeScript logic under the `lib/` folder. The configuration focuses on core data, payments, and utility helpers that are exercised by our Vitest suites.

## Scope

The current `mutate` patterns cover:

- `lib/data/**/*.ts` (document and member data access helpers)
- `lib/payments/catch-up.ts`, `lib/payments/status.ts`, and `lib/payments/currency.ts`
- `lib/utils.ts`

These modules were selected because they contain business logic that directly influences API behaviour and payment flows. Supporting files such as mock data, schema definitions, and integrations are excluded until they gain dedicated tests.

## Running Locally

```bash
pnpm install
pnpm test        # run Vitest unit tests
CI=1 pnpm test:mutation
```

`CI=1` disables progress output so that runs remain readable in terminals.

The configured thresholds will fail the run if the total mutation score drops below **60**. The most recent improvements raised the score to ~72% by hardening data and utility tests.

## Test Improvements

- Extended `tests/lib/data/*.test.ts` to assert Supabase query building and empty-state handling, eliminating surviving mutants in document/member queries.
- Added `tests/lib/utils.test.ts` to exercise cache signatures, fetcher behaviours (304 reuse, error handling), formatting helpers, and async utilities.
- Ensured property manager roles skip tenant scoping in statistics calculations and that cache fallbacks use ISO timestamps.

When adding new logic inside the scoped files, write or update Vitest tests so that Stryker mutants are killed instead of relying on configuration exclusions.
