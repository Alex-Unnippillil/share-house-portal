ALTER TABLE IF EXISTS public.amenities
ADD COLUMN IF NOT EXISTS open_hours jsonb;

ALTER TABLE IF EXISTS public.amenities
ADD COLUMN IF NOT EXISTS buffer_minutes integer;

ALTER TABLE IF EXISTS public.amenities
ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.amenities.open_hours IS 'Structured booking availability windows keyed by weekday.';
COMMENT ON COLUMN public.amenities.buffer_minutes IS 'Minutes enforced between consecutive bookings.';
COMMENT ON COLUMN public.amenities.capacity IS 'Maximum simultaneous participants per booking slot.';
