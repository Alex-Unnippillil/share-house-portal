-- Track whether residents have completed the dashboard first-run tour.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'has_seen_tour'
    ) THEN
      EXECUTE 'ALTER TABLE public.profiles ADD COLUMN has_seen_tour boolean DEFAULT false';
    END IF;

    EXECUTE 'UPDATE public.profiles SET has_seen_tour = COALESCE(has_seen_tour, false)';
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN has_seen_tour SET DEFAULT false';
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN has_seen_tour SET NOT NULL';
    EXECUTE $$COMMENT ON COLUMN public.profiles.has_seen_tour IS ''Tracks whether the dashboard onboarding tour has been completed.''$$;
  END IF;
END $$;
