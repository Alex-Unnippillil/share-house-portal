-- Add state/version columns and version history for maintenance requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published')),
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Create version history table for maintenance requests
CREATE TABLE public.maintenance_request_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX maintenance_request_versions_request_id_version_idx
  ON public.maintenance_request_versions(request_id, version);
CREATE INDEX maintenance_request_versions_request_id_idx
  ON public.maintenance_request_versions(request_id);

-- Backfill initial version entries for existing requests
INSERT INTO public.maintenance_request_versions (
  request_id,
  version,
  state,
  status,
  snapshot,
  created_at,
  created_by,
  published_at
)
SELECT
  r.id,
  COALESCE(r.version, 1),
  r.state,
  r.status,
  jsonb_build_object(
    'title', r.title,
    'description', r.description,
    'priority', r.priority,
    'status', r.status,
    'state', r.state,
    'category', r.category,
    'location', r.location,
    'requested_by', r.requested_by,
    'assigned_to', r.assigned_to,
    'unit_id', r.unit_id,
    'notes', r.notes,
    'attachments', COALESCE(r.attachments, '[]'::jsonb),
    'metadata', COALESCE(r.metadata, '{}'::jsonb)
  ),
  COALESCE(r.created_at, NOW()),
  r.requested_by,
  CASE WHEN r.state = 'published' THEN COALESCE(r.updated_at, NOW()) ELSE NULL END
FROM public.maintenance_requests r
ON CONFLICT (request_id, version) DO NOTHING;

-- Refresh RLS policy to ensure drafts remain private to their authors
DROP POLICY IF EXISTS "Users can view maintenance requests for their unit" ON public.maintenance_requests;

CREATE POLICY "Users can view maintenance requests"
  ON public.maintenance_requests
  FOR SELECT
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
    OR (
      state = 'published'
      AND EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.unit_id = p2.unit_id
        WHERE p1.id = auth.uid() AND p2.id = maintenance_requests.requested_by
      )
    )
  );

ALTER TABLE public.maintenance_request_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance request versions"
  ON public.maintenance_request_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests req
      WHERE req.id = maintenance_request_versions.request_id
        AND (
          req.requested_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
          )
          OR (
            req.state = 'published'
            AND EXISTS (
              SELECT 1 FROM public.profiles p1
              JOIN public.profiles p2 ON p1.unit_id = p2.unit_id
              WHERE p1.id = auth.uid() AND p2.id = req.requested_by
            )
          )
        )
    )
  );

CREATE POLICY "Authors can insert maintenance request versions"
  ON public.maintenance_request_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests req
      WHERE req.id = maintenance_request_versions.request_id
        AND (
          req.requested_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
          )
        )
    )
  );
