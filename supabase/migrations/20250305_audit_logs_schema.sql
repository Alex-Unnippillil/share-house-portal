-- Create audit_logs table to centralize privileged activity tracking
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT CHECK (actor_role IN ('tenant', 'roommate', 'property_manager', 'admin', 'user', 'system')),
  actor_email TEXT,
  actor_name TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  household_id UUID,
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes to support dashboard filtering and exports
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_actor_role ON public.audit_logs (actor_role);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_household_id ON public.audit_logs (household_id);

-- Enable RLS and restrict visibility to property managers and admins
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    )
  );

-- Allow privileged users to insert audit records while permitting
-- service-role and backend automations to bypass via direct SQL.
CREATE POLICY "Privileged users can append audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'property_manager')
    ) OR actor_id = auth.uid()
  );

-- Helper function to power filter dropdowns in the dashboard
CREATE OR REPLACE FUNCTION public.get_audit_log_filter_options()
RETURNS TABLE (
  actor_roles TEXT[],
  actions TEXT[],
  entity_types TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      ARRAY(
        SELECT DISTINCT actor_role
        FROM public.audit_logs
        WHERE actor_role IS NOT NULL
        ORDER BY actor_role
      ),
      ARRAY[]::TEXT[]
    ),
    COALESCE(
      ARRAY(
        SELECT DISTINCT action
        FROM public.audit_logs
        ORDER BY action
      ),
      ARRAY[]::TEXT[]
    ),
    COALESCE(
      ARRAY(
        SELECT DISTINCT entity_type
        FROM public.audit_logs
        ORDER BY entity_type
      ),
      ARRAY[]::TEXT[]
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
