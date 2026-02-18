# Accessibility Compliance Status

_Last updated: 2026-02-18_

## Scope audited

Core tenant/manager journeys audited in this update:

- Onboarding (`/onboarding`)
- Rent payments (`/payments`)
- Maintenance submit + triage (`/maintenance`)
- Amenity booking (`/bookings`)
- Document access/upload (`/documents`)
- Messaging moderation (`/messaging`)

## Implemented fixes

- Added missing form label associations for onboarding emergency and vehicle fields.
- Added explicit labels for maintenance manager queue filters and maintenance file upload.
- Added keyboard-selectable messaging thread cards (native `button`) with visible focus styling.
- Added screen-reader status announcements (`aria-live`) across async flows:
  - onboarding saves
  - booking validation
  - payment realtime feed updates
  - maintenance submission and triage saves
  - document upload progress/result
  - messaging realtime context updates
- Improved non-color cues for booking and payment states with textual prefixes and alert/status headings.
- Increased visual contrast on catch-up allocation applied amount text (`text-emerald-700`).

## Current compliance posture

- **WCAG 2.2 AA target:** _Partially compliant (improved)_
- **High-priority issues addressed:** label association gaps, keyboard-only selection issues, missing async announcements.
- **Remaining known exceptions:**
  1. Some badge-driven status areas still rely heavily on compact text + color combinations and need a shared semantic status component.
  2. Cross-route focus restoration (after async mutations and tab switches) is not consistently managed with explicit focus targets.
  3. Automated axe coverage for all core journeys is not yet fully codified in CI.

## Mitigation timeline

- **Within 1 sprint (1-2 weeks):**
  - Introduce shared `StatusPill` component with icon + explicit text labels across payments/bookings/maintenance.
  - Add deterministic focus management utilities for post-submit and tab-change flows.
- **Within 2 sprints (3-4 weeks):**
  - Add Playwright + axe checks for all core journeys in CI gating.
  - Add contrast regression checks against the design token palette.
- **Within 1 quarter:**
  - Complete full manual assistive-tech pass (NVDA + VoiceOver + keyboard-only) and publish an accessibility conformance report.
