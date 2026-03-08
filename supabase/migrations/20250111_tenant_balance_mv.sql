-- Ensure rent_payments has the columns expected by the application logic
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS unit_id UUID,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end DATE;

-- Allow the completed status used by Stripe webhooks
ALTER TABLE public.rent_payments
  DROP CONSTRAINT IF EXISTS rent_payments_status_check;

ALTER TABLE public.rent_payments
  ADD CONSTRAINT rent_payments_status_check
  CHECK (
    status IN ('pending', 'succeeded', 'failed', 'cancelled', 'completed')
  );

-- Index tenant_id lookups that back the materialized view
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_id
  ON public.rent_payments (tenant_id);

-- Materialized view aggregating tenant balances by month
CREATE MATERIALIZED VIEW public.tenant_balance_mv AS
WITH source AS (
  SELECT
    tenant_id,
    date_trunc(
      'month',
      COALESCE(billing_period_start::timestamp, processed_at, created_at)
    )::date AS month,
    COALESCE(currency, 'USD') AS currency,
    status,
    amount::bigint AS amount,
    COALESCE(processed_at, created_at) AS effective_at
  FROM public.rent_payments
  WHERE tenant_id IS NOT NULL
)
SELECT
  tenant_id,
  month,
  MAX(currency) AS currency,
  COUNT(*)::bigint AS payment_count,
  SUM(amount)::bigint AS gross_amount,
  COALESCE(
    SUM(amount) FILTER (WHERE status IN ('succeeded', 'completed')),
    0
  )::bigint AS succeeded_amount,
  COALESCE(
    SUM(amount) FILTER (WHERE status = 'pending'),
    0
  )::bigint AS pending_amount,
  COALESCE(
    SUM(amount) FILTER (WHERE status IN ('failed', 'cancelled')),
    0
  )::bigint AS failed_amount,
  COALESCE(
    SUM(amount) FILTER (WHERE status IN ('succeeded', 'completed')),
    0
  ) - COALESCE(
    SUM(amount) FILTER (WHERE status IN ('failed', 'cancelled')),
    0
  ) AS net_amount,
  (ARRAY_AGG(status ORDER BY effective_at DESC))[1] AS latest_status,
  (ARRAY_AGG(amount ORDER BY effective_at DESC))[1] AS last_payment_amount,
  MAX(effective_at) AS last_payment_at
FROM source
GROUP BY tenant_id, month;

-- Unique index + primary key for concurrent refresh support
CREATE UNIQUE INDEX tenant_balance_mv_tenant_month_idx
  ON public.tenant_balance_mv (tenant_id, month);

ALTER MATERIALIZED VIEW public.tenant_balance_mv
  ADD CONSTRAINT tenant_balance_mv_pkey
  PRIMARY KEY USING INDEX tenant_balance_mv_tenant_month_idx;

-- Populate the materialized view on creation
REFRESH MATERIALIZED VIEW public.tenant_balance_mv;

-- Trigger to refresh the materialized view whenever rent_payments change
CREATE OR REPLACE FUNCTION public.refresh_tenant_balance_mv()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Avoid nested trigger invocations
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  REFRESH MATERIALIZED VIEW public.tenant_balance_mv;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_tenant_balance_mv_trigger
  ON public.rent_payments;

CREATE TRIGGER refresh_tenant_balance_mv_trigger
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
ON public.rent_payments
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_tenant_balance_mv();
