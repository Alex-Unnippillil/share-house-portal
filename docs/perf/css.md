# CSS Runtime Styling Migration

## Inventory Summary
- No runtime CSS-in-JS packages (styled-components, Emotion, etc.) are listed in `package.json`. Existing `@emotion/*` utilities only arrive transitively via third-party libraries.
- Runtime `style` props were concentrated in:
  - UI components with gradients or transforms (`components/ui/infinite-moving-cards.tsx`, `components/ui/3d-cards.tsx`, `components/ui/progress.tsx`).
  - Auth and account surfaces that sized media dynamically (`app/onboarding/page.tsx`, `app/account/avatar.tsx`).
  - Feature modal styling inside the 3D prism experience (`components/feature-prism.tsx`).
  - Email markup (`components/emails/payment-receipt.tsx`), which must preserve inline CSS for client compatibility.
  - A DayPicker form that previously injected ad-hoc `<style>` tags (`components/schedule-form.tsx`).

## Migration Actions
- Replaced gradient and perspective `style` attributes with Tailwind utility classes and arbitrary values.
- Removed the temporary DayPicker `<style>` injection in the schedule form to avoid runtime CSS string construction.
- Hoisted email template styles into module-level `React.CSSProperties` constants so the markup can stay inline while remaining referentially stable.
- Memoized unavoidable dynamic styles:
  - Progress indicator transform values now use `React.useMemo`.
  - Avatar sizing and control widths share memoized `useMemo` objects.
  - Feature prism accent colors and CTA styling derive from memoized objects keyed by the selected feature.
- Consolidated the onboarding hero image styling into Tailwind classes to avoid runtime objects.

## Follow-up Guidance
- Prefer Tailwind utility classes or CSS modules for future UI work; when inline styles are unavoidable (e.g., HTML email requirements or imperative WebGL integrations), define them once at the module scope or memoize them with `useMemo`.
- Periodically audit third-party packages for reintroduced CSS-in-JS dependencies and remove them from `package.json` before shipping.
