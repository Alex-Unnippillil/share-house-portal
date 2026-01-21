-- Track processed Stripe webhook events to support idempotency
CREATE TABLE IF NOT EXISTS public.stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure rent payments can be deduplicated on invoice IDs
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT UNIQUE;
