BEGIN;

CREATE TABLE IF NOT EXISTS public.data_integrity_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_type text NOT NULL CHECK (finding_type IN ('booking_duplicate', 'payment_mismatch', 'document_stale')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
  finding_key text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz,
  UNIQUE (finding_type, finding_key, detected_at)
);

CREATE INDEX IF NOT EXISTS idx_data_integrity_findings_open
  ON public.data_integrity_findings (finding_type, detected_at DESC)
  WHERE resolved_at IS NULL;

CREATE OR REPLACE FUNCTION public.capture_integrity_findings()
RETURNS TABLE (finding_type text, inserted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_inserted integer := 0;
  payment_inserted integer := 0;
  document_inserted integer := 0;
BEGIN
  WITH duplicated_bookings AS (
    SELECT
      b.property_id,
      b.amenity_id,
      b.start_time,
      b.end_time,
      ARRAY_AGG(b.id ORDER BY b.created_at) AS booking_ids,
      count(*) AS duplicate_count
    FROM public.bookings b
    WHERE b.status IN ('pending', 'confirmed')
    GROUP BY b.property_id, b.amenity_id, b.start_time, b.end_time
    HAVING count(*) > 1
  ), inserted AS (
    INSERT INTO public.data_integrity_findings (finding_type, severity, finding_key, details)
    SELECT
      'booking_duplicate',
      'critical',
      format('%s:%s:%s:%s', property_id, amenity_id, start_time, end_time),
      jsonb_build_object(
        'property_id', property_id,
        'amenity_id', amenity_id,
        'start_time', start_time,
        'end_time', end_time,
        'booking_ids', booking_ids,
        'duplicate_count', duplicate_count
      )
    FROM duplicated_bookings
    RETURNING 1
  )
  SELECT count(*) INTO booking_inserted FROM inserted;

  WITH payment_mismatches AS (
    SELECT
      rp.id,
      rp.status,
      rp.paid_at,
      rp.amount,
      rp.metadata->>'provider_amount' AS provider_amount,
      rp.stripe_payment_intent_id
    FROM public.rent_payments rp
    WHERE (rp.status = 'succeeded' AND rp.paid_at IS NULL)
       OR (rp.status IN ('failed', 'cancelled', 'refunded') AND rp.paid_at IS NOT NULL)
       OR (
         rp.metadata ? 'provider_amount'
         AND (rp.metadata->>'provider_amount') ~ '^[0-9]+$'
         AND (rp.metadata->>'provider_amount')::integer <> rp.amount
       )
  ), inserted AS (
    INSERT INTO public.data_integrity_findings (finding_type, severity, finding_key, details)
    SELECT
      'payment_mismatch',
      'critical',
      id::text,
      jsonb_build_object(
        'status', status,
        'paid_at', paid_at,
        'amount', amount,
        'provider_amount', provider_amount,
        'stripe_payment_intent_id', stripe_payment_intent_id
      )
    FROM payment_mismatches
    RETURNING 1
  )
  SELECT count(*) INTO payment_inserted FROM inserted;

  WITH stale_documents AS (
    SELECT
      d.id,
      d.status,
      d.updated_at,
      d.metadata->>'documenso_envelope_id' AS envelope_id
    FROM public.documents d
    WHERE d.status = 'pending_signature'
      AND d.updated_at < timezone('utc', now()) - interval '14 days'
  ), inserted AS (
    INSERT INTO public.data_integrity_findings (finding_type, severity, finding_key, details)
    SELECT
      'document_stale',
      'warning',
      id::text,
      jsonb_build_object(
        'status', status,
        'updated_at', updated_at,
        'documenso_envelope_id', envelope_id
      )
    FROM stale_documents
    RETURNING 1
  )
  SELECT count(*) INTO document_inserted FROM inserted;

  RETURN QUERY
  VALUES
    ('booking_duplicate', booking_inserted),
    ('payment_mismatch', payment_inserted),
    ('document_stale', document_inserted);
END;
$$;

COMMENT ON FUNCTION public.capture_integrity_findings()
IS 'Captures booking duplicates, payment mismatches, and stale documents into data_integrity_findings.';

DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule('capture-integrity-findings')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'capture-integrity-findings');

    PERFORM cron.schedule(
      'capture-integrity-findings',
      '*/30 * * * *',
      $$SELECT public.capture_integrity_findings();$$
    );
  END IF;
END
$$;

COMMIT;
