-- Tenant email domain management for custom sender identities
CREATE TABLE public.tenant_email_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'not_started')),
  identity_id TEXT,
  spf_name TEXT NOT NULL,
  spf_type TEXT NOT NULL,
  spf_value TEXT NOT NULL,
  dkim_name TEXT NOT NULL,
  dkim_type TEXT NOT NULL,
  dkim_value TEXT NOT NULL,
  verification_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX tenant_email_domains_household_key
  ON public.tenant_email_domains(household_id);

CREATE INDEX tenant_email_domains_status_idx
  ON public.tenant_email_domains(status);

CREATE INDEX tenant_email_domains_domain_idx
  ON public.tenant_email_domains(domain);

ALTER TABLE public.tenant_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property managers manage tenant email domains"
  ON public.tenant_email_domains
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('property_manager', 'admin')
    )
  );

CREATE TRIGGER tenant_email_domains_set_updated_at
  BEFORE UPDATE ON public.tenant_email_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
