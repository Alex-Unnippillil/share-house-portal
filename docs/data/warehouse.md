# Data Warehouse Schemas

Share House Portal's warehouse models mirror operational Supabase tables while introducing dimensional structures that power analytics and financial reporting. This document covers the core schemas hydrated by the nightly ELT job.

## Tenants Domain

### `dim_tenant`
- **Business key:** `tenant_id` sourced from `profiles.id`.
- **Attributes:** full name, preferred name, email, phone, role, rent share percentage, onboarding status, primary roommate, emergency contact summary, Supabase metadata JSON.
- **Transformations:**
  - Normalize phone numbers into E.164 format.
  - Map Supabase roles into enumerated tenant types (`tenant`, `roommate`, `property_manager`, `admin`).
  - Aggregate JSON onboarding responses into flattened columns.
  - Flag `is_active` based on whether the tenant has an active lease today.

### `dim_unit`
- **Business key:** `unit_id` from `units.id`.
- **Attributes:** property identifier, unit number, bedroom count, rent amount, lease start/end dates.
- **Transformations:** join `leases` to derive the current lease window, compute total roommates, and include geospatial coordinates for mapping.

### `bridge_tenant_unit`
- Grain at tenant-unit-day with `tenant_id`, `unit_id`, and `effective_date`.
- Used for slowly changing tracking when tenants move units or sublets overlap. Derived from `leases` history in Supabase.

## Bookings Domain

### `fact_booking`
- **Grain:** one record per amenity reservation.
- **Keys:** `booking_id` (`bookings.id`), `tenant_id`, `amenity_id`.
- **Measures:** duration minutes, guests count, status, cancellation reason, created timestamp, confirmation channel.
- **Transformations:**
  - Convert timestamps to warehouse UTC.
  - Denormalize amenity and unit context for easier slicing.
  - Enforce conflict resolution by de-duplicating overlapping Supabase records (take the latest `updated_at`).

### `dim_amenity`
- Derived from Supabase `amenities` table with features such as amenity type, floor, capacity, reservable hours, and requires approval flag.
- Includes `is_active` logic and metadata tags for equipment included in the amenity.

### `fact_booking_daily_rollup`
- Snapshots bookings per amenity per day with metrics for total reservations, cancelled reservations, average duration, peak hour, and unique tenants.
- Supports dashboard trend charts and occupancy analytics.

## Payments Domain

### `fact_payment`
- **Grain:** rent payment transaction received via Stripe webhook and recorded in `rent_payments`.
- **Measures:** gross amount, fee amount, net amount, currency, payment method type, autopay flag, retry count, status.
- **Dimensions:** `tenant_id`, `unit_id`, `invoice_id`, `stripe_payment_intent_id`.
- **Transformations:**
  - Join Stripe webhook payload (persisted in Supabase) to enrich with failure codes and brand metadata.
  - Normalize currencies to the organization's reporting currency using daily FX tables when required.
  - Add derived fields for on-time vs. overdue, payment cadence, and whether the payment closes the balance.

### `fact_payment_schedule`
- Projects expected rent based on `leases` and autopay preferences to compare against actual collections.
- Includes `due_date`, `expected_amount`, `collected_amount`, and `days_past_due` metrics.

### `dim_payment_method`
- Contains hashed payment method identifiers, brand, last4, exp date, autopay enrollment date, and risk signals.

## Documents & Compliance Domain

### `dim_document`
- Based on Supabase `documents` table with references to Documenso envelope IDs, document categories (lease, addendum, policy), effective dates, and version numbers.
- Tracks storage bucket path and retention policy.

### `fact_document_event`
- Event fact table built from Documenso webhook logs stored in Supabase.
- Grain: document event (issued, viewed, signed, voided) per tenant.
- Captures actor, timestamp, IP/geolocation, and signature type.
- Enables SLA reporting on turnaround time for signatures.

### `dim_document_template`
- Catalog of reusable Documenso templates with owner, revision, and required signer roles.

## Shared Conventions

- **Timestamps:** stored in UTC with a `*_at` suffix; load job adds `loaded_at` from the ELT run metadata.
- **Soft deletes:** Supabase soft delete flags are converted into warehouse `is_active` booleans.
- **Data lineage:** every table includes `supabase_source_table` and `supabase_sync_version` fields captured by the ELT script to simplify auditing.

## Operational Notes

- Nightly orchestration uses the `scripts/elt/run-airbyte-sync.mjs` helper which triggers Airbyte, polls job completion, and posts alerts to configured webhooks.
- Warehouse loads run after Supabase replication finishes; transformation SQL lives alongside dbt models (future work) referencing the dimensional tables documented above.
