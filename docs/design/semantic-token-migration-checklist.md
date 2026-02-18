# Semantic token migration checklist

This checklist maps ad-hoc typography/spacing classes to semantic tokens defined in `docs/design/system-foundations.md` and tracks rollout on high-traffic routes.

## Class mapping matrix

| Area                                | Current ad-hoc classes                                   | Semantic token class target           | Notes                                                       |
| ----------------------------------- | -------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| Primary page titles                 | `text-3xl`, `sm:text-4xl`, `font-bold`, `tracking-tight` | `text-display-lg`                     | Standardized through `PageTitle`.                           |
| Hero display title (marketing only) | `text-4xl`, `sm:text-5xl`, `lg:text-6xl`                 | `text-display-xl`                     | Keep as the one display-only exception tier.                |
| Section titles                      | `text-xl`, `text-2xl`, `font-semibold`                   | `text-heading-sm` / `text-heading-md` | Selected per information density.                           |
| Long-form lead copy                 | `text-base`, `sm:text-lg`                                | `text-body-lg`                        | Applied through `PageDescription`.                          |
| Supporting body copy                | `text-sm`, `text-base`                                   | `text-body-sm` / `text-body-md`       | Keep compact cards at `text-body-sm`.                       |
| Metadata labels                     | `text-xs uppercase`                                      | `text-label-sm`                       | Preserve uppercase where the UI currently signals metadata. |
| Page vertical rhythm                | `space-y-8`, `space-y-10`, `py-8`, `py-12`               | `space-y-section`, `py-section`       | Standardized through `PageContainer`.                       |
| Card/section stacking               | `gap-4`, `space-y-4`, `space-y-6`                        | `gap-card-gap`, `space-y-stack-*`     | Migrated in dashboard shell and new page sections.          |

## High-traffic rollout plan

| Route                                | Priority | Status      | Remaining work                                                                                                              |
| ------------------------------------ | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx`                       | P0       | In progress | Continue converting small utility text (`text-xs`, `text-sm`) in hero badges and timeline items where semantics stay clear. |
| `app/dashboard/(dashboard)/page.tsx` | P0       | Completed   | Grid and stack spacing now use semantic spacing tokens.                                                                     |
| `app/payments/page.tsx`              | P0       | In progress | Remaining local card internals can be migrated incrementally to `text-body-*` and `text-label-sm`.                          |
| `app/bookings/page.tsx`              | P0       | In progress | Amenity card title/description sizes should be normalized to `text-heading-sm` + `text-body-sm` in a follow-up.             |
| `app/messaging/page.tsx`             | P0       | Completed   | Header typography/spacing now standardized with shared primitives.                                                          |

## Execution checklist

- [x] Build shared page primitives (`PageContainer`, `PageHeader`, `PageTitle`, `PageDescription`, `PageSection`).
- [x] Adopt shared primitives in priority routes where safe.
- [x] Add a visual regression checkpoint page for typography hierarchy.
- [x] Add Playwright screenshot baseline test for checkpoint route.
- [x] Record intentional exceptions in `docs/design/semantic-token-exceptions.md`.
- [ ] Sweep non-priority routes (`documents`, `visitors`, `maintenance`) using the same mapping table.
