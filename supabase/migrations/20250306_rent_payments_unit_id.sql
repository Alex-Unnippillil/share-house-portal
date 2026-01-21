-- Add unit_id column to rent_payments and refresh denorm trigger
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS unit_id uuid;

-- Refresh trigger to populate unit_id alongside other denormalized fields
CREATE OR REPLACE FUNCTION public.set_rent_payments_denorm_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_metadata jsonb := COALESCE(NEW.metadata, '{}'::jsonb);
  v_tenant_id uuid;
  v_unit_id uuid;
  v_target_user uuid := NEW.user_id;
  v_profile_name text;
  v_profile_unit uuid;
  v_has_units boolean := false;
  v_unit_column text;
  v_unit_label text;
BEGIN
  -- Derive tenant_id from columns or metadata when present
  IF to_jsonb(NEW) ? 'tenant_id' THEN
    BEGIN
      v_tenant_id := NULLIF(to_jsonb(NEW) ->> 'tenant_id', '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_tenant_id := NULL;
    END;
  END IF;

  IF v_tenant_id IS NULL AND v_metadata ? 'tenant_id' THEN
    BEGIN
      v_tenant_id := NULLIF(v_metadata ->> 'tenant_id', '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_tenant_id := NULL;
    END;
  END IF;

  IF v_tenant_id IS NOT NULL THEN
    v_target_user := v_tenant_id;
  END IF;

  -- Derive unit_id from explicit column value or metadata
  IF to_jsonb(NEW) ? 'unit_id' THEN
    BEGIN
      v_unit_id := NULLIF(to_jsonb(NEW) ->> 'unit_id', '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_unit_id := NULL;
    END;
  END IF;

  IF v_unit_id IS NULL AND v_metadata ? 'unit_id' THEN
    BEGIN
      v_unit_id := NULLIF(v_metadata ->> 'unit_id', '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_unit_id := NULL;
    END;
  END IF;

  -- Fetch profile details for resolved user
  SELECT p.full_name, p.unit_id
  INTO v_profile_name, v_profile_unit
  FROM public.profiles p
  WHERE p.id = v_target_user
  LIMIT 1;

  IF v_unit_id IS NULL THEN
    v_unit_id := v_profile_unit;
  END IF;

  IF v_unit_id IS NOT NULL THEN
    NEW.unit_id := v_unit_id;
  END IF;

  -- Populate payer_name
  IF NEW.payer_name IS NULL OR btrim(NEW.payer_name) = '' THEN
    IF v_profile_name IS NOT NULL AND btrim(v_profile_name) <> '' THEN
      NEW.payer_name := v_profile_name;
    ELSIF v_metadata ? 'payer_name' THEN
      NEW.payer_name := NULLIF(btrim(v_metadata ->> 'payer_name'), '');
    ELSIF v_metadata ? 'tenant_name' THEN
      NEW.payer_name := NULLIF(btrim(v_metadata ->> 'tenant_name'), '');
    ELSIF v_metadata ? 'customer_name' THEN
      NEW.payer_name := NULLIF(btrim(v_metadata ->> 'customer_name'), '');
    END IF;
  END IF;

  -- Populate unit label
  IF NEW.unit IS NULL OR btrim(NEW.unit) = '' THEN
    IF v_metadata ? 'unit_label' THEN
      NEW.unit := NULLIF(btrim(v_metadata ->> 'unit_label'), '');
    ELSIF v_metadata ? 'unit' THEN
      NEW.unit := NULLIF(btrim(v_metadata ->> 'unit'), '');
    ELSIF v_metadata ? 'unit_number' THEN
      NEW.unit := NULLIF(btrim(v_metadata ->> 'unit_number'), '');
    END IF;
  END IF;

  IF (NEW.unit IS NULL OR btrim(NEW.unit) = '') AND v_unit_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'units'
    )
    INTO v_has_units;

    IF v_has_units THEN
      SELECT column_name
      INTO v_unit_column
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'units'
        AND column_name IN ('label', 'name', 'unit_label', 'unit_number', 'code')
      ORDER BY CASE column_name
        WHEN 'label' THEN 1
        WHEN 'name' THEN 2
        WHEN 'unit_label' THEN 3
        WHEN 'unit_number' THEN 4
        WHEN 'code' THEN 5
        ELSE 6
      END
      LIMIT 1;

      IF v_unit_column IS NOT NULL THEN
        BEGIN
          EXECUTE format('SELECT %1$I::text FROM public.units WHERE id = $1 LIMIT 1', v_unit_column)
          INTO v_unit_label
          USING v_unit_id;
        EXCEPTION
          WHEN others THEN
            v_unit_label := NULL;
        END;
      END IF;
    END IF;

    IF v_unit_label IS NOT NULL AND btrim(v_unit_label) <> '' THEN
      NEW.unit := v_unit_label;
    ELSE
      NEW.unit := v_unit_id::text;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is up to date
DROP TRIGGER IF EXISTS set_rent_payments_denorm_fields ON public.rent_payments;

CREATE TRIGGER set_rent_payments_denorm_fields
  BEFORE INSERT OR UPDATE ON public.rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rent_payments_denorm_fields();

-- Backfill existing records without disturbing updated_at if possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_rent_payments_updated_at'
      AND tgrelid = 'public.rent_payments'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.rent_payments DISABLE TRIGGER update_rent_payments_updated_at';
  END IF;
END;
$$;

UPDATE public.rent_payments
SET metadata = metadata
WHERE unit_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_rent_payments_updated_at'
      AND tgrelid = 'public.rent_payments'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.rent_payments ENABLE TRIGGER update_rent_payments_updated_at';
  END IF;
END;
$$;

-- Create covering index for ledger lookups
CREATE INDEX IF NOT EXISTS idx_rent_payments_unit_processed_at
  ON public.rent_payments (unit_id, processed_at DESC);
