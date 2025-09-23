-- Add publish state tracking to documents and introduce version history
ALTER TABLE public.documents
  ADD COLUMN state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published')),
  ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;

-- Backfill new columns based on existing status information
UPDATE public.documents
SET
  state = CASE
    WHEN status IN ('pending_signature', 'signed', 'expired') THEN 'published'
    ELSE 'draft'
  END,
  published_at = CASE
    WHEN status IN ('pending_signature', 'signed', 'expired') THEN COALESCE(signed_at, updated_at, NOW())
    ELSE NULL
  END
WHERE state IS NULL OR published_at IS NULL;

-- Create document_versions table to store immutable snapshots
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_signature', 'signed', 'expired', 'cancelled')),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX document_versions_document_id_version_idx
  ON public.document_versions(document_id, version);
CREATE INDEX document_versions_document_id_idx
  ON public.document_versions(document_id);

-- Backfill initial version entries for existing documents
INSERT INTO public.document_versions (document_id, version, state, status, snapshot, created_at, created_by, published_at)
SELECT
  d.id,
  COALESCE(d.version, 1),
  d.state,
  d.status,
  jsonb_build_object(
    'title', d.title,
    'description', d.description,
    'document_type', d.document_type,
    'status', d.status,
    'state', d.state,
    'file_url', d.file_url,
    'metadata', COALESCE(d.metadata, '{}'::jsonb),
    'requires_signature', d.requires_signature,
    'expires_at', d.expires_at,
    'signed_at', d.signed_at,
    'tenant_id', d.tenant_id,
    'unit_id', d.unit_id,
    'documenso_envelope_id', d.documenso_envelope_id,
    'documenso_template_id', d.documenso_template_id
  ),
  COALESCE(d.created_at, NOW()),
  d.created_by,
  d.published_at
FROM public.documents d
ON CONFLICT (document_id, version) DO NOTHING;

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies mirroring document access
CREATE POLICY "Users can view document versions they have document access to"
  ON public.document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents doc
      WHERE doc.id = document_versions.document_id
        AND (
          auth.uid() = doc.created_by OR
          auth.uid() = doc.tenant_id OR
          EXISTS (
            SELECT 1 FROM public.document_signatures sig
            WHERE sig.document_id = doc.id AND sig.signer_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
          )
        )
    )
  );

CREATE POLICY "Property managers can insert document versions"
  ON public.document_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

