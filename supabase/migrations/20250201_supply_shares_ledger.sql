-- Supply share settlement ledger tables and automation

-- Enum types for supply shares
CREATE TYPE public.supply_share_status AS ENUM ('open', 'settled');
CREATE TYPE public.supply_share_settlement_method AS ENUM ('off_app', 'rent_roll_in');
CREATE TYPE public.supply_share_event_type AS ENUM ('created', 'settled', 'reopened');

-- Shared supplies ledger table
CREATE TABLE public.supply_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roommate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.supply_share_status NOT NULL DEFAULT 'open',
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID REFERENCES public.profiles(id),
  settlement_method public.supply_share_settlement_method,
  settlement_invoice_id TEXT,
  settlement_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supply_shares_roommate_id ON public.supply_shares(roommate_id);
CREATE INDEX idx_supply_shares_status ON public.supply_shares(status);
CREATE INDEX idx_supply_shares_created_at ON public.supply_shares(created_at DESC);

-- Audit events for supply share changes
CREATE TABLE public.supply_share_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.supply_shares(id) ON DELETE CASCADE,
  event_type public.supply_share_event_type NOT NULL,
  previous_status public.supply_share_status,
  new_status public.supply_share_status,
  settlement_method public.supply_share_settlement_method,
  settlement_invoice_id TEXT,
  note TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_supply_share_events_share_id ON public.supply_share_audit_events(share_id);
CREATE INDEX idx_supply_share_events_type ON public.supply_share_audit_events(event_type);
CREATE INDEX idx_supply_share_events_created_at ON public.supply_share_audit_events(created_at DESC);

-- Ensure timestamps stay fresh
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supply_shares_updated_at
  BEFORE UPDATE ON public.supply_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit helpers
CREATE OR REPLACE FUNCTION public.log_supply_share_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.supply_share_audit_events (
    share_id,
    event_type,
    new_status,
    context,
    created_by
  )
  VALUES (
    NEW.id,
    'created',
    NEW.status,
    jsonb_build_object(
      'amount', NEW.amount,
      'currency', NEW.currency,
      'description', NEW.description,
      'roommate_id', NEW.roommate_id
    ),
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_supply_share_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'settled' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.supply_share_audit_events (
      share_id,
      event_type,
      previous_status,
      new_status,
      settlement_method,
      settlement_invoice_id,
      note,
      context,
      created_by
    )
    VALUES (
      NEW.id,
      'settled',
      OLD.status,
      NEW.status,
      NEW.settlement_method,
      NEW.settlement_invoice_id,
      NEW.settlement_note,
      jsonb_build_object(
        'settled_at', NEW.settled_at,
        'settled_by', NEW.settled_by
      ),
      NEW.settled_by
    );
  ELSIF NEW.status = 'open' AND OLD.status = 'settled' THEN
    INSERT INTO public.supply_share_audit_events (
      share_id,
      event_type,
      previous_status,
      new_status,
      context,
      created_by
    )
    VALUES (
      NEW.id,
      'reopened',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'reopened_at', NOW(),
        'updated_by', NEW.settled_by
      ),
      NEW.settled_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supply_shares_insert_audit
  AFTER INSERT ON public.supply_shares
  FOR EACH ROW EXECUTE FUNCTION public.log_supply_share_created();

CREATE TRIGGER supply_shares_status_audit
  AFTER UPDATE ON public.supply_shares
  FOR EACH ROW EXECUTE FUNCTION public.log_supply_share_status_change();

-- Row level security
ALTER TABLE public.supply_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_share_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supply share viewers" ON public.supply_shares
  FOR SELECT
  USING (
    roommate_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Supply share creators" ON public.supply_shares
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Supply share maintainers" ON public.supply_shares
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Supply share removers" ON public.supply_shares
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Supply share audit readers" ON public.supply_share_audit_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supply_shares s
      WHERE s.id = supply_share_audit_events.share_id
        AND (
          s.roommate_id = auth.uid()
          OR s.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
          )
        )
    )
  );

CREATE POLICY "Supply share audit writers" ON public.supply_share_audit_events
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );
