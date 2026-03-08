-- Schema changes to support chore assignment tracking and fairness metrics

-- Create chore_assignments table to track upcoming tasks for roommates
CREATE TABLE IF NOT EXISTS public.chore_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'missed', 'skipped')),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS chore_assignments_due_at_idx ON public.chore_assignments (due_at DESC);
CREATE INDEX IF NOT EXISTS chore_assignments_status_idx ON public.chore_assignments (status);
CREATE INDEX IF NOT EXISTS chore_assignments_assigned_to_idx ON public.chore_assignments (assigned_to);

-- Table to accumulate fairness counters per roommate
CREATE TABLE IF NOT EXISTS public.chore_fairness_counters (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_count INTEGER NOT NULL DEFAULT 0,
  missed_count INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chore_fairness_balance_idx ON public.chore_fairness_counters (balance);

-- Audit log of status changes for chores
CREATE TABLE IF NOT EXISTS public.chore_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.chore_assignments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chore_audit_assignment_idx ON public.chore_audit_events (assignment_id);
CREATE INDEX IF NOT EXISTS chore_audit_event_type_idx ON public.chore_audit_events (event_type);

-- Maintain updated_at automatically
CREATE OR REPLACE FUNCTION public.set_chore_assignment_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_chore_assignment_updated_at
BEFORE UPDATE ON public.chore_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_chore_assignment_updated_at();

-- Trigger to emit audit events and adjust fairness counters when chores are missed
CREATE OR REPLACE FUNCTION public.handle_chore_assignment_status_change()
RETURNS trigger AS $$
DECLARE
  actor UUID;
BEGIN
  IF NEW.status = 'missed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    actor := COALESCE(NEW.updated_by, auth.uid());

    INSERT INTO public.chore_audit_events (assignment_id, actor_id, event_type, payload)
    VALUES (
      NEW.id,
      actor,
      'chore.status.missed',
      jsonb_build_object(
        'status_before', OLD.status,
        'status_after', NEW.status,
        'assigned_to', NEW.assigned_to,
        'due_at', NEW.due_at,
        'missed_at', NOW()
      )
    );

    INSERT INTO public.chore_fairness_counters AS counters (profile_id, missed_count, balance)
    VALUES (NEW.assigned_to, 1, -1)
    ON CONFLICT (profile_id)
    DO UPDATE SET
      missed_count = counters.missed_count + 1,
      balance = counters.balance - 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chore_assignment_status_audit
AFTER UPDATE ON public.chore_assignments
FOR EACH ROW
EXECUTE FUNCTION public.handle_chore_assignment_status_change();

-- Enable row level security
ALTER TABLE public.chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_fairness_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_audit_events ENABLE ROW LEVEL SECURITY;

-- Helper expression to check if the requester is a property manager or admin
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('property_manager', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policies for chore assignments
CREATE POLICY chore_assignments_assignee_select
  ON public.chore_assignments
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR public.is_manager()
  );

CREATE POLICY chore_assignments_manager_modify
  ON public.chore_assignments
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Policies for fairness counters
CREATE POLICY chore_fairness_view
  ON public.chore_fairness_counters
  FOR SELECT
  USING (
    profile_id = auth.uid()
    OR public.is_manager()
  );

CREATE POLICY chore_fairness_manage
  ON public.chore_fairness_counters
  FOR INSERT
  WITH CHECK (public.is_manager());

CREATE POLICY chore_fairness_update
  ON public.chore_fairness_counters
  FOR UPDATE
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Policies for audit events
CREATE POLICY chore_audit_view_assignee
  ON public.chore_audit_events
  FOR SELECT
  USING (
    public.is_manager()
    OR EXISTS (
      SELECT 1
      FROM public.chore_assignments ca
      WHERE ca.id = chore_audit_events.assignment_id
        AND ca.assigned_to = auth.uid()
    )
  );

CREATE POLICY chore_audit_insert_manager
  ON public.chore_audit_events
  FOR INSERT
  WITH CHECK (public.is_manager());
