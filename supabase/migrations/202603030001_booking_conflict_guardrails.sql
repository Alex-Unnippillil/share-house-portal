BEGIN;

-- Prevent overlapping active amenity bookings at the database layer.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_no_overlapping_active_slots'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_no_overlapping_active_slots
      EXCLUDE USING gist (
        amenity_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      )
      WHERE (status IN ('pending', 'confirmed'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_bookings_active_slot_gist
  ON public.bookings
  USING gist (amenity_id, tstzrange(start_time, end_time, '[)'))
  WHERE status IN ('pending', 'confirmed');

COMMIT;
