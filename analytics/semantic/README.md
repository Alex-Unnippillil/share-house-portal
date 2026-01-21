# Roomsily Semantic Layer

This directory defines the analytics semantic layer for Roomsily using the [MetricFlow](https://docs.getdbt.com/docs/build/metricflow) specification. Semantic models map directly to Supabase tables and expose governed metrics that power dashboards in the tenant and property manager experience.

## Structure

- `metricflow.yaml` — primary MetricFlow manifest containing semantic models and metric definitions for payments, amenity bookings, and maintenance requests.

## Usage

1. Install MetricFlow inside the analytics workspace (`pip install metricflow`).
2. Point MetricFlow at the warehouse connection that exposes the Supabase `public` schema.
3. Run exploratory queries, for example:
   ```bash
   metricflow query --metrics rent_collection_rate --group-by month
   metricflow query --metrics amenity_booking_avg_duration_hours --group-by amenity
   metricflow query --metrics maintenance_open_tickets --where "unit_id = '...'"
   ```
4. Use the generated datasets to populate dashboards or build alerts. Each dashboard component declares the semantic metric identifier it visualises so analysts can trace usage end-to-end.

See `docs/engineering/analytics-governance.md` for stewardship guidance and change-management expectations.
