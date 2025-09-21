-- Visitor logs and policy tables

-- Ensure profiles have building and unit metadata to scope policies
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS building_id uuid,
  ADD COLUMN IF NOT EXISTS unit_id uuid;

-- Helper function for policy checks
CREATE OR REPLACE FUNCTION public.has_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (roles)
  );
$$;

-- Rules that govern overnight visitors per building/unit
CREATE TABLE IF NOT EXISTS public.visitor_rules (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  building_id uuid NOT NULL,
  unit_id uuid,
  title text NOT NULL DEFAULT 'Visitor Policy',
  description text,
  max_consecutive_nights integer NOT NULL DEFAULT 3 CHECK (max_consecutive_nights > 0),
  max_visits_per_month integer CHECK (max_visits_per_month IS NULL OR max_visits_per_month > 0),
  require_manager_approval boolean NOT NULL DEFAULT true,
  advance_notice_hours integer CHECK (advance_notice_hours IS NULL OR advance_notice_hours >= 0),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS visitor_rules_building_unit_active_idx
  ON public.visitor_rules (building_id, unit_id)
  WHERE active IS TRUE;

-- Log of individual visitor stays per tenant
CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  host_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  visitor_name text NOT NULL,
  visitor_email text,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  total_nights integer NOT NULL CHECK (total_nights > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'completed')),
  rule_id bigint REFERENCES public.visitor_rules(id) ON DELETE SET NULL,
  approval_notes text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT visitor_logs_date_range CHECK (departure_date >= arrival_date)
);

CREATE INDEX IF NOT EXISTS visitor_logs_host_idx ON public.visitor_logs (host_profile_id);
CREATE INDEX IF NOT EXISTS visitor_logs_unit_idx ON public.visitor_logs (unit_id);
CREATE INDEX IF NOT EXISTS visitor_logs_status_idx ON public.visitor_logs (status);

-- Audit log entries for compliance retention
CREATE TABLE IF NOT EXISTS public.visitor_log_audits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  log_id bigint NOT NULL REFERENCES public.visitor_logs(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'status_change', 'approved', 'denied', 'cancelled', 'notification')),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS visitor_log_audits_log_idx ON public.visitor_log_audits (log_id);

-- Enable RLS and policies for multi-tenant separation
ALTER TABLE public.visitor_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_log_audits ENABLE ROW LEVEL SECURITY;

-- Visitor rule visibility and management
CREATE POLICY IF NOT EXISTS "tenants-can-read-applicable-visitor-rules"
  ON public.visitor_rules
  FOR SELECT
  USING (
    public.has_role(ARRAY['property_manager', 'admin'])
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.building_id = visitor_rules.building_id
        AND (
          visitor_rules.unit_id IS NULL
          OR visitor_rules.unit_id = p.unit_id
        )
    )
  );

CREATE POLICY IF NOT EXISTS "managers-maintain-visitor-rules"
  ON public.visitor_rules
  FOR ALL
  USING (public.has_role(ARRAY['property_manager', 'admin']))
  WITH CHECK (public.has_role(ARRAY['property_manager', 'admin']));

-- Visitor log policies
CREATE POLICY IF NOT EXISTS "residents-can-view-unit-visitor-logs"
  ON public.visitor_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.id = visitor_logs.host_profile_id
          OR (p.unit_id IS NOT NULL AND p.unit_id = visitor_logs.unit_id)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
        AND (p.role = 'admin' OR p.building_id = visitor_logs.building_id)
    )
  );

CREATE POLICY IF NOT EXISTS "hosts-create-visitor-logs"
  ON public.visitor_logs
  FOR INSERT
  WITH CHECK (auth.uid() = host_profile_id);

CREATE POLICY IF NOT EXISTS "hosts-update-own-visitor-logs"
  ON public.visitor_logs
  FOR UPDATE
  USING (auth.uid() = host_profile_id)
  WITH CHECK (auth.uid() = host_profile_id);

CREATE POLICY IF NOT EXISTS "managers-update-visitor-logs"
  ON public.visitor_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
        AND (p.role = 'admin' OR p.building_id = visitor_logs.building_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
        AND (p.role = 'admin' OR p.building_id = visitor_logs.building_id)
    )
  );

CREATE POLICY IF NOT EXISTS "admins-can-delete-visitor-logs"
  ON public.visitor_logs
  FOR DELETE
  USING (public.has_role(ARRAY['admin']));

-- Audit log policies
CREATE POLICY IF NOT EXISTS "stakeholders-view-visitor-audits"
  ON public.visitor_log_audits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs l
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE l.id = visitor_log_audits.log_id
        AND (
          p.role = 'admin'
          OR (p.role = 'property_manager' AND p.building_id = l.building_id)
          OR (p.unit_id IS NOT NULL AND p.unit_id = l.unit_id)
        )
    )
  );

CREATE POLICY IF NOT EXISTS "actors-log-visitor-audits"
  ON public.visitor_log_audits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs l
      WHERE l.id = visitor_log_audits.log_id
        AND (
          l.host_profile_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('property_manager', 'admin')
              AND (p.role = 'admin' OR p.building_id = l.building_id)
          )
        )
    )
  );

-- Managers and admins can maintain audit records if needed
CREATE POLICY IF NOT EXISTS "managers-update-visitor-audits"
  ON public.visitor_log_audits
  FOR UPDATE
  USING (public.has_role(ARRAY['property_manager', 'admin']))
  WITH CHECK (public.has_role(ARRAY['property_manager', 'admin']));

CREATE POLICY IF NOT EXISTS "admins-delete-visitor-audits"
  ON public.visitor_log_audits
  FOR DELETE
  USING (public.has_role(ARRAY['admin']));
