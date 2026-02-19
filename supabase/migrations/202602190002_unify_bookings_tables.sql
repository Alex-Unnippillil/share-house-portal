BEGIN;

-- Consolidate booking access controls on the canonical public.bookings table.
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookings scoped" ON public.bookings;
CREATE POLICY "Bookings scoped" ON public.bookings
  FOR SELECT USING (
    auth.uid() = tenant_id
    OR public.can_access_user(tenant_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Bookings create" ON public.bookings;
CREATE POLICY "Bookings create" ON public.bookings
  FOR INSERT WITH CHECK (
    auth.uid() = tenant_id
    OR public.can_access_user(tenant_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Bookings update" ON public.bookings;
CREATE POLICY "Bookings update" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = tenant_id
    OR public.can_access_user(tenant_id)
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = tenant_id
    OR public.can_access_user(tenant_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Bookings delete" ON public.bookings;
CREATE POLICY "Bookings delete" ON public.bookings
  FOR DELETE USING (
    auth.uid() = tenant_id
    OR public.can_access_user(tenant_id)
    OR public.is_admin()
  );

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
          'booking_id', b.id,
          'start_time', b.start_time,
          'end_time', b.end_time,
          'status', b.status
        )
      )
    ), '[]'::jsonb)
  INTO overlap_conflicts
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.tenant_id
  WHERE b.amenity_id = p_amenity_id
    AND (p_household_id IS NULL OR p.unit_id = p_household_id)
    AND (p_booking_id IS NULL OR b.id <> p_booking_id)
    AND b.status IN ('confirmed', 'pending')
    AND tstzrange(b.start_time, b.end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)');

  conflicts := conflicts || overlap_conflicts;

  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'code', 'BUFFER_CONFLICT',
        'severity', 'warning',
        'details', jsonb_build_object(
          'booking_id', b.id,
          'start_time', b.start_time,
          'end_time', b.end_time
        )
      )
    ), '[]'::jsonb)
  INTO buffer_conflicts
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.tenant_id
  WHERE b.amenity_id = p_amenity_id
    AND (p_household_id IS NULL OR p.unit_id = p_household_id)
    AND (p_booking_id IS NULL OR b.id <> p_booking_id)
    AND b.status IN ('confirmed', 'pending')
    AND (
      (b.end_time > p_start_time - min_buffer AND b.end_time <= p_start_time) OR
      (b.start_time < p_end_time + min_buffer AND b.start_time >= p_end_time)
    );

  conflicts := conflicts || buffer_conflicts;

  RETURN jsonb_build_object(
    'conflicts', conflicts,
    'has_conflict', jsonb_array_length(conflicts) > 0
  );
END;
$$;

DROP TABLE IF EXISTS public.amenity_bookings;

CREATE VIEW public.amenity_bookings AS
SELECT
  b.id,
  b.amenity_id,
  p.unit_id AS household_id,
  COALESCE(b.tenant_id, b.created_by) AS created_by,
  b.status,
  b.start_time,
  b.end_time,
  b.created_at,
  b.updated_at,
  COALESCE(b.source_payload, '{}'::jsonb) AS metadata
FROM public.bookings b
LEFT JOIN public.profiles p ON p.id = b.tenant_id;

COMMENT ON VIEW public.amenity_bookings IS
  'Compatibility view over public.bookings. Canonical booking writes should target public.bookings.';

COMMIT;
