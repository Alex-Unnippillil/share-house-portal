# Incremental Static Regeneration Policies

## Overview

Roomsily mixes authenticated dashboards with marketing content. To keep the
platform responsive we standardize cache behavior via the shared definitions in
[`config/isr.ts`](../../config/isr.ts). The root layout exports the application
defaults so every route inherits a consistent baseline before applying
route-specific overrides.

- `DEFAULT_DYNAMIC = 'force-dynamic'`
- `DEFAULT_REVALIDATE = 0`

Any route that should opt into static generation **must** override the layout
defaults explicitly.

## Static policy surfaces

The policies at `/about`, `/privacy`, and `/terms` are fully static. Each route
exports `dynamic = 'error'` so accidental use of dynamic server APIs fails fast
at build time. The pages revalidate every 24 hours to allow content updates
without requiring a deploy.

```ts
export const dynamic = 'error'
export const revalidate = POLICY_PAGE_REVALIDATE_SECONDS // 24 hours
```

Mutations that touch policy copy should revalidate the `marketing:policies` tag
(from `ISR_TAGS.marketingPolicies`).

## Semi-static product marketing

The product explainer routes at `/payments`, `/messaging`, `/maintenance`, and
`/visitors` render static shells with interactive client components. They export
`dynamic = 'force-static'` plus an hourly `revalidate` window so edits flow to
production without a deploy flood.

```ts
export const dynamic = 'force-static'
export const revalidate = PRODUCT_MARKETING_REVALIDATE_SECONDS // 1 hour
```

When these pages begin to fetch CMS driven content, wrap the data loaders in
`fetch(..., { next: { tags: [ISR_TAGS.productMarketing] } })` (or
`unstable_cache`) and call `revalidateTag(ISR_TAGS.productMarketing)` from the
relevant server actions.

## Test coverage

`tests/isr-config.test.ts` enforces that:

- layout exports the global defaults
- policy routes continue to guard static rendering
- semi-static pages keep the hourly ISR contract

Run `pnpm test` before shipping caching changes so the configuration stays in
sync.
