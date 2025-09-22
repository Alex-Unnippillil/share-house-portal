BEGIN;

-- Extend document access for landlords alongside property managers and admins
ALTER POLICY "Property managers can view all documents" ON public.documents
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

ALTER POLICY "Property managers can update documents" ON public.documents
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

ALTER POLICY "Property managers can view all signatures" ON public.document_signatures
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

ALTER POLICY "Property managers can view all access logs" ON public.document_access_logs
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

ALTER POLICY "Property managers can view all leases" ON public.leases
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

-- Payments and subscriptions visibility for landlords
ALTER POLICY "Property managers can view all rent payments" ON public.rent_payments
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

ALTER POLICY "Property managers can view all subscriptions" ON public.subscriptions
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

-- Inquiries inbox for landlords
ALTER POLICY "Property managers can view inquiries" ON public.inquiries
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

-- Maintenance and visitor workflows recognise landlords as approvers
ALTER POLICY "Property managers can update maintenance requests" ON public.maintenance_requests
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

ALTER POLICY "Property managers can update visitor logs" ON public.visitor_logs
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'landlord', 'admin')
    )
  );

COMMIT;
