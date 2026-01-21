-- Extend maintenance_requests with triage, vendor, SLA, and photo attachments metadata
ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS triage_state TEXT NOT NULL DEFAULT 'untriaged',
  ADD COLUMN IF NOT EXISTS triaged_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS triaged_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS triage_notes TEXT,
  ADD COLUMN IF NOT EXISTS vendor_id UUID,
  ADD COLUMN IF NOT EXISTS vendor_assigned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS vendor_assigned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS vendor_acknowledged_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS vendor_assignment_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sla_acknowledged_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sla_response_due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sla_resolution_due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS work_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS photo_attachments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_status_check
    CHECK (
      status IN (
        'pending',
        'triaged',
        'scheduled',
        'awaiting_vendor',
        'in_progress',
        'completed',
        'cancelled'
      )
    );

ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_triage_state_check;

ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_triage_state_check
    CHECK (
      triage_state IN (
        'untriaged',
        'in_review',
        'escalated',
        'resolved'
      )
    );

ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_sla_order_check;

ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_sla_order_check
    CHECK (
      sla_response_due_at IS NULL
      OR sla_resolution_due_at IS NULL
      OR sla_response_due_at <= sla_resolution_due_at
    );

-- Maintenance vendors directory
CREATE TABLE IF NOT EXISTS public.maintenance_vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  service_categories TEXT[] DEFAULT '{}'::text[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  preferred BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_vendor_id_fkey;

ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_vendor_id_fkey
    FOREIGN KEY (vendor_id)
    REFERENCES public.maintenance_vendors(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_active
  ON public.maintenance_vendors(active);

CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_service_categories
  ON public.maintenance_vendors USING gin (service_categories);

DROP TRIGGER IF EXISTS update_maintenance_vendors_updated_at ON public.maintenance_vendors;

CREATE TRIGGER update_maintenance_vendors_updated_at
  BEFORE UPDATE ON public.maintenance_vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.maintenance_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Property managers manage maintenance vendors" ON public.maintenance_vendors;

CREATE POLICY "Property managers manage maintenance vendors"
  ON public.maintenance_vendors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'property_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'property_manager'
    )
  );

-- Audit log for maintenance requests
CREATE TABLE IF NOT EXISTS public.maintenance_request_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'status_transition',
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  proof JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_request_audit_request
  ON public.maintenance_request_audit_log(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_request_audit_event_type
  ON public.maintenance_request_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_maintenance_request_audit_changed_by
  ON public.maintenance_request_audit_log(changed_by);

ALTER TABLE public.maintenance_request_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requesters view their maintenance audit logs" ON public.maintenance_request_audit_log;

CREATE POLICY "Requesters view their maintenance audit logs"
  ON public.maintenance_request_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_request_audit_log.request_id
        AND mr.requested_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Property managers view maintenance audit logs" ON public.maintenance_request_audit_log;

CREATE POLICY "Property managers view maintenance audit logs"
  ON public.maintenance_request_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'property_manager'
    )
  );

DROP POLICY IF EXISTS "Property managers insert maintenance audit logs" ON public.maintenance_request_audit_log;

CREATE POLICY "Property managers insert maintenance audit logs"
  ON public.maintenance_request_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'property_manager'
    )
  );

-- Helpful indexes for new workflow data
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_triage_state
  ON public.maintenance_requests(triage_state);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_vendor_id
  ON public.maintenance_requests(vendor_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_sla_response_due_at
  ON public.maintenance_requests(sla_response_due_at);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_sla_resolution_due_at
  ON public.maintenance_requests(sla_resolution_due_at);
