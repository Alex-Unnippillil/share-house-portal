-- Ensure amenity bookings conflict checks can leverage a composite index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
  ) THEN
    EXECUTE $$
      CREATE INDEX IF NOT EXISTS idx_bookings_amenity_time_range
        ON public.bookings (amenity_id, start_time, end_time);
    $$;
  ELSE
    RAISE NOTICE 'Skipping creation of idx_bookings_amenity_time_range because public.bookings does not exist yet.';
  END IF;
END $$;

-- Update the conflict helper to rely on range predicates that map to the composite index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
  ) THEN
    EXECUTE $ddl$
      CREATE OR REPLACE FUNCTION public.find_conflicting_bookings(
        p_amenity_id public.bookings.amenity_id%TYPE,
        p_start_time public.bookings.start_time%TYPE,
        p_end_time public.bookings.end_time%TYPE,
        p_exclude_booking public.bookings.id%TYPE DEFAULT NULL
      )
      RETURNS TABLE (
        id public.bookings.id%TYPE,
        amenity_id public.bookings.amenity_id%TYPE,
        start_time public.bookings.start_time%TYPE,
        end_time public.bookings.end_time%TYPE
      )
      LANGUAGE sql
      STABLE
      AS $function$
        SELECT
          b.id,
          b.amenity_id,
          b.start_time,
          b.end_time
        FROM public.bookings AS b
        WHERE b.amenity_id = p_amenity_id
          AND b.start_time < p_end_time
          AND b.end_time > p_start_time
          AND (p_exclude_booking IS NULL OR b.id <> p_exclude_booking)
        ORDER BY b.start_time;
      $function$;
    $ddl$;
  ELSE
    RAISE NOTICE 'Skipping helper update because public.bookings does not exist yet.';
  END IF;
END $$;
