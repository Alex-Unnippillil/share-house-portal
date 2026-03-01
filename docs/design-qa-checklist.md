# Design QA Checklist: Spacing & Layout

Use this checklist before merging UI changes that touch the auth entry route, dashboard routes, or settings forms.

## Spacing Tokens

- [ ] Horizontal spacing uses `dashboard-x` scale (`px-dashboard-x`, `sm:px-dashboard-x-sm`, `lg:px-dashboard-x-lg`) through shared layout primitives.
- [ ] Route-level vertical rhythm uses `dashboard-y` for page shells and `section` for section stacks.
- [ ] Card grids and card stacks use `card-gap` (`gap-card-gap`, `space-y-card-gap`) rather than ad-hoc values.
- [ ] Pages avoid mixed spacing systems (for example, no `space-y-6` alongside section primitives in the same route).

## Container Width & Readability

- [ ] Route containers use a canonical primitive (`ContentContainer`) with explicit width intent (`default`, `wide`, `readable`).
- [ ] Text-heavy panels (policy summaries, settings pages, long-form copy) are constrained with `route-readable` or `width="readable"`.
- [ ] Dense operational dashboards use `width="wide"` with internal readable sections where needed.
- [ ] Auth entry card and shell spacing remain aligned with shared layout primitives.

## Breakpoint Behavior

- [ ] Mobile (`<640px`): no horizontal overflow and section/card spacing remains legible.
- [ ] Tablet (`>=640px`): `dashboard-x-sm` gutters apply and grid transitions remain balanced.
- [ ] Desktop (`>=1024px`): `dashboard-x-lg` gutters apply and max-width constraints preserve readability.
- [ ] Sticky headers and shell wrappers preserve spacing when navigating between auth entry and dashboard routes.

## Regression Spot Checks

- [ ] Root layout shell renders correctly with global providers and suspense boundaries.
- [ ] Auth entry route preserves consistent vertical rhythm between heading, description, and CTA groups.
- [ ] Dashboard home and at least one operational subpage show consistent section/card spacing.
- [ ] Account/settings forms maintain readable line length and spacing between heading, separator, and form blocks.
