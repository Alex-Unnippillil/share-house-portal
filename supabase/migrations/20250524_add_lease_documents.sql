-- Ensure UUID generation is available
create extension if not exists "pgcrypto";

-- Create leases table when it does not yet exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'leases'
  ) THEN
    CREATE TABLE public.leases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      label text NOT NULL,
      property_address text,
      start_date date,
      end_date date,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS leases_tenant_profile_idx
  ON public.leases (tenant_profile_id);

ALTER TABLE IF EXISTS public.leases
  ENABLE ROW LEVEL SECURITY;

-- Policies for leases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leases'
      AND polname = 'lease_owner_select'
  ) THEN
    EXECUTE $$
      CREATE POLICY "lease_owner_select"
      ON public.leases
      FOR SELECT
      TO authenticated
      USING (tenant_profile_id = auth.uid());
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leases'
      AND polname = 'lease_staff_manage'
  ) THEN
    EXECUTE $$
      CREATE POLICY "lease_staff_manage"
      ON public.leases
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'staff')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'staff')
        )
      );
    $$;
  END IF;
END
$$;

-- Create lease documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'lease_documents'
  ) THEN
    CREATE TABLE public.lease_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
      title text NOT NULL,
      version text NOT NULL DEFAULT 'v1',
      storage_path text NOT NULL,
      effective_date date NOT NULL,
      expiration_date date,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS lease_documents_storage_path_idx
  ON public.lease_documents (storage_path);

CREATE UNIQUE INDEX IF NOT EXISTS lease_documents_lease_version_idx
  ON public.lease_documents (lease_id, version);

CREATE INDEX IF NOT EXISTS lease_documents_lease_id_idx
  ON public.lease_documents (lease_id);

ALTER TABLE public.lease_documents
  ENABLE ROW LEVEL SECURITY;

-- RLS policies for lease documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_documents'
      AND polname = 'lease_documents_staff_manage'
  ) THEN
    EXECUTE $$
      CREATE POLICY "lease_documents_staff_manage"
      ON public.lease_documents
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'staff')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'staff')
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_documents'
      AND polname = 'lease_documents_tenant_select'
  ) THEN
    EXECUTE $$
      CREATE POLICY "lease_documents_tenant_select"
      ON public.lease_documents
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.leases l
          WHERE l.id = lease_documents.lease_id
            AND l.tenant_profile_id = auth.uid()
        )
      );
    $$;
  END IF;
END
$$;

-- Ensure private storage bucket exists for lease documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lease-documents',
  'lease-documents',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for lease documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND polname = 'lease_documents_staff_manage_bucket'
  ) THEN
    EXECUTE $$
      CREATE POLICY "lease_documents_staff_manage_bucket"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (
        bucket_id = 'lease-documents'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'staff')
        )
      )
      WITH CHECK (
        bucket_id = 'lease-documents'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'staff')
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND polname = 'lease_documents_tenant_access_bucket'
  ) THEN
    EXECUTE $$
      CREATE POLICY "lease_documents_tenant_access_bucket"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'lease-documents'
        AND (
          EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'staff')
          )
          OR EXISTS (
            SELECT 1
            FROM public.lease_documents ld
            JOIN public.leases l
              ON l.id = ld.lease_id
            WHERE ld.storage_path = storage.objects.name
              AND storage.objects.bucket_id = 'lease-documents'
              AND l.tenant_profile_id = auth.uid()
          )
        )
      );
    $$;
  END IF;
END
$$;
