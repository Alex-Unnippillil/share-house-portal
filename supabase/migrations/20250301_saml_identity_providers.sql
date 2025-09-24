-- Store SAML identity provider configuration per tenant/household
CREATE TABLE public.saml_identity_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  sso_url TEXT NOT NULL,
  slo_url TEXT,
  certificate TEXT,
  metadata_xml TEXT NOT NULL,
  metadata_url TEXT,
  default_role TEXT NOT NULL DEFAULT 'tenant' CHECK (
    default_role IN ('tenant', 'roommate', 'property_manager', 'admin', 'user')
  ),
  attribute_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.saml_identity_providers
  ADD CONSTRAINT saml_identity_providers_tenant_unique UNIQUE (tenant_id);

CREATE INDEX idx_saml_identity_providers_entity_id
  ON public.saml_identity_providers (entity_id);

ALTER TABLE public.saml_identity_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property managers manage SAML IdPs" ON public.saml_identity_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON public.saml_identity_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
