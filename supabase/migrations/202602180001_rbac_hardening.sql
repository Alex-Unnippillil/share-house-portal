BEGIN;

CREATE TABLE IF NOT EXISTS public.manager_unit_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (manager_id, unit_id)
);

CREATE INDEX IF NOT EXISTS manager_unit_assignments_manager_idx
  ON public.manager_unit_assignments (manager_id);

CREATE INDEX IF NOT EXISTS manager_unit_assignments_unit_idx
  ON public.manager_unit_assignments (unit_id);

ALTER TABLE public.manager_unit_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_manager_for_unit(target_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.manager_unit_assignments mua
      WHERE mua.manager_id = auth.uid()
        AND mua.unit_id = target_unit_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_unit(target_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unit_id = target_unit_id
    )
    OR public.is_manager_for_unit(target_unit_id);
$$;

CREATE OR REPLACE FUNCTION public.can_access_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_role() = 'admin'
    OR auth.uid() = target_user_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles me
      JOIN public.profiles target ON target.id = target_user_id
      WHERE me.id = auth.uid()
        AND me.unit_id = target.unit_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles target
      WHERE target.id = target_user_id
        AND public.is_manager_for_unit(target.unit_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_safe_profile_self_update(next_profile public.profiles)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles existing_profile
    WHERE existing_profile.id = next_profile.id
      AND existing_profile.role = next_profile.role
      AND existing_profile.property_id IS NOT DISTINCT FROM next_profile.property_id
      AND existing_profile.unit_id IS NOT DISTINCT FROM next_profile.unit_id
      AND existing_profile.is_active = next_profile.is_active
      AND existing_profile.created_by IS NOT DISTINCT FROM next_profile.created_by
  );
$$;

DROP POLICY IF EXISTS "Managers and admins can read assignments" ON public.manager_unit_assignments;
CREATE POLICY "Managers and admins can read assignments" ON public.manager_unit_assignments
  FOR SELECT USING (
    auth.uid() = manager_id
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Admins manage assignments" ON public.manager_unit_assignments;
CREATE POLICY "Admins manage assignments" ON public.manager_unit_assignments
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read profiles in scope" ON public.profiles;
CREATE POLICY "Users can read profiles in scope" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR public.can_access_unit(unit_id)
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND public.is_safe_profile_self_update(profiles)
  );

DROP POLICY IF EXISTS "Managers and admins can manage unit profiles" ON public.profiles;
CREATE POLICY "Managers and admins can manage unit profiles" ON public.profiles
  FOR ALL USING (public.can_access_unit(unit_id) AND public.current_user_role() IN ('property_manager', 'admin'))
  WITH CHECK (public.can_access_unit(unit_id) AND public.current_user_role() IN ('property_manager', 'admin'));

DROP POLICY IF EXISTS "Property managers can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Property managers can update documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view documents they're associated with" ON public.documents;
DROP POLICY IF EXISTS "Users can create documents" ON public.documents;

CREATE POLICY "Documents scoped by unit and association" ON public.documents
  FOR SELECT USING (
    auth.uid() = created_by
    OR auth.uid() = tenant_id
    OR public.can_access_unit(unit_id)
    OR EXISTS (
      SELECT 1 FROM public.document_signatures ds
      WHERE ds.document_id = documents.id
        AND ds.signer_id = auth.uid()
    )
  );

CREATE POLICY "Documents insert in scoped unit" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      unit_id IS NULL
      OR public.can_access_unit(unit_id)
    )
  );

CREATE POLICY "Documents update in scoped unit" ON public.documents
  FOR UPDATE USING (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND public.can_access_unit(unit_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND public.can_access_unit(unit_id)
    )
  );

DROP POLICY IF EXISTS "Property managers can view all signatures" ON public.document_signatures;
DROP POLICY IF EXISTS "Users can view signatures for documents they can access" ON public.document_signatures;

CREATE POLICY "Document signatures scoped" ON public.document_signatures
  FOR SELECT USING (
    auth.uid() = signer_id
    OR EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_signatures.document_id
        AND (
          auth.uid() = d.created_by
          OR auth.uid() = d.tenant_id
          OR public.can_access_unit(d.unit_id)
        )
    )
  );

DROP POLICY IF EXISTS "Property managers can view all access logs" ON public.document_access_logs;
DROP POLICY IF EXISTS "Users can view access logs for documents they can access" ON public.document_access_logs;

CREATE POLICY "Document access logs scoped" ON public.document_access_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_access_logs.document_id
        AND (
          auth.uid() = d.created_by
          OR auth.uid() = d.tenant_id
          OR public.can_access_unit(d.unit_id)
        )
    )
  );

DROP POLICY IF EXISTS "Property managers can view all leases" ON public.leases;
DROP POLICY IF EXISTS "Users can view leases for documents they can access" ON public.leases;

CREATE POLICY "Leases scoped by unit" ON public.leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = leases.document_id
        AND (
          auth.uid() = d.created_by
          OR auth.uid() = d.tenant_id
          OR auth.uid() = ANY(leases.tenant_ids)
          OR public.can_access_unit(d.unit_id)
        )
    )
  );

DROP POLICY IF EXISTS "Property managers can view all rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Users can view their own rent payments" ON public.rent_payments;

CREATE POLICY "Rent payments scoped" ON public.rent_payments
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.can_access_user(user_id)
    OR (unit_id IS NOT NULL AND public.can_access_unit(unit_id))
  );

CREATE POLICY "Rent payments manager update" ON public.rent_payments
  FOR UPDATE USING (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND unit_id IS NOT NULL
      AND public.can_access_unit(unit_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND unit_id IS NOT NULL
      AND public.can_access_unit(unit_id)
    )
  );

DROP POLICY IF EXISTS "Property managers can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

CREATE POLICY "Subscriptions scoped" ON public.subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.can_access_user(user_id)
  );

DROP POLICY IF EXISTS "Users can view maintenance requests for their unit" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Property managers can update maintenance requests" ON public.maintenance_requests;

CREATE POLICY "Maintenance requests scoped" ON public.maintenance_requests
  FOR SELECT USING (
    auth.uid() = requested_by
    OR (unit_id IS NOT NULL AND public.can_access_unit(unit_id))
    OR (assigned_to IS NOT NULL AND auth.uid() = assigned_to)
  );

CREATE POLICY "Maintenance requests manager update" ON public.maintenance_requests
  FOR UPDATE USING (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND unit_id IS NOT NULL
      AND public.can_access_unit(unit_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND unit_id IS NOT NULL
      AND public.can_access_unit(unit_id)
    )
  );

DROP POLICY IF EXISTS "Users can view visitor logs for their unit" ON public.visitor_logs;
DROP POLICY IF EXISTS "Property managers can update visitor logs" ON public.visitor_logs;

CREATE POLICY "Visitor logs scoped" ON public.visitor_logs
  FOR SELECT USING (
    auth.uid() = host_id
    OR public.can_access_user(host_id)
  );

CREATE POLICY "Visitor logs manager update" ON public.visitor_logs
  FOR UPDATE USING (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND EXISTS (
        SELECT 1
        FROM public.profiles host
        WHERE host.id = visitor_logs.host_id
          AND public.can_access_unit(host.unit_id)
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND EXISTS (
        SELECT 1
        FROM public.profiles host
        WHERE host.id = visitor_logs.host_id
          AND public.can_access_unit(host.unit_id)
      )
    )
  );

ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Amenity bookings scoped" ON public.amenity_bookings;
CREATE POLICY "Amenity bookings scoped" ON public.amenity_bookings
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unit_id = amenity_bookings.household_id
    )
    OR (household_id IS NOT NULL AND public.can_access_unit(household_id))
  );

DROP POLICY IF EXISTS "Amenity bookings create" ON public.amenity_bookings;
CREATE POLICY "Amenity bookings create" ON public.amenity_bookings
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      household_id IS NULL
      OR public.can_access_unit(household_id)
    )
  );

DROP POLICY IF EXISTS "Amenity bookings update" ON public.amenity_bookings;
CREATE POLICY "Amenity bookings update" ON public.amenity_bookings
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND household_id IS NOT NULL
      AND public.can_access_unit(household_id)
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.is_admin()
    OR (
      public.current_user_role() = 'property_manager'
      AND household_id IS NOT NULL
      AND public.can_access_unit(household_id)
    )
  );

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Notifications scoped" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.can_access_user(user_id)
    OR public.is_admin()
  );

CREATE POLICY "Notifications update scoped" ON public.notifications
  FOR UPDATE USING (
    auth.uid() = user_id
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can view their own email notifications" ON public.email_notifications;
CREATE POLICY "Email notifications scoped" ON public.email_notifications
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

COMMIT;
