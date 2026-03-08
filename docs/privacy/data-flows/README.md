# Share House Portal Data Flows

This directory contains Mermaid diagrams that visualise how personal data moves through the Share House Portal platform. Each diagram aligns with core product capabilities and is referenced by the DPIA narrative.

## Diagrams

- [`tenant-onboarding.mmd`](./tenant-onboarding.mmd): Captures how identity data, lease details, and uploaded documents flow between the onboarding experience, Supabase services, and Documenso.
- [`rent-payments.mmd`](./rent-payments.mmd): Maps the exchange of payment and tenancy metadata across the Next.js application, Stripe, and Supabase billing records.
- [`amenity-booking.mmd`](./amenity-booking.mmd): Shows the interplay between the portal, Cal.com scheduling, Supabase storage, and realtime notification channels for amenity reservations.

To render the diagrams locally you can use any Mermaid-compatible viewer or integrate them into Markdown documentation:

```md
```mermaid
%% include the contents of the desired .mmd file
```
```
