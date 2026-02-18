# Accessibility & Performance Launch Audit Checklist

## Accessibility Audit Scope

- Keyboard navigation: verified that primary journey pages expose focusable controls immediately after first `Tab` interaction.
- Screen reader semantics: verified `main` landmark and top-level heading visibility on bookings journey.
- Navigation discoverability: ensured links to payments, documents, bookings, and messaging are present and visible from tenant entry point.

Run:

```bash
pnpm test:a11y
```

## Performance Pre-Signoff Scope

- CSS payload guardrail via `scripts/check-css-size.mjs` (`pnpm css:purge`).
- Suspense loading skeleton regression test coverage (`tests/performance/suspense-skeletons.test.tsx`).
- API cache behavior checks for stable conditional requests (`tests/api-cache.test.ts`).

Run:

```bash
pnpm test:perf
pnpm test:unit
```

## Final Launch Gate

- [ ] Unit + integration suite passes.
- [ ] Playwright tenant/manager journey checks pass in staging.
- [ ] Any staging-only accessibility findings captured and triaged.
- [ ] CSS payload remains within current budget.
