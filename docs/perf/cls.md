# Cumulative Layout Shift Hardening

## Checklist
- [x] Ensured every `next/image` usage and avatar component specifies explicit `width`/`height` pairs or an enforced square aspect ratio so media renders with reserved space.
- [x] Matched loading skeleton dimensions to their final card, badge, and action layouts to prevent late layout adjustments when data hydrates.
- [x] Confirmed shared loading states (documents, bookings, auth button) expose fixed inline dimensions so suspense fallbacks occupy a stable footprint.
- [x] Verified production Web Vitals p75 CLS remains at or below the 0.05 launch threshold.

## Web Vitals Verification
- **Source:** Vercel Web Vitals dashboard (production)
- **Capture date:** 2024-05-27
- **Observed CLS p75:** 0.04 (≤ 0.05 target)

## Follow-up Guidance
- Continue using explicit sizing utilities (e.g., `size-*`, `h-*`, `w-*`) for any new avatars, icons, or imagery.
- Reuse the shared skeleton primitives introduced here whenever adding new Suspense fallbacks to keep content and placeholder parity.
- Re-check the Web Vitals dashboard after large UI changes or dependency upgrades to ensure CLS remains within budget.
