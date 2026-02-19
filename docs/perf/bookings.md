# Amenity Booking Conflict RPC

This document tracks the performance contract for the `check_amenity_conflicts` Supabase RPC that powers the amenity booking flow.

## Purpose

The client uses this RPC to validate amenity booking requests before redirecting tenants to the external Cal.com flow. The procedure performs three indexed checks against the `bookings` table:

- **Range validation** – reject any request where the end time is not after the start time.
- **Past start guard** – surface a conflict if the requested slot begins in the past.
- **Conflict detection** – leverage the `bookings_time_range_gist` GiST index to detect overlapping reservations or bookings that violate the 15 minute buffer window.

The index is defined as:

```sql
CREATE INDEX bookings_time_range_gist
  ON public.bookings
  USING gist (amenity_id, tstzrange(start_time, end_time, '[)'));
```

This allows the RPC to service conflict checks in ≤20 ms for the observed test data sets.

## RPC Signature

```sql
check_amenity_conflicts(
  p_amenity_id text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_household_id uuid default null,
  p_booking_id uuid default null
) returns jsonb
```

All parameters are required except for `p_household_id` (enables scoping conflicts per household) and `p_booking_id` (excludes a booking during updates). Requests must provide ISO-8601 timestamps.

## Response Shape

The RPC returns a JSON object with two keys:

| Key | Type | Description |
| --- | --- | --- |
| `conflicts` | `Array<Conflict>` | Structured conflict entries (may be empty). |
| `has_conflict` | `boolean` | Convenience flag derived from `conflicts`. |

Each conflict entry is a JSON object with the following structure:

| Field | Type | Description |
| --- | --- | --- |
| `code` | `"INVALID_RANGE" \| "PAST_START" \| "TIME_OVERLAP" \| "BUFFER_CONFLICT"` | Machine-readable identifier used by the UI. |
| `severity` | `"error" \| "warning"` | Signals whether the conflict blocks the booking. |
| `details` | `object` | Optional metadata (e.g. conflicting booking id, start, and end timestamps). |

### Example

```json
{
  "conflicts": [
    {
      "code": "TIME_OVERLAP",
      "severity": "error",
      "details": {
        "booking_id": "58f5f52a-2919-498f-af1b-e3c1d17e9a62",
        "start_time": "2025-01-06T14:00:00Z",
        "end_time": "2025-01-06T15:00:00Z"
      }
    },
    {
      "code": "BUFFER_CONFLICT",
      "severity": "warning",
      "details": {
        "booking_id": "8a36172c-d6aa-4bda-b6c0-6622d9a8f203",
        "start_time": "2025-01-06T15:05:00Z",
        "end_time": "2025-01-06T16:00:00Z"
      }
    }
  ],
  "has_conflict": true
}
```

## Client Expectations

- The browser logs a metric entry whenever the form calls the RPC: `console.info("[metrics] amenity_conflict_check", { amenityId, durationMs, within20ms, conflictCount })`.
- UI elements reuse conflict codes for user-facing copy and state, so new codes must be added to both the RPC and the client mapping.
- The RPC should continue to respond within the 20 ms budget once populated with production-like data. If latency regresses, revisit the index and filter predicates first.
