CREATE EXTENSION IF NOT EXISTS "btree_gist";

ALTER TABLE IF EXISTS public.bookings
  DROP CONSTRAINT IF EXISTS bookings_amenity_timeslot_excl;

ALTER TABLE IF EXISTS public.bookings
  DROP CONSTRAINT IF EXISTS bookings_timeslot_valid;

DROP INDEX IF EXISTS public.bookings_timeslot_gist_idx;
DROP INDEX IF EXISTS public.bookings_timeslot_idx;

ALTER TABLE IF EXISTS public.bookings
  ADD COLUMN IF NOT EXISTS timeslot tsrange;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'start_time'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'end_time'
  ) THEN
    EXECUTE $$
      UPDATE public.bookings
         SET timeslot = tsrange(start_time, end_time, '[)')
       WHERE timeslot IS NULL
         AND start_time IS NOT NULL
         AND end_time IS NOT NULL;
    $$;

    EXECUTE 'ALTER TABLE public.bookings DROP COLUMN IF EXISTS start_time';
    EXECUTE 'ALTER TABLE public.bookings DROP COLUMN IF EXISTS end_time';
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.bookings
  ALTER COLUMN timeslot SET NOT NULL;

ALTER TABLE IF EXISTS public.bookings
  ADD CONSTRAINT bookings_timeslot_valid CHECK (lower(timeslot) < upper(timeslot));

CREATE INDEX IF NOT EXISTS bookings_timeslot_gist_idx
  ON public.bookings
  USING gist (timeslot);

ALTER TABLE IF EXISTS public.bookings
  ADD CONSTRAINT bookings_amenity_timeslot_excl
  EXCLUDE USING gist (
    amenity_id WITH =,
    timeslot WITH &&
  );
