-- Privacy request logging tables for DSAR handling
CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  requester_email TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'erasure')),
  status TEXT NOT NULL CHECK (status IN ('received', 'in_progress', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  export_location TEXT,
  processed_by UUID,
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.privacy_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.privacy_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  detail TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_tenant_id
  ON public.privacy_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status
  ON public.privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_request_events_request_id
  ON public.privacy_request_events(request_id);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view privacy requests"
  ON public.privacy_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Allow admins to view privacy request events"
  ON public.privacy_request_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('property_manager', 'admin')
    )
  );

CREATE TRIGGER update_privacy_requests_updated_at
  BEFORE UPDATE ON public.privacy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
