-- Shared supply ledger schema for tracking purchases and roommate balances

-- Create table for supply purchases
CREATE TABLE IF NOT EXISTS public.supply_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL CHECK (total_cost >= 0),
  purchased_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create table for roommate shares of each supply purchase
CREATE TABLE IF NOT EXISTS public.supply_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supply_id UUID NOT NULL REFERENCES public.supply_purchases(id) ON DELETE CASCADE,
  creditor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  debtor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_amount NUMERIC(12,2) NOT NULL CHECK (share_amount >= 0),
  status TEXT NOT NULL DEFAULT 'unsettled' CHECK (status IN ('unsettled', 'settled', 'waived')),
  due_date DATE,
  settled_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Helpful indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_supply_purchases_purchased_by ON public.supply_purchases(purchased_by);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_purchased_at ON public.supply_purchases(purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_supply_shares_supply_id ON public.supply_shares(supply_id);
CREATE INDEX IF NOT EXISTS idx_supply_shares_creditor_id ON public.supply_shares(creditor_profile_id);
CREATE INDEX IF NOT EXISTS idx_supply_shares_debtor_id ON public.supply_shares(debtor_profile_id);
CREATE INDEX IF NOT EXISTS idx_supply_shares_status ON public.supply_shares(status);
CREATE INDEX IF NOT EXISTS idx_supply_shares_due_date ON public.supply_shares(due_date);

-- Updated_at triggers reuse the shared helper
CREATE TRIGGER IF NOT EXISTS update_supply_purchases_updated_at
  BEFORE UPDATE ON public.supply_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_supply_shares_updated_at
  BEFORE UPDATE ON public.supply_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable row level security with authenticated access policies
ALTER TABLE public.supply_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated users can view supply purchases"
  ON public.supply_purchases FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Purchasers can insert supply purchases"
  ON public.supply_purchases FOR INSERT
  WITH CHECK (auth.uid() = purchased_by);

CREATE POLICY IF NOT EXISTS "Purchasers can update supply purchases"
  ON public.supply_purchases FOR UPDATE
  USING (auth.uid() = purchased_by)
  WITH CHECK (auth.uid() = purchased_by);

CREATE POLICY IF NOT EXISTS "Authenticated users can view supply shares"
  ON public.supply_shares FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Participants can insert supply shares"
  ON public.supply_shares FOR INSERT
  WITH CHECK (auth.uid() = creditor_profile_id OR auth.uid() = debtor_profile_id);

CREATE POLICY IF NOT EXISTS "Participants can update supply shares"
  ON public.supply_shares FOR UPDATE
  USING (auth.uid() = creditor_profile_id OR auth.uid() = debtor_profile_id)
  WITH CHECK (auth.uid() = creditor_profile_id OR auth.uid() = debtor_profile_id);

-- View with the full set of unsettled ledger entries
CREATE OR REPLACE VIEW public.v_supply_ledger_unsettled AS
SELECT
  ss.id AS share_id,
  ss.supply_id,
  sp.item_name,
  sp.total_cost,
  ss.share_amount,
  ss.due_date,
  ss.status,
  ss.note,
  sp.purchased_at,
  DATE_TRUNC('month', sp.purchased_at)::DATE AS purchased_month,
  ss.creditor_profile_id AS creditor_id,
  creditor.full_name AS creditor_name,
  creditor.email AS creditor_email,
  creditor.avatar_url AS creditor_avatar_url,
  ss.debtor_profile_id AS debtor_id,
  debtor.full_name AS debtor_name,
  debtor.email AS debtor_email,
  debtor.avatar_url AS debtor_avatar_url
FROM public.supply_shares ss
JOIN public.supply_purchases sp ON sp.id = ss.supply_id
LEFT JOIN public.profiles creditor ON creditor.id = ss.creditor_profile_id
LEFT JOIN public.profiles debtor ON debtor.id = ss.debtor_profile_id
WHERE ss.status = 'unsettled';

-- Aggregated balances per roommate and month
CREATE OR REPLACE VIEW public.v_supply_ledger_member_balances AS
WITH unsettled AS (
  SELECT
    ss.share_amount,
    ss.creditor_profile_id,
    ss.debtor_profile_id,
    DATE_TRUNC('month', sp.purchased_at)::DATE AS period_start
  FROM public.supply_shares ss
  JOIN public.supply_purchases sp ON sp.id = ss.supply_id
  WHERE ss.status = 'unsettled'
),
owed AS (
  SELECT
    debtor_profile_id AS profile_id,
    period_start,
    SUM(share_amount) AS total_owed
  FROM unsettled
  GROUP BY debtor_profile_id, period_start
),
owing AS (
  SELECT
    creditor_profile_id AS profile_id,
    period_start,
    SUM(share_amount) AS total_owing
  FROM unsettled
  GROUP BY creditor_profile_id, period_start
)
SELECT
  COALESCE(owed.profile_id, owing.profile_id) AS profile_id,
  COALESCE(owed.period_start, owing.period_start) AS period_start,
  pr.full_name,
  pr.email,
  pr.avatar_url,
  COALESCE(owed.total_owed, 0) AS total_owed,
  COALESCE(owing.total_owing, 0) AS total_owing,
  COALESCE(owing.total_owing, 0) - COALESCE(owed.total_owed, 0) AS net_balance
FROM owed
FULL OUTER JOIN owing
  ON owed.profile_id = owing.profile_id AND owed.period_start = owing.period_start
LEFT JOIN public.profiles pr ON pr.id = COALESCE(owed.profile_id, owing.profile_id);

-- View for quickly retrieving available unsettled months
CREATE OR REPLACE VIEW public.v_supply_ledger_months AS
SELECT DISTINCT
  DATE_TRUNC('month', sp.purchased_at)::DATE AS period_start
FROM public.supply_shares ss
JOIN public.supply_purchases sp ON sp.id = ss.supply_id
WHERE ss.status = 'unsettled';
