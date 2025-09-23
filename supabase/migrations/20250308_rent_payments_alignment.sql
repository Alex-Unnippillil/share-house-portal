-- Align rent payment records with the fields used throughout the application.

ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'rent_payments'
      AND constraint_name = 'rent_payments_status_check'
  ) THEN
    ALTER TABLE public.rent_payments DROP CONSTRAINT rent_payments_status_check;
  END IF;
END$$;

ALTER TABLE public.rent_payments
  ADD CONSTRAINT rent_payments_status_check
  CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'completed'));

CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_id ON public.rent_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_unit_id ON public.rent_payments(unit_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_processed_at ON public.rent_payments(processed_at DESC);
