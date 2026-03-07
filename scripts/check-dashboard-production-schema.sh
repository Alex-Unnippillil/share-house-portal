#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required to validate dashboard schema expectations." >&2
  exit 1
fi

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

# Anchored to queries in app/dashboard/(dashboard)/production-data.ts
REQUIRED_COLUMNS=$(cat <<'SQL'
WITH required(table_name, column_name, query_anchor) AS (
  VALUES
    ('rent_payments', 'tenant_id', 'fetchProductionRentSummary'),
    ('rent_payments', 'amount', 'fetchProductionRentSummary'),
    ('rent_payments', 'status', 'fetchProductionRentSummary'),
    ('rent_payments', 'created_at', 'fetchProductionRentSummary'),
    ('rent_payments', 'due_date', 'fetchProductionRentSummary'),
    ('rent_payments', 'metadata', 'fetchProductionRentSummary'),

    ('documents', 'tenant_id', 'fetchProductionRecentDocuments/fetchProductionQuickActions'),
    ('documents', 'id', 'fetchProductionRecentDocuments/fetchProductionQuickActions'),
    ('documents', 'title', 'fetchProductionRecentDocuments'),
    ('documents', 'document_type', 'fetchProductionRecentDocuments'),
    ('documents', 'status', 'fetchProductionRecentDocuments/fetchProductionQuickActions'),
    ('documents', 'updated_at', 'fetchProductionRecentDocuments'),

    ('threads', 'id', 'fetchProductionRoommateUpdates'),
    ('threads', 'title', 'fetchProductionRoommateUpdates'),
    ('threads', 'body', 'fetchProductionRoommateUpdates'),
    ('threads', 'created_at', 'fetchProductionRoommateUpdates'),
    ('threads', 'author_id', 'fetchProductionRoommateUpdates'),

    ('bookings', 'id', 'fetchProductionQuickActions/fetchProductionUpcomingBookings'),
    ('bookings', 'tenant_id', 'fetchProductionQuickActions/fetchProductionUpcomingBookings'),
    ('bookings', 'status', 'fetchProductionQuickActions/fetchProductionUpcomingBookings'),
    ('bookings', 'amenity_name', 'fetchProductionUpcomingBookings'),
    ('bookings', 'start_time', 'fetchProductionUpcomingBookings'),
    ('bookings', 'end_time', 'fetchProductionUpcomingBookings'),

    ('maintenance_requests', 'id', 'fetchProductionQuickActions/fetchProductionMaintenanceTickets'),
    ('maintenance_requests', 'created_by', 'fetchProductionQuickActions'),
    ('maintenance_requests', 'status', 'fetchProductionQuickActions/fetchProductionMaintenanceTickets'),
    ('maintenance_requests', 'unit_id', 'fetchProductionMaintenanceTickets'),
    ('maintenance_requests', 'title', 'fetchProductionMaintenanceTickets'),
    ('maintenance_requests', 'priority', 'fetchProductionMaintenanceTickets'),
    ('maintenance_requests', 'updated_at', 'fetchProductionMaintenanceTickets'),

    ('profiles', 'id', 'fetchProductionRoommateUpdates/fetchProductionMaintenanceTickets/fetchProductionFloorplanWorkspace'),
    ('profiles', 'full_name', 'fetchProductionRoommateUpdates/fetchProductionFloorplanWorkspace'),
    ('profiles', 'unit_id', 'fetchProductionMaintenanceTickets/fetchProductionFloorplanWorkspace'),
    ('profiles', 'role', 'fetchProductionFloorplanWorkspace'),

    ('floorplans', 'id', 'fetchProductionFloorplanWorkspace'),
    ('floorplans', 'name', 'fetchProductionFloorplanWorkspace'),
    ('floorplans', 'unit_id', 'fetchProductionFloorplanWorkspace'),
    ('floorplans', 'property_id', 'fetchProductionFloorplanWorkspace'),
    ('floorplans', 'version', 'fetchProductionFloorplanWorkspace'),
    ('floorplans', 'svg_url', 'fetchProductionFloorplanWorkspace'),

    ('floorplan_annotations', 'id', 'fetchProductionFloorplanWorkspace'),
    ('floorplan_annotations', 'floorplan_id', 'fetchProductionFloorplanWorkspace'),
    ('floorplan_annotations', 'profile_id', 'fetchProductionFloorplanWorkspace'),
    ('floorplan_annotations', 'annotation_key', 'fetchProductionFloorplanWorkspace'),
    ('floorplan_annotations', 'annotation_value', 'fetchProductionFloorplanWorkspace'),
    ('floorplan_annotations', 'updated_at', 'fetchProductionFloorplanWorkspace')
), missing AS (
  SELECT required.table_name, required.column_name, required.query_anchor
  FROM required
  LEFT JOIN information_schema.columns cols
    ON cols.table_schema = 'public'
   AND cols.table_name = required.table_name
   AND cols.column_name = required.column_name
  WHERE cols.column_name IS NULL
)
SELECT format('%s.%s (anchor: %s)', table_name, column_name, query_anchor)
FROM missing
ORDER BY table_name, column_name;
SQL
)

missing_output="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -Atqc "$REQUIRED_COLUMNS")"

if [[ -n "$missing_output" ]]; then
  echo "Dashboard schema validation failed. Missing required columns:"
  while IFS= read -r line; do
    echo "  - $line"
  done <<< "$missing_output"
  exit 1
fi

echo "Dashboard schema validation passed. All required tables/columns are present."
