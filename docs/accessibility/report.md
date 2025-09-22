# Accessibility Audit Report

_Last updated: 2025-09-22_

## Summary
- Integrated automated accessibility regression checks with Playwright and axe-core covering the messaging and bookings surface areas.
- Remediated notification center controls to provide descriptive aria labels, keyboard focus styling, and operable keyboard handlers.
- Added keyboard-only regression coverage to ensure tenants can navigate amenity booking workflows without a pointer device.

## Automated Coverage
| Area | Tooling | Command |
| --- | --- | --- |
| Messaging page | Playwright + axe-core | `npm run test:a11y -- --grep messaging` |
| Bookings page (axe scan) | Playwright + axe-core | `npm run test:a11y -- --grep bookings` |
| Bookings page (keyboard flow) | Playwright | `npm run test:a11y -- --grep "Bookings keyboard"` |

To execute the full suite locally run:

```bash
npm run test:a11y
```

## Keyboard-only Flows
The following flows are exercised in automated tests and verified to work without a mouse:

1. **Amenity booking**
   - Press `Tab` until the **Book Amenity** tab receives focus, then use the arrow keys to switch to other tab panels and return.
   - Continue tabbing until the first **Book now** button is focused.
   - Press `Enter` to trigger the Cal.com booking toast for the Kitchen amenity.
2. **Notification center management**
   - Focus the bell icon button in the global header to open notifications. The control now exposes an explicit aria-label and focus ring.
   - Use `Tab` to move through each notification card. Each card is keyboard focusable with `Enter`/`Space` activation alongside dedicated “mark read” and “delete” icon buttons that provide aria labels.

## Status
All scoped automated checks are currently passing. Future audits should extend coverage to additional high-traffic routes (payments, messaging threads) and realtime interactions as they mature.
