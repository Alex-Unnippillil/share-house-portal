CREATE TABLE IF NOT EXISTS public.amenity_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timeslot tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT amenity_blackouts_valid_range CHECK (starts_at < ends_at)
);

CREATE INDEX IF NOT EXISTS amenity_blackouts_amenity_timeslot_idx
  ON public.amenity_blackouts USING gist (amenity_id, timeslot);

CREATE INDEX IF NOT EXISTS amenity_blackouts_amenity_window_idx
  ON public.amenity_blackouts (amenity_id, starts_at, ends_at);

ALTER TABLE public.amenity_blackouts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.amenity_blackouts IS 'Administrative amenity downtime windows to block scheduling.';
COMMENT ON COLUMN public.amenity_blackouts.timeslot IS 'Derived range capturing the blackout window in [start, end) format.';
-- Remember to create RLS policies tailored to your access patterns.
