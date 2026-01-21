# Analytics Governance & Semantic Metrics

Roomsily now centralises product analytics on top of MetricFlow semantic models located in `analytics/semantic/metricflow.yaml`. The semantic layer establishes a single contract for payment, booking, and maintenance metrics that power tenant and property manager dashboards.

## Stewardship Principles

- **Single source of truth** – Dashboard and alerting code must reference metric identifiers declared in the semantic manifest. Avoid hard-coded SQL snippets outside dbt/MetricFlow projects.
- **Descriptive metadata** – Every metric includes a label, description, and linked measure so downstream consumers understand the business logic. Update descriptions whenever filters or aggregations change.
- **Review required** – Changes to semantic models or metrics require review from both Analytics and the product squad that owns the related feature area. Include dashboard screenshots or query diffs in pull requests.
- **Testing** – Run `metricflow query` samples for any modified metric to confirm row counts, filters, and time grains align with expectations before merging.

## Metric Inventory & Dashboards

| Metric | Purpose | Primary UI usage |
| --- | --- | --- |
| `rent_collection_rate` | Percentage of rent payments that settle successfully. | Dashboard → AnalyticsCharts (`Rent collection velocity` bar chart).
| `rent_collected_amount` | Total dollars collected across succeeded/completed payments. | Dashboard → DashboardMetrics (`This month’s rent` card).
| `amenity_bookings_confirmed_count` | Count of confirmed amenity reservations. | Dashboard → DashboardMetrics (`Upcoming bookings` card); Bookings → BookingStats (`This week`).
| `amenity_booking_avg_duration_hours` | Average booking duration in hours. | Bookings → BookingStats (`Avg duration`).
| `amenity_bookings_active_households` | Distinct households participating in bookings. | Bookings → BookingStats (`Participants`).
| `maintenance_resolved_count` | Completed maintenance tickets in the selected range. | Dashboard → AnalyticsCharts (`Maintenance resolution pace` area chart).
| `maintenance_open_tickets` | Active maintenance backlog (pending or in progress). | Dashboard → DashboardMetrics (`Open maintenance` card).
| `maintenance_resolution_time_hours` | Average hours to close maintenance requests. | Future SLA reporting, referenced in analytics dashboards when surfaced.

## Validation Workflow

1. **Author change** – Update `analytics/semantic/metricflow.yaml` and the relevant UI component so it references the semantic metric identifier in a `data-semantic-metric` attribute or helper text.
2. **Query verification** – Run MetricFlow spot checks for the affected metric with the intended filters/time grains (see `analytics/semantic/README.md`). Document query results or screenshots in the pull request description.
3. **Dashboard review** – Load `/dashboard` and `/bookings` locally to confirm helper text, chart legends, and counts align with the semantic definitions. Ensure no component is still referencing deprecated metrics.
4. **Sign-off** – Analytics reviewer confirms metric logic, Product reviewer confirms UX copy/tooltips remain accurate.

## Change Log Expectations

When shipping semantic updates include:

- Summary of metric changes in the pull request body referencing affected dashboards.
- Links to MetricFlow query outputs (screenshots or console logs) that validate before/after values.
- Follow-up tasks if downstream tooling (e.g., alerts, exports) also depends on the updated metrics.

Centralised governance ensures property managers and residents trust the analytics they see, and engineering teams can evolve dashboards without duplicating business logic across services.
