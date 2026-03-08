-- Add tax-specific fields to rent_payments
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS tax_details JSONB;

-- Backfill tax information from existing metadata when available
DO $$
DECLARE
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_rent_payments_updated_at'
      AND tgrelid = 'public.rent_payments'::regclass
  )
  INTO trigger_exists;

  IF trigger_exists THEN
    EXECUTE 'ALTER TABLE public.rent_payments DISABLE TRIGGER update_rent_payments_updated_at';
  END IF;

  WITH extracted AS (
    SELECT
      id,
      NULLIF(
        COALESCE(
          metadata ->> 'tax_amount',
          metadata ->> 'taxAmount',
          metadata #>> '{tax,amount}'
        ),
        ''
      ) AS tax_amount_text,
      NULLIF(
        COALESCE(
          metadata ->> 'tax_rate',
          metadata ->> 'taxRate',
          metadata #>> '{tax,rate}'
        ),
        ''
      ) AS tax_rate_text,
      COALESCE(
        metadata -> 'tax_details',
        metadata -> 'taxDetails',
        metadata #> '{tax,details}'
      ) AS tax_details_json
    FROM public.rent_payments
    WHERE metadata IS NOT NULL
  )
  UPDATE public.rent_payments rp
  SET
    tax_amount = CASE
      WHEN rp.tax_amount IS NOT NULL THEN rp.tax_amount
      WHEN extracted.tax_amount_text IS NOT NULL
        AND extracted.tax_amount_text ~ '^-?\\d+(?:\\.\\d+)?$'
        THEN extracted.tax_amount_text::NUMERIC
      ELSE rp.tax_amount
    END,
    tax_rate = CASE
      WHEN rp.tax_rate IS NOT NULL THEN rp.tax_rate
      WHEN extracted.tax_rate_text IS NOT NULL
        AND extracted.tax_rate_text ~ '^-?\\d+(?:\\.\\d+)?$'
        THEN extracted.tax_rate_text::NUMERIC
      ELSE rp.tax_rate
    END,
    tax_details = CASE
      WHEN rp.tax_details IS NOT NULL THEN rp.tax_details
      WHEN extracted.tax_details_json IS NOT NULL THEN extracted.tax_details_json
      ELSE rp.tax_details
    END
  FROM extracted
  WHERE rp.id = extracted.id
    AND (
      (extracted.tax_amount_text IS NOT NULL AND rp.tax_amount IS NULL)
      OR (extracted.tax_rate_text IS NOT NULL AND rp.tax_rate IS NULL)
      OR (extracted.tax_details_json IS NOT NULL AND rp.tax_details IS NULL)
    );

  IF trigger_exists THEN
    EXECUTE 'ALTER TABLE public.rent_payments ENABLE TRIGGER update_rent_payments_updated_at';
  END IF;
END;
$$;
