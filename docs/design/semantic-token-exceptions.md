# Semantic token exceptions

Use this file to document places where ad-hoc classes are intentionally retained.

## Approved exceptions

1. **Marketing hero display scale (`app/page.tsx`)**

   - The top hero intentionally uses `text-display-xl` and retains bespoke utility classes for decorative layout behavior (`text-balance`, custom gradients, shadows).
   - Reason: this is the visual identity moment for unauthenticated traffic and needs tighter art direction than product interior pages.

2. **Dense stat chips and over-image overlays (`app/page.tsx`)**

   - Some compact labels remain utility-first (`text-xs`, `text-sm`) around icon chips and image overlays.
   - Reason: these UI atoms are density-constrained and do not map 1:1 to reusable document/body typography semantics.

3. **Data-heavy payment and booking cards (`app/payments/page.tsx`, `app/bookings/page.tsx`)**
   - A subset of internals still uses utility text sizing pending component-by-component normalization.
   - Reason: these cards mix tabular values, metadata labels, and status text; conversion is staged to minimize regressions.

## Review cadence

- Revisit exceptions each sprint.
- Remove exceptions once semantic replacements are validated by visual baseline checks.
