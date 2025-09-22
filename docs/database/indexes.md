# Foreign Key Index Additions

| Index name | Column | Rationale | Impacted flows |
| --- | --- | --- | --- |
| `idx_profiles_user_id` | `profiles.user_id` | Keeps auth-to-profile joins fast for tenant workflows that fetch the signed-in user's profile before fanning out to roommates and staff. | Maintenance request creation and visitor bookings both read the current user's profile to derive unit context before continuing.【F:components/maintenance/maintenance-request-form.tsx†L63-L124】【F:components/visitors/visitor-booking-form.tsx†L60-L125】 |
| `idx_units_property_id` | `units.property_id` | Supports property-level rollups and dashboards that group units under a shared building or landlord as outlined in the product spec. | Visitor booking flows already expect a normalized units catalog, and upcoming admin dashboards rely on grouping units per property.【F:components/visitors/visitor-booking-form.tsx†L74-L88】【F:AGENTS.md†L63-L79】 |
| `idx_leases_unit_id` | `leases.unit_id` | Ensures we can quickly fetch the active lease for a unit when presenting document detail and signing flows. | Document actions tag uploads with a `unit_id` and subsequently fetch related lease metadata, so joining leases on unit becomes latency-sensitive.【F:app/documents/actions/index.ts†L101-L216】 |
| `idx_rent_payments_tenant_id` | `rent_payments.tenant_id` | Keeps tenant-specific payment history snappy as Stripe webhooks emit tenant and unit metadata for each charge. | Checkout and subscription webhooks persist the tenant/unit IDs on every payment row, forming the basis for tenant rent ledgers and notifications.【F:app/payments/_components/stripe-actions.tsx†L11-L106】【F:app/api/stripe/webhook/route.ts†L80-L229】 |

## Notes on verification

*Staging EXPLAIN plans could not be captured from this environment because the staging database credentials are not available to the container. Run targeted `EXPLAIN` statements in staging once credentials are accessible to confirm that the planner picks up the new indexes.*
