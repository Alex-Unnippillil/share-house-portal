-- External provider reconciliation checks.
-- Usage:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/provider_reconciliation_checks.sql

BEGIN;

-- Stripe reconciliation:
-- 1) Succeeded payments must have paid_at.
-- 2) failed/cancelled payments should not have paid_at.
-- 3) Payment intents should have a processed webhook record.
WITH payment_state_issues AS (
  SELECT id
  FROM public.rent_payments
  WHERE (status = 'succeeded' AND paid_at IS NULL)
     OR (status IN ('failed', 'cancelled', 'refunded') AND paid_at IS NOT NULL)
),
webhook_issues AS (
  SELECT rp.id
  FROM public.rent_payments rp
  WHERE rp.stripe_payment_intent_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.webhook_events we
      WHERE we.provider = 'stripe'
        AND we.status = 'processed'
        AND we.payload::text ILIKE '%' || rp.stripe_payment_intent_id || '%'
    )
),
booking_issues AS (
  SELECT b.id
  FROM public.bookings b
  WHERE b.metadata ? 'calcom_booking_id'
    AND b.status <> 'cancelled'
    AND (b.end_time <= b.start_time)
),
document_issues AS (
  SELECT d.id
  FROM public.documents d
  WHERE d.metadata ? 'documenso_envelope_id'
    AND (
      (d.status = 'signed' AND coalesce(d.file_url, '') = '')
      OR (d.status IN ('draft', 'cancelled') AND d.metadata ? 'documenso_completed_at')
    )
)
SELECT
  (SELECT count(*) FROM payment_state_issues) AS payment_state_mismatch_count,
  (SELECT count(*) FROM webhook_issues) AS payment_webhook_gap_count,
  (SELECT count(*) FROM booking_issues) AS booking_reconciliation_count,
  (SELECT count(*) FROM document_issues) AS document_reconciliation_count;

DO $$
DECLARE
  payment_state_mismatch_count integer;
  payment_webhook_gap_count integer;
  booking_reconciliation_count integer;
  document_reconciliation_count integer;
BEGIN
  SELECT count(*) INTO payment_state_mismatch_count
  FROM public.rent_payments
  WHERE (status = 'succeeded' AND paid_at IS NULL)
     OR (status IN ('failed', 'cancelled', 'refunded') AND paid_at IS NOT NULL);

  SELECT count(*) INTO payment_webhook_gap_count
  FROM public.rent_payments rp
  WHERE rp.stripe_payment_intent_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.webhook_events we
      WHERE we.provider = 'stripe'
        AND we.status = 'processed'
        AND we.payload::text ILIKE '%' || rp.stripe_payment_intent_id || '%'
    );

  SELECT count(*) INTO booking_reconciliation_count
  FROM public.bookings b
  WHERE b.metadata ? 'calcom_booking_id'
    AND b.status <> 'cancelled'
    AND (b.end_time <= b.start_time);

  SELECT count(*) INTO document_reconciliation_count
  FROM public.documents d
  WHERE d.metadata ? 'documenso_envelope_id'
    AND (
      (d.status = 'signed' AND coalesce(d.file_url, '') = '')
      OR (d.status IN ('draft', 'cancelled') AND d.metadata ? 'documenso_completed_at')
    );

  IF payment_state_mismatch_count + payment_webhook_gap_count + booking_reconciliation_count + document_reconciliation_count > 0 THEN
    RAISE EXCEPTION USING MESSAGE = format(
      'Reconciliation failures found (payment-state=%s, payment-webhook=%s, bookings=%s, documents=%s)',
      payment_state_mismatch_count,
      payment_webhook_gap_count,
      booking_reconciliation_count,
      document_reconciliation_count
    );
  END IF;
END
$$;

ROLLBACK;
