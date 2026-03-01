# Semantic token exceptions

Use this file to document places where ad-hoc classes are intentionally retained.

## Approved exceptions

1. **Auth entry card typography (`app/page.tsx`)**

   - The root entry card uses local display sizing (`text-3xl`) for onboarding clarity while broader semantic tokenization is staged.
   - Reason: unauthenticated traffic now lands in a compact auth/onboarding decision UI where hierarchy must remain immediately scannable.

2. **Data-heavy payment and booking cards (`app/payments/page.tsx`, `app/bookings/page.tsx`)**
   - A subset of internals still uses utility text sizing pending component-by-component normalization.
   - Reason: these cards mix tabular values, metadata labels, and status text; conversion is staged to minimize regressions.

## Review cadence

- Revisit exceptions each sprint.
- Remove exceptions once semantic replacements are validated by visual baseline checks.
