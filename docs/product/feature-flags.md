# Feature Flags

Roomsily ships new platform optimisations behind feature flags so that we can validate behaviour per environment, stage rollouts, and recover quickly if issues arise. Flags are stored in Supabase (`public.feature_flags`) and mirrored in code to guarantee typed access across the stack.

## Flag inventory

| Flag | Description | Development | Preview | Production |
| --- | --- | --- | --- | --- |
| `streamingSsr` | Streams suspense boundaries for data-heavy pages (documents, bookings) instead of waiting for the full payload. | ✅ | ✅ | ⛔ |
| `virtualizedLists` | Enables windowing for large client-side collections (e.g. document lists) to reduce DOM cost and improve scroll performance. | ✅ | ⛔ | ⛔ |

Defaults are declared in [`config/feature-flags.ts`](../../config/feature-flags.ts) and applied automatically whenever a Supabase override is not present.

## Rollout policy

1. **Develop in isolation** – implement the feature guarded by a typed flag and verify locally (`development`).
2. **Enable on preview** – once QA passes, flip the flag for the corresponding `preview` environment row in Supabase to expose the behaviour on Vercel preview deployments.
3. **Observe telemetry** – monitor Core Web Vitals, Supabase logs, and error tracking for at least one full day. If anything regresses, toggle the flag off immediately.
4. **Production launch** – update the `production` row when confidence is high. Document launch details (date, owner, metrics) in the table comment or in this changelog for traceability.

Flags should never be deleted without migrating existing rows and cleaning up the associated config entry to keep the type system in sync.

## Implementation guidelines

- Server components call `resolveFeatureFlags()` from [`lib/feature-flags.ts`](../../lib/feature-flags.ts) to merge Supabase overrides with environment defaults.
- `app/layout.tsx` injects a `FeatureFlagProvider`, enabling client components to consume flags via the `useFeatureFlag` hook.
- Optimisations such as streaming SSR and list virtualisation must render sensible fallbacks when flags are disabled so we can safely roll back.
- When adding a new flag, update this document, the config file, and create the corresponding Supabase migration so every environment has matching schema.

## Operations checklist

- [ ] Update Supabase rows for the target environments (remember unique keys are `(slug, environment)`).
- [ ] Announce rollout plans in the product channel with expected metrics to watch.
- [ ] Capture before/after performance snapshots (LCP, hydration time, memory footprint) to validate impact.
- [ ] Schedule a follow-up to remove stale flags or graduate them into defaults once they have been stable for a full release cycle.
