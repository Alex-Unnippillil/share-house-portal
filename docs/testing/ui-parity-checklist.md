# UI Parity Checklist (Release Readiness)

## Route-Level Spacing + Typography
- [x] Standardized page shells for Payments, Bookings, Maintenance, Messaging, and Documents to use shared header spacing, title scale, and description treatment.
- [x] Unified action placement in route headers so desktop and mobile retain predictable CTA location.

## Status Badge Semantics
- [x] Added `SemanticStatusBadge` to normalize success/warning/error/in-progress badge intent.
- [x] Applied semantic badges in booking history, maintenance timelines, and document status chips.

## Loading / Empty / Error / Success States
- [x] Added reusable `FlowStateCard` and replaced ad-hoc loading cards with consistent state messaging.
- [x] Updated document and maintenance flows with clear retry and no-data messaging.
- [x] Updated booking history and operations tables to provide explicit empty-state guidance.

## Mobile Navigation + Action Placement
- [x] Updated dashboard mobile navigation trigger to sticky top-right action button for consistency.
- [x] Refined drawer behavior and sizing so role-specific dashboards use a consistent left drawer pattern.

## Dashboard Card CTA + Helper Text
- [x] Operations queue tables now include contextual empty-state helper text.
- [x] Existing KPI cards and route cards validated to include action affordances or helper copy.

## High-Priority Mismatches Resolved
1. Inconsistent route header spacing and title scale across top-level product routes.
2. Divergent status color/variant semantics across bookings, documents, and maintenance.
3. Inconsistent no-data and error messaging patterns causing uncertain next steps.
4. Mobile nav trigger discoverability and action placement differences across dashboards.

## Follow-up (Non-blocking)
- [ ] Add end-to-end visual regression snapshots per role dashboard once staging seed data is stable.
- [ ] Extend semantic status badge mapping to all operation-domain and payment feed statuses.
