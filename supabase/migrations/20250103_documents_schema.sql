-- Create documents table for managing lease agreements and other documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('lease', 'addendum', 'insurance', 'maintenance', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'expired', 'cancelled')),
  file_url TEXT,
  documenso_envelope_id TEXT,
  documenso_template_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unit_id UUID,
  requires_signature BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES public.documents(id)
);

-- Create document_signatures table for tracking signatures
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  signer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  signed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  documenso_signature_id TEXT,
  ip_address INET,
  user_agent TEXT,
  signature_data JSONB,
  signing_order INTEGER DEFAULT 1
);

-- Create document_access_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create leases table for lease-specific data
CREATE TABLE IF NOT EXISTS public.leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_date DATE NOT NULL,
  end_date DATE,
  rent_amount INTEGER, -- Amount in cents
  rent_frequency TEXT NOT NULL DEFAULT 'monthly',
  security_deposit INTEGER, -- Amount in cents
  tenant_ids UUID[] NOT NULL,
  property_address TEXT,
  unit_number TEXT,
  landlord_name TEXT,
  landlord_email TEXT,
  auto_renew BOOLEAN DEFAULT FALSE,
  renewal_notice_days INTEGER DEFAULT 30,
  special_terms TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_unit_id ON public.documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON public.documents(expires_at);

CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON public.document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer_id ON public.document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_status ON public.document_signatures(status);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_document_id ON public.document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user_id ON public.document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created_at ON public.document_access_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leases_document_id ON public.leases(document_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_ids ON public.leases USING GIN(tenant_ids);
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view documents they're associated with" ON public.documents
  FOR SELECT USING (
    auth.uid() = created_by OR
    auth.uid() = tenant_id OR
    EXISTS (
      SELECT 1 FROM public.document_signatures
      WHERE document_id = documents.id AND signer_id = auth.uid()
    )
  );

CREATE POLICY "Property managers can view all documents" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Property managers can update documents" ON public.documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- RLS Policies for document_signatures
CREATE POLICY "Users can view signatures for documents they can access" ON public.document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_signatures.document_id AND (
        auth.uid() = documents.created_by OR
        auth.uid() = documents.tenant_id OR
        signer_id = auth.uid()
      )
    )
  );

CREATE POLICY "Property managers can view all signatures" ON public.document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Users can update their own signatures" ON public.document_signatures
  FOR UPDATE USING (auth.uid() = signer_id);

-- RLS Policies for document_access_logs
CREATE POLICY "Users can view access logs for documents they can access" ON public.document_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_access_logs.document_id AND (
        auth.uid() = documents.created_by OR
        auth.uid() = documents.tenant_id OR
        user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Property managers can view all access logs" ON public.document_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "System can create access logs" ON public.document_access_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for leases
CREATE POLICY "Users can view leases for documents they can access" ON public.leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = leases.document_id AND (
        auth.uid() = documents.created_by OR
        auth.uid() = documents.tenant_id OR
        auth.uid() = ANY(leases.tenant_ids)
      )
    )
  );

CREATE POLICY "Property managers can view all leases" ON public.leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Function to log document access
CREATE OR REPLACE FUNCTION log_document_access(
  p_document_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.document_access_logs (document_id, user_id, action, metadata)
  VALUES (p_document_id, auth.uid(), p_action, p_metadata)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at columns
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_signatures_updated_at
  BEFORE UPDATE ON public.document_signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_access_logs_updated_at
  BEFORE UPDATE ON public.document_access_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
