BEGIN;

-- Extend amenity bookings with references to the core tenant hierarchy
ALTER TABLE public.amenity_bookings
  ADD COLUMN IF NOT EXISTS unit_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'amenity_bookings_unit_id_fkey'
  ) THEN
    ALTER TABLE public.amenity_bookings
      ADD CONSTRAINT amenity_bookings_unit_id_fkey
      FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'amenity_bookings_household_id_fkey'
  ) THEN
    ALTER TABLE public.amenity_bookings
      ADD CONSTRAINT amenity_bookings_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'amenity_bookings_created_by_fkey'
  ) THEN
    ALTER TABLE public.amenity_bookings
      ADD CONSTRAINT amenity_bookings_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'amenity_bookings_amenity_slug_fkey'
  ) THEN
    ALTER TABLE public.amenity_bookings
      ADD CONSTRAINT amenity_bookings_amenity_slug_fkey
      FOREIGN KEY (amenity_id) REFERENCES public.amenities(slug) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS amenity_bookings_unit_idx
  ON public.amenity_bookings(unit_id);

ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Residents view amenity bookings" ON public.amenity_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid()
        AND (
          (public.amenity_bookings.unit_id IS NOT NULL AND ctx.unit_id = public.amenity_bookings.unit_id) OR
          (public.amenity_bookings.household_id IS NOT NULL AND ctx.household_id = public.amenity_bookings.household_id)
        )
    )
  );

CREATE POLICY IF NOT EXISTS "Residents create amenity bookings" ON public.amenity_bookings
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid()
        AND (
          (public.amenity_bookings.unit_id IS NOT NULL AND ctx.unit_id = public.amenity_bookings.unit_id) OR
          (public.amenity_bookings.household_id IS NOT NULL AND ctx.household_id = public.amenity_bookings.household_id)
        )
    )
  );

CREATE POLICY IF NOT EXISTS "Residents update their amenity bookings" ON public.amenity_bookings
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Property staff manage amenity bookings" ON public.amenity_bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

-- Enrich rent payments with full tenancy context
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS unit_id UUID,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rent_payments_status_check'
  ) THEN
    ALTER TABLE public.rent_payments
      DROP CONSTRAINT rent_payments_status_check;
  END IF;
END;
$$;

ALTER TABLE public.rent_payments
  ADD CONSTRAINT rent_payments_status_check
  CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'completed'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rent_payments_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.rent_payments
      ADD CONSTRAINT rent_payments_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rent_payments_unit_id_fkey'
  ) THEN
    ALTER TABLE public.rent_payments
      ADD CONSTRAINT rent_payments_unit_id_fkey
      FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_id
  ON public.rent_payments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_rent_payments_unit_id
  ON public.rent_payments(unit_id);

CREATE INDEX IF NOT EXISTS idx_rent_payments_processed_at
  ON public.rent_payments(processed_at DESC);

-- Default tenant_id to user_id for historical rows
UPDATE public.rent_payments
SET tenant_id = user_id
WHERE tenant_id IS NULL;

-- Document and request tables now enforce referential integrity with units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_unit_id_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_unit_id_fkey
      FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_requests_unit_id_fkey'
  ) THEN
    ALTER TABLE public.maintenance_requests
      ADD CONSTRAINT maintenance_requests_unit_id_fkey
      FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;
END;
$$;

COMMIT;
