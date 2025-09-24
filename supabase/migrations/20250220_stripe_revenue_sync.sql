-- Stripe revenue sync schema additions

-- Table for storing Stripe invoices
CREATE TABLE IF NOT EXISTS public.stripe_invoices (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_email TEXT,
  subscription_id TEXT,
  status TEXT,
  collection_method TEXT,
  currency TEXT NOT NULL,
  total INTEGER,
  amount_due INTEGER,
  amount_paid INTEGER,
  amount_remaining INTEGER,
  hosted_invoice_url TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  livemode BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  stripe_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing Stripe invoice line items
CREATE TABLE IF NOT EXISTS public.stripe_invoice_line_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES public.stripe_invoices(id) ON DELETE CASCADE,
  price_id TEXT,
  product_id TEXT,
  description TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  proration BOOLEAN DEFAULT FALSE,
  quantity INTEGER,
  livemode BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing Stripe payment intents linked to invoices
CREATE TABLE IF NOT EXISTS public.stripe_payment_intents (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  invoice_id TEXT REFERENCES public.stripe_invoices(id) ON DELETE SET NULL,
  status TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT,
  description TEXT,
  receipt_email TEXT,
  latest_charge TEXT,
  livemode BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  stripe_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_updated_at TIMESTAMP WITH TIME ZONE,
  succeeded_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to log sync executions
CREATE TABLE IF NOT EXISTS public.stripe_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  run_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  run_completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  invoice_count INTEGER DEFAULT 0,
  line_item_count INTEGER DEFAULT 0,
  payment_intent_count INTEGER DEFAULT 0,
  error_message TEXT
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_customer_id ON public.stripe_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_subscription_id ON public.stripe_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_created_at ON public.stripe_invoices(stripe_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_invoice_line_items_invoice_id ON public.stripe_invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoice_line_items_period ON public.stripe_invoice_line_items(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_invoice_id ON public.stripe_payment_intents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_created_at ON public.stripe_payment_intents(stripe_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_sync_runs_started_at ON public.stripe_sync_runs(run_started_at DESC);

-- Enable RLS so only staff can read this data
ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_sync_runs ENABLE ROW LEVEL SECURITY;

-- Property managers and admins may read the synced data
CREATE POLICY IF NOT EXISTS "Property staff can view stripe invoices" ON public.stripe_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Property staff can view stripe invoice line items" ON public.stripe_invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Property staff can view stripe payment intents" ON public.stripe_payment_intents
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Property staff can view stripe sync runs" ON public.stripe_sync_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Keep timestamps fresh
CREATE TRIGGER update_stripe_invoices_updated_at
  BEFORE UPDATE ON public.stripe_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_invoice_line_items_updated_at
  BEFORE UPDATE ON public.stripe_invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_payment_intents_updated_at
  BEFORE UPDATE ON public.stripe_payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculated view for deferred vs recognized revenue in cents
CREATE OR REPLACE VIEW public.finance_revenue_summary AS
WITH normalized AS (
  SELECT
    li.id AS line_item_id,
    li.invoice_id,
    i.customer_id,
    i.customer_email,
    i.subscription_id,
    i.status AS invoice_status,
    li.amount AS total_amount_cents,
    li.currency,
    li.period_start,
    li.period_end,
    timezone('utc', NOW()) AS calculation_time,
    CASE
      WHEN li.period_start IS NULL OR li.period_end IS NULL OR li.period_end <= li.period_start THEN
        CASE
          WHEN i.status IN ('paid', 'void', 'uncollectible') THEN li.amount
          ELSE 0
        END
      WHEN timezone('utc', NOW()) <= li.period_start THEN 0
      WHEN timezone('utc', NOW()) >= li.period_end THEN li.amount
      ELSE
        LEAST(
          li.amount,
          GREATEST(
            ROUND(
              li.amount::NUMERIC *
              EXTRACT(EPOCH FROM (LEAST(timezone('utc', NOW()), li.period_end) - li.period_start)) /
              NULLIF(EXTRACT(EPOCH FROM (li.period_end - li.period_start)), 0)
            ),
            0
          )::BIGINT
        )
    END AS recognized_amount_cents
  FROM public.stripe_invoice_line_items li
  JOIN public.stripe_invoices i ON i.id = li.invoice_id
),
reconciled AS (
  SELECT
    line_item_id,
    invoice_id,
    customer_id,
    customer_email,
    subscription_id,
    invoice_status,
    total_amount_cents,
    currency,
    period_start,
    period_end,
    calculation_time,
    recognized_amount_cents,
    GREATEST(total_amount_cents - recognized_amount_cents, 0) AS deferred_amount_cents
  FROM normalized
)
SELECT
  invoice_id,
  line_item_id,
  customer_id,
  customer_email,
  subscription_id,
  invoice_status,
  total_amount_cents,
  recognized_amount_cents,
  deferred_amount_cents,
  currency,
  period_start,
  period_end,
  calculation_time
FROM reconciled;

