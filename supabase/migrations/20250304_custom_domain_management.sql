-- Custom domain management tables for DNS onboarding and certificate lifecycle
CREATE TABLE public.custom_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  project_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'verified', 'failed')
  ),
  verification_type TEXT,
  verification_token TEXT,
  dns_target TEXT,
  dns_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  certificate_id TEXT,
  certificate_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    certificate_status IN ('pending', 'active', 'renewing', 'failed', 'expired')
  ),
  certificate_issued_at TIMESTAMP WITH TIME ZONE,
  certificate_expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  renewal_scheduled_for TIMESTAMP WITH TIME ZONE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.domain_certificate_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.custom_domains(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'provisioned',
      'verification_requested',
      'verification_succeeded',
      'verification_failed',
      'renewal_scheduled',
      'renewal_success',
      'renewal_failed',
      'status_update'
    )
  ),
  status TEXT NOT NULL DEFAULT 'info' CHECK (
    status IN ('info', 'success', 'warning', 'error')
  ),
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_domains_domain ON public.custom_domains(domain);
CREATE INDEX idx_custom_domains_certificate_expires ON public.custom_domains(certificate_expires_at);
CREATE INDEX idx_custom_domains_renewal_scheduled_for ON public.custom_domains(renewal_scheduled_for);
CREATE INDEX idx_domain_certificate_events_domain_id ON public.domain_certificate_events(domain_id);
CREATE INDEX idx_domain_certificate_events_created_at ON public.domain_certificate_events(created_at DESC);

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_certificate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom domain visibility" ON public.custom_domains
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Manage custom domains" ON public.custom_domains
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  ) WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Domain events visibility" ON public.domain_certificate_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_domains cd
      WHERE cd.id = domain_certificate_events.domain_id
        AND (
          cd.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
          )
        )
    )
  );

CREATE POLICY "Manage domain events" ON public.domain_certificate_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.custom_domains cd
      WHERE cd.id = domain_certificate_events.domain_id
        AND (
          cd.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
          )
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_domains cd
      WHERE cd.id = domain_certificate_events.domain_id
        AND (
          cd.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
          )
        )
    )
  );

CREATE TRIGGER set_custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
