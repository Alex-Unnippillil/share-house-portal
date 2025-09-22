-- Ensure leases table has unit_id column for index support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leases'
      AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE public.leases
      ADD COLUMN unit_id UUID;
  END IF;
END
$$;

-- Partial index to accelerate lookups of active leases by unit
CREATE INDEX IF NOT EXISTS leases_active_idx
  ON public.leases (unit_id)
  WHERE status = 'active';
