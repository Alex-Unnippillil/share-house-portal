-- Align RLS policies with indexed tenant and unit predicates to improve planner choices

-- Ensure profiles.unit_id is indexed for unit-scoped policy checks
CREATE INDEX IF NOT EXISTS idx_profiles_unit_id ON public.profiles(unit_id);

-- Documents
DROP POLICY IF EXISTS "Users can view documents they're associated with" ON public.documents;

CREATE POLICY "Document access for creators" ON public.documents
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Document access for assigned tenant" ON public.documents
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Document access for unit members" ON public.documents
  FOR SELECT USING (
    unit_id IS NOT NULL AND unit_id IN (
      SELECT unit_id
      FROM public.profiles
      WHERE id = auth.uid() AND unit_id IS NOT NULL
    )
  );

CREATE POLICY "Document access for signers" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.document_signatures ds
      WHERE ds.document_id = documents.id AND ds.signer_id = auth.uid()
    )
  );

-- Document signatures
DROP POLICY IF EXISTS "Users can view signatures for documents they can access" ON public.document_signatures;

CREATE POLICY "Signers can view their signatures" ON public.document_signatures
  FOR SELECT USING (signer_id = auth.uid());

CREATE POLICY "Document creators can view signatures" ON public.document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_signatures.document_id AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Assigned tenants can view document signatures" ON public.document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_signatures.document_id AND d.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Unit members can view document signatures" ON public.document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_signatures.document_id
        AND d.unit_id IS NOT NULL
        AND d.unit_id IN (
          SELECT unit_id
          FROM public.profiles
          WHERE id = auth.uid() AND unit_id IS NOT NULL
        )
    )
  );

-- Document access logs
DROP POLICY IF EXISTS "Users can view access logs for documents they can access" ON public.document_access_logs;

CREATE POLICY "Actors can view their document access logs" ON public.document_access_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Document creators can view access logs" ON public.document_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_access_logs.document_id AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Assigned tenants can view access logs" ON public.document_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_access_logs.document_id AND d.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Unit members can view document access logs" ON public.document_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_access_logs.document_id
        AND d.unit_id IS NOT NULL
        AND d.unit_id IN (
          SELECT unit_id
          FROM public.profiles
          WHERE id = auth.uid() AND unit_id IS NOT NULL
        )
    )
  );

-- Leases
DROP POLICY IF EXISTS "Users can view leases for documents they can access" ON public.leases;

CREATE POLICY "Lease access for document creator" ON public.leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = leases.document_id AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Lease access for assigned tenant" ON public.leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = leases.document_id AND d.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Lease access for listed tenants" ON public.leases
  FOR SELECT USING (auth.uid() = ANY(tenant_ids));

CREATE POLICY "Lease access for unit members" ON public.leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = leases.document_id
        AND d.unit_id IS NOT NULL
        AND d.unit_id IN (
          SELECT unit_id
          FROM public.profiles
          WHERE id = auth.uid() AND unit_id IS NOT NULL
        )
    )
  );

-- Maintenance requests
DROP POLICY IF EXISTS "Users can view maintenance requests for their unit" ON public.maintenance_requests;

CREATE POLICY "Maintenance requests visible to requester" ON public.maintenance_requests
  FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Maintenance requests visible to unit members" ON public.maintenance_requests
  FOR SELECT USING (
    unit_id IS NOT NULL AND unit_id IN (
      SELECT unit_id
      FROM public.profiles
      WHERE id = auth.uid() AND unit_id IS NOT NULL
    )
  );

-- Visitor logs
DROP POLICY IF EXISTS "Users can view visitor logs for their unit" ON public.visitor_logs;

CREATE POLICY "Visitor logs visible to host" ON public.visitor_logs
  FOR SELECT USING (host_id = auth.uid());

CREATE POLICY "Visitor logs visible to unit members" ON public.visitor_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles host
      WHERE host.id = visitor_logs.host_id
        AND host.unit_id IS NOT NULL
        AND host.unit_id IN (
          SELECT unit_id
          FROM public.profiles
          WHERE id = auth.uid() AND unit_id IS NOT NULL
        )
    )
  );
