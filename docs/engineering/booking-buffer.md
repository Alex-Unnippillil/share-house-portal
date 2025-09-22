# Amenity Booking Buffer Windows

The amenity scheduler enforces a configurable buffer window around every reservation to ensure hand-offs are calm and to prevent back-to-back usage from colliding.

## How the buffer works

- Tenants pick a buffer duration when submitting a booking. The default is 15 minutes, but they can choose from a curated set of options in the UI.
- Before a booking is persisted the requested `start` and `end` timestamps are expanded by the selected buffer on both sides. The resulting window is stored in the `slot` `tsrange` column so that Postgres can enforce overlap rules.
- Any existing reservations are expanded the same way during conflict checks. If the candidate’s buffered window overlaps one of those windows (using half-open `[start, end)` semantics) the request is rejected.
- The UI previews the buffered window so roommates can see exactly when the amenity will be held, including the blocked buffer periods before and after their requested time.

## Database details

The Supabase migration `20250601_booking_buffer.sql` creates the `amenity_bookings` table with:

- `slot tsrange` – stores the buffered window `[start-buffer, end+buffer)`.
- `starts_at` and `ends_at` – keep the tenant’s requested times for display purposes.
- `buffer_minutes` – the number of minutes added to both ends of the reservation.

Row Level Security policies allow tenants to manage their own bookings, and a GiST index on `(amenity_slug, slot)` enables efficient overlap checks.

## Testing expectations

Unit tests in `tests/booking-buffer.test.ts` cover two critical cases:

1. A candidate booking whose actual times would be back-to-back but fall inside another booking’s buffer is rejected.
2. A booking that begins exactly when the previous buffer ends is accepted, ensuring the half-open interval logic is correct.

Keep these scenarios in mind when adjusting buffer lengths or adding new scheduling surfaces.
