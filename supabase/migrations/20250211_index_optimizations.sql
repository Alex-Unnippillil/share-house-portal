-- Optimize frequently executed queries on profiles, documents, and bookings tables.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'unit_id'
    ) = 1 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_unit_id ON public.profiles(unit_id)';
    END IF;

    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name IN ('unit_id', 'role')
    ) = 2 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_unit_role ON public.profiles(unit_id, role)';
    END IF;

    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'email'
    ) = 1 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name IN ('tenant_id', 'status', 'created_at')
    ) = 3 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_tenant_status_created_at ON public.documents(tenant_id, status, created_at DESC)';
    END IF;

    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name IN ('unit_id', 'status')
    ) = 2 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_unit_status ON public.documents(unit_id, status)';
    END IF;

    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'documenso_envelope_id'
    ) = 1 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_envelope_id ON public.documents(documenso_envelope_id)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name IN ('building_id', 'start_time')
    ) = 2 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_building_start_time ON public.bookings(building_id, start_time DESC)';
    END IF;

    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name IN ('amenity_id', 'start_time')
    ) = 2 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_amenity_time_window ON public.bookings(amenity_id, start_time DESC)';
    END IF;

    IF (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name IN ('created_by', 'status', 'start_time')
    ) = 3 THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_creator_status ON public.bookings(created_by, status, start_time DESC)';
    END IF;
  END IF;
END $$;
