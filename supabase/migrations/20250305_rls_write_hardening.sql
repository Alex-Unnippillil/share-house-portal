BEGIN;

-- Strengthen maintenance request write policies
DROP POLICY IF EXISTS "Property managers can update maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Service role can upsert maintenance requests" ON public.maintenance_requests;

CREATE POLICY "Tenants update their maintenance requests" ON public.maintenance_requests
  FOR UPDATE
  USING (auth.uid() = requested_by)
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Managers maintain scoped maintenance requests" ON public.maintenance_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR manager.unit_id = maintenance_requests.unit_id
          OR maintenance_requests.assigned_to = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR manager.unit_id = maintenance_requests.unit_id
          OR maintenance_requests.assigned_to = auth.uid()
        )
    )
  );

CREATE POLICY "Service role maintains maintenance requests" ON public.maintenance_requests
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates maintenance requests" ON public.maintenance_requests
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Strengthen visitor log write policies
DROP POLICY IF EXISTS "Property managers can update visitor logs" ON public.visitor_logs;
DROP POLICY IF EXISTS "Service role can upsert visitor logs" ON public.visitor_logs;

CREATE POLICY "Tenants update their visitor logs" ON public.visitor_logs
  FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Managers maintain scoped visitor logs" ON public.visitor_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      JOIN public.profiles host ON host.id = visitor_logs.host_id
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR manager.unit_id IS NOT DISTINCT FROM host.unit_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      JOIN public.profiles host ON host.id = visitor_logs.host_id
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR manager.unit_id IS NOT DISTINCT FROM host.unit_id
        )
    )
  );

CREATE POLICY "Service role maintains visitor logs" ON public.visitor_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates visitor logs" ON public.visitor_logs
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Harden notification update policy and allow secure service role writes
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates notifications" ON public.notifications
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Email notification write protections
CREATE POLICY "Service role creates email notifications" ON public.email_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates email notifications" ON public.email_notifications
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Rent payment write protections
CREATE POLICY "Tenants create their rent payments" ON public.rent_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenants update their rent payments" ON public.rent_payments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers update scoped rent payments" ON public.rent_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      LEFT JOIN public.profiles tenant_profile
        ON tenant_profile.id = COALESCE(rent_payments.tenant_id, rent_payments.user_id)
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR manager.unit_id IS NOT DISTINCT FROM rent_payments.unit_id
          OR (manager.unit_id IS NOT NULL AND manager.unit_id IS NOT DISTINCT FROM tenant_profile.unit_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      LEFT JOIN public.profiles tenant_profile
        ON tenant_profile.id = COALESCE(rent_payments.tenant_id, rent_payments.user_id)
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR manager.unit_id IS NOT DISTINCT FROM rent_payments.unit_id
          OR (manager.unit_id IS NOT NULL AND manager.unit_id IS NOT DISTINCT FROM tenant_profile.unit_id)
        )
    )
  );

CREATE POLICY "Service role manages rent payments" ON public.rent_payments
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates rent payments" ON public.rent_payments
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Subscription write protections
CREATE POLICY "Tenants create their subscriptions" ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenants update their subscriptions" ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers update scoped subscriptions" ON public.subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      LEFT JOIN public.profiles tenant_profile
        ON tenant_profile.id = subscriptions.user_id
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR (manager.unit_id IS NOT NULL AND manager.unit_id IS NOT DISTINCT FROM tenant_profile.unit_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles manager
      LEFT JOIN public.profiles tenant_profile
        ON tenant_profile.id = subscriptions.user_id
      WHERE manager.id = auth.uid()
        AND manager.role IN ('property_manager', 'admin')
        AND (
          manager.role = 'admin'
          OR (manager.unit_id IS NOT NULL AND manager.unit_id IS NOT DISTINCT FROM tenant_profile.unit_id)
        )
    )
  );

CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates subscriptions" ON public.subscriptions
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
