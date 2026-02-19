BEGIN;

CREATE TABLE IF NOT EXISTS public.manager_unit_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
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
  SELECT role::text
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
  SELECT COALESCE(public.current_user_role() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.can_access_unit(target_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unit_id = target_unit_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.manager_unit_assignments mua
      WHERE mua.manager_id = auth.uid()
        AND mua.unit_id = target_unit_id
    );
$$;

DROP POLICY IF EXISTS "Managers and admins can read assignments" ON public.manager_unit_assignments;
CREATE POLICY "Managers and admins can read assignments" ON public.manager_unit_assignments
  FOR SELECT USING (auth.uid() = manager_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage assignments" ON public.manager_unit_assignments;
CREATE POLICY "Admins manage assignments" ON public.manager_unit_assignments
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  google_event_id text,
  google_event_link text,
  summary text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings (user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_unit_id ON public.meetings (unit_id, start_time DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_google_event_id
  ON public.meetings (google_event_id)
  WHERE google_event_id IS NOT NULL;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meetings" ON public.meetings;
CREATE POLICY "Users can view own meetings" ON public.meetings
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (unit_id IS NOT NULL AND public.can_access_unit(unit_id))
  );

DROP POLICY IF EXISTS "Users can create own meetings" ON public.meetings;
CREATE POLICY "Users can create own meetings" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meetings" ON public.meetings;
CREATE POLICY "Users can update own meetings" ON public.meetings
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own meetings" ON public.meetings;
CREATE POLICY "Users can delete own meetings" ON public.meetings
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

DROP TRIGGER IF EXISTS set_meetings_updated_at ON public.meetings;
CREATE TRIGGER set_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token text,
  provider text NOT NULL DEFAULT 'google',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_provider ON public.user_tokens (provider);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own tokens" ON public.user_tokens;
CREATE POLICY "Users can read own tokens" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can write own tokens" ON public.user_tokens;
CREATE POLICY "Users can write own tokens" ON public.user_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;
CREATE POLICY "Users can update own tokens" ON public.user_tokens
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own tokens" ON public.user_tokens;
CREATE POLICY "Users can delete own tokens" ON public.user_tokens
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

DROP TRIGGER IF EXISTS set_user_tokens_updated_at ON public.user_tokens;
CREATE TRIGGER set_user_tokens_updated_at
  BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe')),
  event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed', 'dead_lettered')),
  payload jsonb,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  last_attempt_at timestamptz,
  dead_lettered_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_status
  ON public.webhook_events(provider, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_dead_lettered
  ON public.webhook_events(provider, status, dead_lettered_at DESC)
  WHERE status = 'dead_lettered';

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view webhook events" ON public.webhook_events;
CREATE POLICY "Managers can view webhook events" ON public.webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Service role can manage webhook events" ON public.webhook_events;
CREATE POLICY "Service role can manage webhook events" ON public.webhook_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_webhook_events_updated_at ON public.webhook_events;
CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.data_integrity_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_type text NOT NULL CHECK (finding_type IN ('booking_duplicate', 'payment_mismatch', 'document_stale')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
  finding_key text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz,
  UNIQUE (finding_type, finding_key, detected_at)
);

CREATE INDEX IF NOT EXISTS idx_data_integrity_findings_open
  ON public.data_integrity_findings (finding_type, detected_at DESC)
  WHERE resolved_at IS NULL;

COMMIT;
