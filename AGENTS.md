# Share House Portal Product Spec

## Vision & Goals
- Build a tenant-facing web portal optimised for roommates sharing a property.
- Deliver frictionless rent payment, shared amenity scheduling, document management, and rich communication.
- Ship a responsive, accessible experience with clear delineation between tenant, property manager, and admin workflows.
- Explicitly **exclude** OpenAI-powered assistants, podcasts, and blog surfaces from this project.

## Primary Tech Stack
| Layer | Selection | Notes |
| --- | --- | --- |
| Framework | Next.js 14 App Router + TypeScript | Use Server Actions where appropriate, colocate data fetching inside route handlers. |
| UI | Tailwind CSS + shadcn/ui | Adopt shadcn/ui primitives for consistency; wrap shared design tokens in `config/tailwind`. |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) | Use row-level security for multi-tenant isolation and enable realtime channels for messaging and booking updates. |
| Payments | Stripe | Implement rent payments via Checkout + Billing Portal; support recurring subscriptions per unit. |
| Calendar | Cal.com | Self-hosted instance (via the provided repository) embedded for amenity bookings (kitchen, TV, PlayStation, parking, shared computer). |
| Documents | Documenso | Host document workflows for lease agreement distribution and signing. |
| Deployment | Vercel | Configure env vars for Supabase, Stripe, Cal.com, and Documenso endpoints. |

## Key Features
1. **Authentication & RBAC**
   - Supabase Auth with email magic links + optional passwordless via OTP.
   - Roles: `tenant`, `roommate`, `property_manager`, `admin`.
   - Implement RBAC middleware in Next.js with Supabase RLS policies.

2. **Onboarding & Tenant Profiles**
   - Guided onboarding flow capturing unit assignment, rent share, emergency contacts, vehicle info.
   - Upload avatars/documents to Supabase Storage.

3. **Rent Payments (Stripe)**
   - Store Stripe customer + payment method IDs per tenant.
   - Offer autopay (recurring) and one-time catch-up payments.
   - Generate payment receipts and sync status back to Supabase.
   - Admin dashboard to reconcile failed payments and export CSV reports.

4. **Lease Agreements & Documents (Documenso)**
   - Import lease templates from Documenso and prefill tenant metadata via API.
   - Allow tenants to download signed agreements; maintain version history.
   - Provide secure storage and access logging for compliance.

5. **Amenity Reservations (Cal.com)**
   - Integrate Cal.com scheduling pages scoped per property amenity: kitchen, TV room, PlayStation nook, parking spots, shared computer.
   - Enforce double-booking prevention using Cal.com availability rules + Supabase replication of booked slots.
   - Support recurring reservations with conflict detection.

6. **Overnight Visitor Booking**
   - Dedicated flow to register guest stays, capture arrival/departure dates, host roommate, and reason.
   - Trigger notifications to roommates and property manager.
   - Limit consecutive nights per policy via validations.

7. **Per-Tenant Floorplan Overlays**
   - Store annotated SVG floorplans with roommate-specific overlays (storage assignment, chores, etc.).
   - Provide toggles for roommates to view personalised notes.

8. **Realtime Message Board**
   - Roommate feed with threads, reactions, polls powered by Supabase Realtime channels.
   - Moderation tools for property managers (pin, delete, flag content).

9. **Amenity & Maintenance Requests**
   - Form submissions stored in Supabase; integrate with message board for status updates.
   - Admin back office to prioritise and assign requests.

10. **Admin Back Office**
    - Role-gated dashboard for property managers and admins covering payments, documents, bookings, visitor logs, maintenance, and analytics.

## Integrations & Architecture Notes
- **Supabase Schema**
  - `profiles` table (extends `auth.users`), `units`, `leases`, `rent_payments`, `amenities`, `bookings`, `visitor_logs`, `messages`, `threads`, `maintenance_requests`, `floorplans`, `floorplan_annotations`.
  - Use foreign keys to ensure data integrity; configure RLS for tenant visibility per unit.
- **Stripe**
  - Use webhooks (`/api/stripe/webhook`) to sync payment events; verify signatures.
  - For shared units, create subscription items per roommate share.
- **Cal.com**
  - Deploy Cal.com (via provided repository) separately and configure API tokens.
  - Embed booking widgets via Cal.com's embed SDK; sync events into Supabase via webhooks for auditing.
- **Documenso**
  - Self-host Documenso instance; manage templates and envelopes via API.
  - Store Documenso envelope IDs in `documents` table for retrieval.

## UX Guidelines
- Responsive layouts targeting mobile-first; roommate interactions should be frictionless on phones.
- Use shadcn/ui navigation, cards, tabs, accordions; maintain accessible semantics with aria attributes.
- Provide contextual help tooltips and status indicators for bookings and payments.
- Present roommate activity timelines on dashboard with realtime updates.

## Non-Goals
- No OpenAI or AI chatbot integrations.
- No podcast player or blog CMS sections.
- No marketing/landing pages beyond essentials for login and onboarding.

## Deployment & DevOps
- Environments: `development`, `staging`, `production` on Vercel.
- Environment variables required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CALCOM_BASE_URL`, `CALCOM_API_KEY`, `DOCUMENSO_BASE_URL`, `DOCUMENSO_API_KEY`, `NEXT_PUBLIC_APP_URL`, etc.
- Configure GitHub Actions for lint/test/build using `pnpm`.
- Run Supabase migrations via `supabase db push`; document migrations per feature.

## Testing Strategy
- Unit tests with Jest/Testing Library for React components.
- Integration tests for API routes using Supabase test client + Stripe mock webhooks.
- E2E tests with Playwright covering onboarding, payments, bookings, and messaging flows.
- Contract tests against Cal.com and Documenso sandbox endpoints.

## Analytics & Observability
- Instrument with Vercel Analytics + custom Supabase metrics (bookings per amenity, payment success rate).
- Centralised logging using Vercel Log Drains to Datadog (if available).
- Alert on failed rent payments, booking conflicts, and webhook delivery failures.

## Security & Compliance
- Enforce HTTPS-only cookies, CSRF protection on forms, and Supabase RLS policies.
- Audit logs for admin actions (document downloads, booking overrides, message moderation).
- Stripe PCI compliance handled via Checkout/Billing Portal; never store raw card data.
- Implement data retention policy for visitor logs per local regulations.
- Follow the [Security Operations Playbook](docs/security/playbook.md) for incident response, on-call protocol, and credential rotation checklists.

## Roadmap Milestones
1. **MVP Foundations**: Auth, dashboard shell, tenant profiles, Supabase schema.
2. **Payments & Documents**: Stripe integration + Documenso workflow.
3. **Bookings & Messaging**: Cal.com amenity scheduling, realtime message board, overnight visitors.
4. **Admin Enhancements**: Back office analytics, maintenance triage, floorplan overlays.
5. **Polish & Launch**: Accessibility audit, performance tuning, QA, production readiness.

## References
- [Cal.com Repository](https://github.com/calcom/cal.com)
- [Documenso Repository](https://github.com/documenso/documenso)
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs

