ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS preferred_access_times JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS property_label TEXT,
  ADD COLUMN IF NOT EXISTS unit_label TEXT,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.maintenance_request_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'submitted',
      'acknowledged',
      'assigned',
      'priority_changed',
      'status_changed',
      'comment',
      'resolved',
      'reopened'
    )
  ),
  previous_status TEXT,
  next_status TEXT,
  previous_priority TEXT,
  next_priority TEXT,
  actor_id UUID REFERENCES auth.users(id),
  assignee_id UUID REFERENCES auth.users(id),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_label ON public.maintenance_requests(property_label);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_label ON public.maintenance_requests(unit_label);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_sla_due_at ON public.maintenance_requests(sla_due_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_request_updates_request_id ON public.maintenance_request_updates(request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_request_updates_created_at ON public.maintenance_request_updates(created_at DESC);

ALTER TABLE public.maintenance_request_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates for visible maintenance requests" ON public.maintenance_request_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_request_updates.request_id
        AND (
          mr.requested_by = auth.uid()
          OR mr.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
          )
        )
    )
  );

CREATE POLICY "Tenants and managers can add maintenance updates" ON public.maintenance_request_updates
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_request_updates.request_id
        AND (
          mr.requested_by = auth.uid()
          OR mr.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
          )
        )
    )
  );
