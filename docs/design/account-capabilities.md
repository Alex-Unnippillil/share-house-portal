# Account Role Capabilities

## Overview
Roomsily supports four primary account types. Each role maps to a tailored dashboard experience and scoped Supabase Row Level Security policies so that residents and operators see only the surfaces they are permitted to manage. The matrix below summarises the core capability boundaries, followed by narrative details for each role.

## Capability Matrix
| Capability | Tenant | Roommate | Property Manager | Admin |
| --- | --- | --- | --- | --- |
| Dashboard access | Personal lease, payments, bookings, visitors | Shared unit overview, upcoming bookings, maintenance status | Building portfolio view with unit health, payment status, maintenance queue | Global portfolio analytics, compliance dashboards |
| Rent payments | Set up autopay, make one-off payments, download receipts | View shared ledger, make catch-up payments if delegated | Monitor payment status, reconcile failures, issue refunds/credits | Manage Stripe configuration, override failed payouts |
| Documents & signatures | Review and sign assigned leases and notices | Review shared documents, countersign roommate addenda | Publish templates, request signatures, manage Documenso envelopes | Archive documents, manage retention policies |
| Amenity bookings | Reserve amenities, manage their own reservations | Reserve amenities for the household, see roommate bookings | View amenity load, override conflicts, release blocked slots | Configure amenity catalog, integrate new Cal.com schedules |
| Maintenance & requests | Submit requests, upload evidence, track status | Submit or comment on unit requests, escalate urgent items | Assign staff, update statuses, coordinate vendors | Review SLA adherence, export request logs |
| Overnight visitors | Register guests, view approvals | Register guests, see household schedule | Approve/deny visits, enforce policies | Define visitor policies, audit compliance |
| Messaging & notifications | Participate in threads, receive alerts | Participate in threads, receive alerts | Moderate threads, pin/resolve announcements | Configure notification channels, audit messaging activity |
| Member & unit management | Update personal profile and emergency contacts | Update personal profile | Invite/remove residents, adjust rent shares, manage unit metadata | Manage property portfolios, import/export building data |
| Analytics & reports | Personal history exports | Personal history exports | Building-level finance and utilisation reports | Cross-building analytics, compliance reports |
| System configuration | — | — | Configure property settings, amenity hours, document templates | Manage global feature flags, integrations, RBAC policies |

## Role Narratives

### Tenant
- Completes guided onboarding, confirming rent share, emergency contacts, and vehicle details for their unit.
- Manages rent payments end-to-end, including autopay enrollment, ledger reviews, and receipt downloads.
- Reviews, signs, and stores personal lease agreements or policy acknowledgements.
- Books shared amenities and sees the household schedule to avoid conflicts.
- Registers overnight guests, submits maintenance requests, and participates in roommate messaging threads.

### Roommate
- Shares the tenant-facing dashboard but without authority to change lease terms or adjust autopay settings.
- Views rent balances, uploads supporting documents, and can submit one-off payments if delegated by the tenant.
- Participates in amenity bookings, maintenance coordination, overnight visitor registrations, and message board activity.
- Keeps their profile information current so property managers maintain accurate occupancy records.

### Property Manager
- Oversees assigned buildings with visibility into unit occupancy, payment health, amenity utilisation, and maintenance queues.
- Invites residents, assigns roles, updates rent shares, and maintains unit metadata.
- Manages Documenso templates and signature requests, triages maintenance tickets, and moderates community threads.
- Approves or denies overnight visitor requests, overrides amenity conflicts, and coordinates vendors.
- Exports finance and operations reports to reconcile payments, bookings, and compliance obligations.

### Admin
- Operates at a portfolio level, configuring buildings, amenities, integrations, and feature flags.
- Manages RBAC policies, performs audit log reviews, and enforces security and compliance standards.
- Oversees global Stripe, Cal.com, and Documenso connections, handling escalations that require elevated privileges.
- Reviews cross-building analytics and retention policies, archiving documents or revoking access when necessary.
- Supports incident response by granting temporary support sessions or disabling access across properties.
