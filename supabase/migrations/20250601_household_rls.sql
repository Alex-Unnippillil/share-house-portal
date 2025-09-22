-- Enable required extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enumerated type capturing household membership roles
CREATE TYPE public.household_member_role AS ENUM ('member', 'admin', 'property_manager');

-- Core tenancy tables -------------------------------------------------------

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  timezone text NOT NULL DEFAULT 'UTC',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX households_building_id_idx ON public.households (building_id);
CREATE UNIQUE INDEX households_slug_lower_idx ON public.households (lower(slug));

CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.household_member_role NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (household_id, profile_id)
);

CREATE INDEX household_members_profile_idx ON public.household_members (profile_id);
CREATE INDEX household_members_role_idx ON public.household_members (household_id, role);

CREATE TABLE public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  rent_amount numeric(10, 2) NOT NULL,
  security_deposit numeric(10, 2),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX leases_household_idx ON public.leases (household_id, status);

CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  stripe_invoice_id text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX rent_payments_household_idx ON public.rent_payments (household_id, due_date);

CREATE TABLE public.amenity_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  amenity_name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX amenity_bookings_household_idx ON public.amenity_bookings (household_id, start_time);

CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX maintenance_requests_household_idx ON public.maintenance_requests (household_id, status);

CREATE TABLE public.visitor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  host_member_id uuid REFERENCES public.household_members(id) ON DELETE SET NULL,
  visitor_name text NOT NULL,
  arrival timestamptz NOT NULL,
  departure timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX visitor_logs_household_idx ON public.visitor_logs (household_id, arrival);

CREATE TABLE public.household_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_path text NOT NULL,
  category text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX household_documents_household_idx ON public.household_documents (household_id, created_at DESC);

CREATE TABLE public.household_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX household_threads_household_idx ON public.household_threads (household_id, created_at DESC);

CREATE TABLE public.household_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.household_threads(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  reaction_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  edited_at timestamptz
);

CREATE INDEX household_messages_thread_idx ON public.household_messages (thread_id, created_at);
CREATE INDEX household_messages_household_idx ON public.household_messages (household_id, created_at DESC);

CREATE TABLE public.floorplans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX floorplans_household_idx ON public.floorplans (household_id, created_at DESC);

CREATE TABLE public.floorplan_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id uuid NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  label text NOT NULL,
  coordinates jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX floorplan_annotations_floorplan_idx ON public.floorplan_annotations (floorplan_id);
CREATE INDEX floorplan_annotations_household_idx ON public.floorplan_annotations (household_id, created_at DESC);

-- Helper functions ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.role() = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.is_household_member(p_household uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = p_household
        AND hm.profile_id = auth.uid()
        AND hm.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_household_admin(p_household uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = p_household
        AND hm.profile_id = auth.uid()
        AND hm.status = 'active'
        AND hm.role IN ('admin', 'property_manager')
    );
$$;

-- Row level security --------------------------------------------------------

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplan_annotations ENABLE ROW LEVEL SECURITY;

-- Household level member access policies ------------------------------------

-- Helper to declare shared policy blocks
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'household_members',
      'leases',
      'rent_payments',
      'amenity_bookings',
      'maintenance_requests',
      'visitor_logs',
      'household_documents',
      'household_threads',
      'household_messages',
      'floorplans',
      'floorplan_annotations'
    ])
  LOOP
    EXECUTE format('
      CREATE POLICY household_member_access ON public.%I
      USING (public.is_household_member(household_id))
      WITH CHECK (public.is_household_member(household_id));
    ', table_name);

    EXECUTE format('
      CREATE POLICY household_admin_manage ON public.%I
      FOR ALL
      USING (public.is_household_admin(household_id))
      WITH CHECK (public.is_household_admin(household_id));
    ', table_name);

    EXECUTE format('
      CREATE POLICY household_admin_write_guard ON public.%I
      AS RESTRICTIVE
      FOR INSERT
      WITH CHECK (public.is_household_admin(household_id));
    ', table_name);

    EXECUTE format('
      CREATE POLICY household_admin_delete_guard ON public.%I
      AS RESTRICTIVE
      FOR DELETE
      USING (public.is_household_admin(household_id));
    ', table_name);
  END LOOP;
END
$$;

-- Policies for the households table require referencing the primary key
CREATE POLICY household_member_access ON public.households
USING (public.is_household_member(id))
WITH CHECK (public.is_household_member(id));

CREATE POLICY household_admin_manage ON public.households
FOR ALL
USING (public.is_household_admin(id))
WITH CHECK (public.is_household_admin(id));

CREATE POLICY household_admin_write_guard ON public.households
AS RESTRICTIVE
FOR INSERT
WITH CHECK (public.is_household_admin(id));

CREATE POLICY household_admin_delete_guard ON public.households
AS RESTRICTIVE
FOR DELETE
USING (public.is_household_admin(id));

