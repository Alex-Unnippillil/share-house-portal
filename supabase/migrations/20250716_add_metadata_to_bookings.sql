DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name = 'metadata'
    ) THEN
      ALTER TABLE public.bookings
        ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

      COMMENT ON COLUMN public.bookings.metadata IS
        'Key/value map of Cal.com custom responses persisted from scheduling flows.';
    END IF;
  ELSE
    RAISE NOTICE 'Table public.bookings does not exist yet. Skipping metadata column migration.';
  END IF;
END;
$$;
