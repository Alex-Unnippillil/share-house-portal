BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_meetings_user_id
  ON public.meetings (user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_meetings_unit_id
  ON public.meetings (unit_id, start_time DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_google_event_id
  ON public.meetings (google_event_id)
  WHERE google_event_id IS NOT NULL;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meetings" ON public.meetings;
CREATE POLICY "Users can view own meetings"
  ON public.meetings
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (unit_id IS NOT NULL AND public.can_access_unit(unit_id))
  );

DROP POLICY IF EXISTS "Users can create own meetings" ON public.meetings;
CREATE POLICY "Users can create own meetings"
  ON public.meetings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meetings" ON public.meetings;
CREATE POLICY "Users can update own meetings"
  ON public.meetings
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own meetings" ON public.meetings;
CREATE POLICY "Users can delete own meetings"
  ON public.meetings
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

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

CREATE INDEX IF NOT EXISTS idx_user_tokens_provider
  ON public.user_tokens (provider);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own tokens" ON public.user_tokens;
CREATE POLICY "Users can read own tokens"
  ON public.user_tokens
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can write own tokens" ON public.user_tokens;
CREATE POLICY "Users can write own tokens"
  ON public.user_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;
CREATE POLICY "Users can update own tokens"
  ON public.user_tokens
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own tokens" ON public.user_tokens;
CREATE POLICY "Users can delete own tokens"
  ON public.user_tokens
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

DROP TRIGGER IF EXISTS set_user_tokens_updated_at ON public.user_tokens;
CREATE TRIGGER set_user_tokens_updated_at
  BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
