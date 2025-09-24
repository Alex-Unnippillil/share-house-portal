# Data Protection Impact Assessment (DPIA)

_Last updated: 2024-05-14_

## 1. Processing Overview

### 1.1 Context
The Share House Portal enables co-tenants, property managers, and administrators to coordinate rent payments, amenity bookings, maintenance, and document workflows. The platform relies on Supabase for authentication and persistence, Stripe for payments, Cal.com for amenity scheduling, and Documenso for digital signatures. Processing involves special coordination between multiple third-party processors and realtime collaboration features that handle personal data across jurisdictions.

### 1.2 Data Inventory
| Data Category | Description | Source | Storage | Recipients | Retention | Lawful Basis |
| --- | --- | --- | --- | --- | --- | --- |
| Identity & Contact | Name, email, phone, emergency contacts, avatars | Tenant onboarding form | Supabase `profiles`, Supabase Storage | Property managers, roommates (limited profile fields) | Active tenancy + 12 months | Contractual necessity |
| Lease & Unit Metadata | Unit assignment, lease terms, rent share, vehicle info | Property manager provisioning, tenant updates | Supabase `units`, `leases`, Documenso envelopes | Property managers, admins | Duration of lease + statutory retention | Contractual necessity |
| Payment Records | Stripe customer IDs, invoices, receipts, status logs | Tenant payment actions, Stripe webhooks | Stripe, Supabase `rent_payments` | Property managers, finance admins | 7 years for accounting compliance | Legal obligation |
| Amenity Bookings | Amenity type, slot, attendees, notes | Tenant bookings via Cal.com | Cal.com events, Supabase `bookings` | Roommates (same unit), property managers | 12 months rolling | Legitimate interests (community coordination) |
| Visitor & Maintenance Logs | Guest names, stay dates, maintenance issue descriptions | Tenant submissions | Supabase `visitor_logs`, `maintenance_requests` | Property managers, admins | Active tenancy + 12 months | Legitimate interests |
| Messaging Content | Thread posts, reactions, attachments | Tenant generated content | Supabase Realtime channels, storage | Roommates, property managers (moderation) | 24 months rolling | Legitimate interests + consent for retention |

## 2. Data Flow Summary
The primary data exchanges are visualised in the [data flow diagrams](./data-flows/README.md):

- **Tenant onboarding & profiles** – covers Supabase authentication, document uploads, and Documenso envelope lifecycle. See [`tenant-onboarding.mmd`](./data-flows/tenant-onboarding.mmd).
- **Rent payments** – highlights interactions between the portal, Stripe Checkout/Billing, and Supabase rent ledgers. See [`rent-payments.mmd`](./data-flows/rent-payments.mmd).
- **Amenity bookings & realtime updates** – outlines Cal.com integration, Supabase event replication, and roommate notifications. See [`amenity-booking.mmd`](./data-flows/amenity-booking.mmd).

These flows ensure all processors, storage locations, and notification channels are documented for DPIA traceability.

## 3. Risk Assessment

### 3.1 Intrinsic Risks
| Risk ID | Description | Impact | Likelihood | Inherent Risk |
| --- | --- | --- | --- | --- |
| R1 | Compromise of Supabase credentials exposes tenant profiles and documents. | High | Medium | High |
| R2 | Stripe webhook tampering results in false payment status updates and billing inaccuracies. | High | Low | Medium |
| R3 | Cal.com booking data leaked, revealing roommate schedules and patterns. | Medium | Medium | Medium |
| R4 | Realtime message board abused for sensitive data sharing without moderation. | Medium | Medium | Medium |
| R5 | Documenso envelope misconfiguration leads to unsigned or exposed lease documents. | High | Low | Medium |
| R6 | Cross-tenant data leakage due to mis-scoped RLS policies. | High | Medium | High |

### 3.2 Risk Evaluation Criteria
- **Impact**: Degree of harm to individuals (financial, reputational, safety) and regulatory exposure.
- **Likelihood**: Probability of occurrence based on control maturity, threat landscape, and system complexity.
- **Inherent Risk**: Qualitative combination before mitigations (High > Medium > Low).

## 4. Mitigation Measures
| Risk ID | Control | Implementation Details | Status |
| --- | --- | --- | --- |
| R1 | Harden Supabase security | Enforce MFA for service accounts, rotate keys quarterly, restrict network egress, and enable row level security on all tenant tables. | In progress |
| R2 | Secure webhook handling | Verify Stripe signatures, use secret rotation automation, store webhook logs in tamper-evident storage, and alert on failed verifications. | Planned |
| R3 | Limit calendar exposure | Scope Cal.com links per property, require auth token exchange for embed, and automatically redact attendee notes older than 30 days. | Planned |
| R4 | Content moderation | Implement keyword filters, escalation workflow for moderators, and configurable retention windows with audit logging. | In progress |
| R5 | Documenso safeguards | Enforce least privilege API keys, require dual-approval for template edits, and monitor envelope status with automated retries. | Complete |
| R6 | Tenant isolation testing | Automate RLS regression tests in CI and conduct quarterly penetration testing focusing on cross-tenant boundaries. | Planned |

## 5. Residual Risk & Justification
After implementing the mitigations above, residual risk for each scenario is expected to fall within **Medium** tolerance. Continuous monitoring (security logging, anomaly detection, quarterly audits) will ensure prompt response to deviations. No processing is suspended because the service is contractually required for tenancy management; safeguards are proportionate to the risks identified.

## 6. Stakeholder Review & Mitigation Tracking

### 6.1 Review Session
- **Date**: 2024-05-14
- **Participants**: Legal (A. Chen), Compliance (R. Patel), Security (L. Gomez), Product (M. Lawson)
- **Summary**: Stakeholders validated lawful bases, emphasised need for retention schedule transparency, and prioritised RLS regression automation before launch.

### 6.2 Mitigation Log
| ID | Description | Owner | Target Date | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| A1 | Publish tenant-facing privacy notice covering Cal.com and Documenso processors. | Legal | 2024-05-20 | Open | Draft shared; awaiting translation review. |
| A2 | Implement automated Supabase RLS tests in CI pipeline. | Engineering | 2024-05-28 | In progress | Test harness drafted; needs coverage for message board tables. |
| A3 | Document retention schedule with purge automation for messaging content. | Compliance | 2024-06-05 | Planned | Dependent on storage lifecycle tooling. |
| A4 | Establish webhook failure alerting runbook (Stripe, Documenso, Cal.com). | Security | 2024-05-24 | In progress | Evaluating Datadog integration for alert routing. |

Stakeholders will reconvene bi-weekly until all open actions are resolved. Updates are tracked in this DPIA to maintain accountability and regulatory audit readiness.

## 7. Monitoring & Next Steps
- Integrate mitigation status reviews into sprint ceremonies to ensure engineering follow-through.
- Schedule DPIA refresh every six months or upon major product changes (new data categories or processors).
- Align retention automation with infrastructure roadmap to guarantee timely purge of obsolete records.
