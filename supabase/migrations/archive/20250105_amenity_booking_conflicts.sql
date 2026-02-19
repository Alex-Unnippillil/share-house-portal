BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.amenity_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id text NOT NULL,
  household_id uuid NULL,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  metadata jsonb NULL,
  CONSTRAINT amenity_booking_valid_range CHECK (end_time > start_time),
  CONSTRAINT amenity_booking_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS amenity_bookings_amenity_id_idx
  ON public.amenity_bookings (amenity_id);

CREATE INDEX IF NOT EXISTS amenity_bookings_household_idx
  ON public.amenity_bookings (household_id);

CREATE INDEX IF NOT EXISTS amenity_bookings_time_search_idx
  ON public.amenity_bookings
  USING gist (amenity_id, tstzrange(start_time, end_time, '[)'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_on_amenity_bookings'
  ) THEN
    CREATE TRIGGER set_timestamp_on_amenity_bookings
      BEFORE UPDATE ON public.amenity_bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_amenity_conflicts(
  p_amenity_id text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_household_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflicts jsonb := '[]'::jsonb;
  overlap_conflicts jsonb := '[]'::jsonb;
  buffer_conflicts jsonb := '[]'::jsonb;
  min_buffer interval := interval '15 minutes';
BEGIN
  IF p_amenity_id IS NULL THEN
    RAISE EXCEPTION 'p_amenity_id is required';
  END IF;

  IF p_end_time <= p_start_time THEN
    conflicts := conflicts || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_RANGE',
      'severity', 'error',
      'details', jsonb_build_object(
        'start_time', p_start_time,
        'end_time', p_end_time
      )
    ));

    RETURN jsonb_build_object(
      'conflicts', conflicts,
      'has_conflict', TRUE
    );
  END IF;

  IF p_start_time < timezone('utc', now()) THEN
    conflicts := conflicts || jsonb_build_array(jsonb_build_object(
      'code', 'PAST_START',
      'severity', 'error',
      'details', jsonb_build_object('start_time', p_start_time)
    ));
  END IF;

  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'code', 'TIME_OVERLAP',
        'severity', 'error',
        'details', jsonb_build_object(
          'booking_id', ab.id,
          'start_time', ab.start_time,
          'end_time', ab.end_time,
          'status', ab.status
        )
      )
    ), '[]'::jsonb)
  INTO overlap_conflicts
  FROM public.amenity_bookings ab
  WHERE ab.amenity_id = p_amenity_id
    AND (p_household_id IS NULL OR ab.household_id = p_household_id)
    AND (p_booking_id IS NULL OR ab.id <> p_booking_id)
    AND ab.status IN ('confirmed', 'pending')
    AND tstzrange(ab.start_time, ab.end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)');

  conflicts := conflicts || overlap_conflicts;

  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'code', 'BUFFER_CONFLICT',
        'severity', 'warning',
        'details', jsonb_build_object(
          'booking_id', ab.id,
          'start_time', ab.start_time,
          'end_time', ab.end_time
        )
      )
    ), '[]'::jsonb)
  INTO buffer_conflicts
  FROM public.amenity_bookings ab
  WHERE ab.amenity_id = p_amenity_id
    AND (p_household_id IS NULL OR ab.household_id = p_household_id)
    AND (p_booking_id IS NULL OR ab.id <> p_booking_id)
    AND ab.status IN ('confirmed', 'pending')
    AND (
      (ab.end_time > p_start_time - min_buffer AND ab.end_time <= p_start_time) OR
      (ab.start_time < p_end_time + min_buffer AND ab.start_time >= p_end_time)
    );

  conflicts := conflicts || buffer_conflicts;

  RETURN jsonb_build_object(
    'conflicts', conflicts,
    'has_conflict', jsonb_array_length(conflicts) > 0
  );
END;
$$;

COMMENT ON FUNCTION public.check_amenity_conflicts IS
  'Performs indexed amenity conflict detection and returns structured conflict codes with metadata.';

GRANT EXECUTE ON FUNCTION public.check_amenity_conflicts(text, timestamptz, timestamptz, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_amenity_conflicts(text, timestamptz, timestamptz, uuid, uuid) TO service_role;

COMMIT;
