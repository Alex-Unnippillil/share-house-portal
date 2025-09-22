-- Schema for rent invoices and shared supply roll-ins

CREATE TABLE IF NOT EXISTS public.supply_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  share_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_month TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'pending', 'invoiced', 'paid', 'dismissed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rent_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  billing_month TEXT NOT NULL,
  due_date DATE NOT NULL,
  rent_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  supply_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'paid', 'overdue', 'cancelled')),
  memo TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rent_invoice_supply_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.rent_invoices (id) ON DELETE CASCADE,
  supply_share_id UUID NOT NULL REFERENCES public.supply_shares (id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_id, supply_share_id)
);

CREATE INDEX IF NOT EXISTS supply_shares_member_id_idx ON public.supply_shares (member_id);
CREATE INDEX IF NOT EXISTS supply_shares_status_idx ON public.supply_shares (status);
CREATE INDEX IF NOT EXISTS rent_invoices_member_id_idx ON public.rent_invoices (member_id);
CREATE INDEX IF NOT EXISTS rent_invoices_status_idx ON public.rent_invoices (status);
CREATE INDEX IF NOT EXISTS rent_invoices_billing_month_idx ON public.rent_invoices (billing_month);
CREATE INDEX IF NOT EXISTS rent_invoice_supply_shares_invoice_idx ON public.rent_invoice_supply_shares (invoice_id);

-- Keep updated_at timestamps in sync
CREATE TRIGGER update_supply_shares_updated_at
  BEFORE UPDATE ON public.supply_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_invoices_updated_at
  BEFORE UPDATE ON public.rent_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable row level security
ALTER TABLE public.supply_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_invoice_supply_shares ENABLE ROW LEVEL SECURITY;

-- Roommates can view their own supply shares
CREATE POLICY IF NOT EXISTS "Roommates can view their supply shares" ON public.supply_shares
  FOR SELECT
  USING (member_id = auth.uid());

-- Admins and property managers can manage supply shares
CREATE POLICY IF NOT EXISTS "Admins manage supply shares" ON public.supply_shares
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    )
  );

-- Roommates can view their rent invoices
CREATE POLICY IF NOT EXISTS "Roommates view rent invoices" ON public.rent_invoices
  FOR SELECT
  USING (member_id = auth.uid());

-- Admins and property managers manage rent invoices
CREATE POLICY IF NOT EXISTS "Admins manage rent invoices" ON public.rent_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    )
  );

-- Admin access to invoice supply links
CREATE POLICY IF NOT EXISTS "Admins manage invoice supply links" ON public.rent_invoice_supply_shares
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    )
  );

-- Allow roommates to view their own supply links
CREATE POLICY IF NOT EXISTS "Roommates view invoice supply links" ON public.rent_invoice_supply_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.rent_invoices ri
      WHERE ri.id = rent_invoice_supply_shares.invoice_id AND ri.member_id = auth.uid()
    )
  );
