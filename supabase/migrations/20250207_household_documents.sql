-- Create a table to track household lease documents stored in the docs bucket
CREATE TABLE IF NOT EXISTS public.household_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  lease_start DATE,
  lease_end DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  file_size BIGINT,
  content_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Helpful indexes for filtering by household and ordering
CREATE INDEX IF NOT EXISTS household_documents_unit_uploaded_at_idx
  ON public.household_documents (unit_id, uploaded_at DESC);

-- Enable row level security
ALTER TABLE public.household_documents ENABLE ROW LEVEL SECURITY;

-- Allow members of a household (or admins) to view documents for their unit
CREATE POLICY "Household members can view lease documents" ON public.household_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin'
          OR (unit_id IS NOT NULL AND unit_id = household_documents.unit_id)
        )
    )
  );

-- Restrict inserts/updates/deletes to admins
CREATE POLICY "Admins can insert lease documents" ON public.household_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update lease documents" ON public.household_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete lease documents" ON public.household_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure the docs bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('docs', 'docs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Harden access controls for the docs bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can download docs" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'docs'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND unit_id IS NOT NULL
          AND unit_id::text = split_part(objects.name, '/', 1)
      )
    )
  );

CREATE POLICY "Admins can upload docs" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update docs" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete docs" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
