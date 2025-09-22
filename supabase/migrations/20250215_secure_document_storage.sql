-- Secure document storage enhancements
ALTER TABLE public.documents
  ADD COLUMN storage_path TEXT,
  ADD COLUMN encryption_iv TEXT,
  ADD COLUMN encryption_tag TEXT,
  ADD COLUMN encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  ADD COLUMN encrypted_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION log_document_access(
  p_document_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.document_access_logs (document_id, user_id, action, metadata, ip_address, user_agent)
  VALUES (p_document_id, auth.uid(), p_action, COALESCE(p_metadata, '{}'::jsonb), p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
