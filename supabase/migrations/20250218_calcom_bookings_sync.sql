-- Amenity booking mirror table for Cal.com integration and calendar views.
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  property_id text NOT NULL,
  amenity_id text NOT NULL,
  amenity_name text NOT NULL,
  tenant_id uuid NULL,
  status text NOT NULL DEFAULT 'confirmed',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'calcom',
  source_booking_id text NULL,
  source_event_type_id text NULL,
  source_payload jsonb NULL,
  recurrence_rule jsonb NULL,
  recurrence_id text NULL,
  cancelled_at timestamptz NULL,
  cancellation_reason text NULL,
  CONSTRAINT bookings_valid_time_range CHECK (end_time > start_time),
  CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  CONSTRAINT bookings_source_check CHECK (source IN ('calcom', 'manual'))
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_source_booking_id_idx
  ON public.bookings (source, source_booking_id)
  WHERE source_booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_property_start_idx
  ON public.bookings (property_id, start_time DESC);

CREATE INDEX IF NOT EXISTS bookings_amenity_time_idx
  ON public.bookings (amenity_id, start_time DESC);

CREATE INDEX IF NOT EXISTS bookings_status_idx
  ON public.bookings (status, start_time DESC);

CREATE INDEX IF NOT EXISTS bookings_time_range_gist
  ON public.bookings USING gist (amenity_id, tstzrange(start_time, end_time, '[)'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_on_bookings'
    ) THEN
      CREATE TRIGGER set_timestamp_on_bookings
      BEFORE UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END
$$;
