# Amenity configuration rules

Shared amenity bookings depend on consistent metadata so Supabase, Cal.com, and the front-end stay in sync. The schema and UI now expose three core fields that govern how each resource can be reserved.

## Schema columns

| Column | Type | Purpose |
| --- | --- | --- |
| `open_hours` | `jsonb` | Weekly availability windows keyed by weekday. Each day maps to an array of `{ "start": "HH:MM", "end": "HH:MM" }` objects using 24-hour time. Empty arrays mark closed days. |
| `buffer_minutes` | `integer` | Minutes blocked before and after every booking to support cleaning, resets, or elevator travel. Set to `0` when no padding is required. |
| `capacity` | `integer` (default `1`) | Maximum simultaneous participants allowed for a single slot. Drives both booking limits in Cal.com and conflict detection in Supabase. |

## JSON structure for `open_hours`

```json
{
  "monday": [{ "start": "08:00", "end": "22:00" }],
  "tuesday": [{ "start": "08:00", "end": "22:00" }],
  "wednesday": [],
  "thursday": [{ "start": "10:00", "end": "18:00" }],
  "friday": [{ "start": "10:00", "end": "18:00" }],
  "saturday": [{ "start": "09:00", "end": "12:00" }],
  "sunday": []
}
```

**Validation rules:**

- Use 24-hour `HH:MM` strings; seconds are omitted.
- Provide both a `start` and `end` time for every window. Partial entries are rejected.
- Ensure `end` is later than `start` for each range.
- Leave the array empty for days the amenity stays closed.

## Operational guidance

- **Buffer minutes:** Align with the physical reset period (e.g., towel service, cleaning, elevator travel). When multiple services need time, choose the longest requirement so residents never overlap with staff.
- **Capacity:** Represent the true simultaneous headcount limit, not per-day availability. If multiple families can use the space concurrently, raise the value accordingly.
- **Versioning:** Update `updated_at` (if present) whenever these fields change so booking clients can invalidate caches.

## UI workflow

The admin form at `/app/(admin)/amenities` captures each of these fields. Open hours are entered with time pickers per weekday and converted into the JSON payload shown above. Buffer and capacity use numeric inputs with validation to prevent negative values.

After saving, surface the `open_hours`, `buffer_minutes`, and `capacity` data when publishing amenity details to ensure tenants understand the booking policy.
