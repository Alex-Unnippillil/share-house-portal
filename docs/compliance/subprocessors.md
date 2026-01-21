# Roomsily Subprocessor Disclosures

_Last updated: March 2025_

Roomsily engages a short list of carefully vetted subprocessors to deliver the core Share House Portal experience. Each vendor is bound by a data processing agreement (DPA) and undergoes a security and privacy review at least annually or whenever we introduce material product changes. This document lists the subprocessors we rely on today, the purposes they serve, the data they touch, and the safeguards we enforce.

For real-time updates, including historical change log entries and email subscription management, visit the public portal at [/public/subprocessors](/public/subprocessors).

## Current Subprocessors

| Vendor | Purpose | Data Types Processed | Storage Region(s) | Safeguards & References |
| --- | --- | --- | --- | --- |
| **Supabase** | Managed Postgres database, authentication, storage, and realtime messaging infrastructure powering Roomsily. | Tenant profiles, household assignments, amenity bookings, maintenance requests, visitor logs, session metadata, document references. | United States (primary) with optional EU-West replica for latency-sensitive tenants. | Encryption at rest & in transit, daily PITR backups, role-based access controls. [Privacy & DPA](https://supabase.com/privacy-policy). |
| **Stripe** | Rent payment processing, billing schedules, and invoicing. | Payer name, email, billing address, partial card details (last 4 digits), Stripe customer & subscription identifiers, invoice history. | United States and EU data centers with PCI-DSS Level 1 compliance. | PCI-DSS certified, TLS 1.2+, tokenized payment methods. [Data Processing Agreement](https://stripe.com/legal/dpa). |
| **Documenso** | Digital document templating, routing, and e-signature workflows for leases and addenda. | Lease templates, signer names & emails, signature certificates, signing timestamps, document metadata. | European Union (primary), redundant infrastructure in Germany. | SOC 2 Type II, tamper-evident audit trails, granular access controls. [Security Overview](https://www.documenso.com/security). |
| **Cal.com** | Shared amenity scheduling, conflict prevention, and booking synchronization. | Booking titles, participant names & emails, amenity selection, reservation timestamps, optional notes. | European Union and United States regions. | TLS encryption, configurable data retention, granular API tokens. [Subprocessor List](https://cal.com/security). |
| **Resend** | Transactional email delivery for onboarding, receipts, maintenance alerts, and compliance notifications. | Recipient email, subject line, rendered notification content, event metadata (delivery and bounce logs). | United States with EU relay support. | DKIM + SPF enforcement, bounce monitoring, auditable event logs. [Privacy Policy](https://resend.com/legal/privacy-policy). |
| **Vercel** | Application hosting, CDN caching, build pipelines, and observability for the Share House Portal. | Application telemetry (request metadata, response codes), deployment artifacts, anonymized performance traces. | Global edge network with primary build infrastructure in the United States and EU. | ISO 27001, SOC 2 Type II, hardened edge network, controlled access. [Security Overview](https://vercel.com/security). |

## Data Minimisation & Retention

- Vendor access is scoped to the minimum viable dataset needed to operate the service.
- Data retention aligns with the Roomsily retention schedule and applicable regulation (GDPR/CCPA). Resend and Cal.com logs, for example, are automatically purged after 18 months.
- Encryption in transit and at rest is enforced for every subprocessor connection.

## Change Notifications

When we add a new vendor, modify processing purposes, or deprecate a provider, we publish the details in the change log and notify subscribers via email. Subscribe or manage your preferences from the public portal linked above.

For any questions about these subprocessors or to request a signed copy of our DPAs, contact compliance@roomsily.com.
