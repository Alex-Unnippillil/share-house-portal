ALTER TABLE public.visitor_logs
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id),
  ADD COLUMN IF NOT EXISTS host_roommate_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS requires_manager_approval BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS decision_notes TEXT,
  ADD COLUMN IF NOT EXISTS policy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS policy_violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS consecutive_nights INTEGER,
  ADD COLUMN IF NOT EXISTS last_action_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMP WITH TIME ZONE;

UPDATE public.visitor_logs
SET reason = COALESCE(reason, purpose)
WHERE reason IS NULL;

ALTER TABLE public.visitor_logs
  ALTER COLUMN reason SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.visitor_unit_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  max_consecutive_nights INTEGER NOT NULL DEFAULT 3 CHECK (max_consecutive_nights > 0),
  requires_manager_approval BOOLEAN NOT NULL DEFAULT TRUE,
  blackout_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(unit_id)
);

CREATE TABLE IF NOT EXISTS public.visitor_log_audit_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_log_id UUID NOT NULL REFERENCES public.visitor_logs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_unit_id ON public.visitor_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_approval_status ON public.visitor_logs(approval_status);
CREATE INDEX IF NOT EXISTS idx_visitor_audit_log_id ON public.visitor_log_audit_entries(visitor_log_id);

ALTER TABLE public.visitor_unit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_log_audit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visitor unit policy for their unit" ON public.visitor_unit_policies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND unit_id = visitor_unit_policies.unit_id
    )
  );

CREATE POLICY "Managers can manage visitor unit policies" ON public.visitor_unit_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND unit_id = visitor_unit_policies.unit_id
        AND role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND unit_id = visitor_unit_policies.unit_id
        AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Users can view visitor audit trail for their unit" ON public.visitor_log_audit_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs vl
      JOIN public.profiles p ON p.unit_id = vl.unit_id
      WHERE vl.id = visitor_log_audit_entries.visitor_log_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY "System can insert visitor audit entries" ON public.visitor_log_audit_entries
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('property_manager', 'admin')
    )
  );
