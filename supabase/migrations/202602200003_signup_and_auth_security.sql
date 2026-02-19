BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_username_format'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format
      CHECK (username IS NULL OR username ~ '^[A-Za-z0-9._-]{3,30}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_ci
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  communication_channel text NOT NULL DEFAULT 'in_app' CHECK (communication_channel IN ('in_app', 'sms', 'email', 'all')),
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text NOT NULL DEFAULT 'UTC',
  email_receipt_opt_in boolean NOT NULL DEFAULT true,
  booking_reminder_opt_in boolean NOT NULL DEFAULT true,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_channel
  ON public.user_preferences (communication_channel);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'signup_started',
      'signup_completed',
      'email_verification_sent',
      'email_verified',
      'login_succeeded',
      'login_failed',
      'password_reset_requested',
      'password_reset_completed'
    )
  ),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  ip_address inet,
  user_agent text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_auth_security_events_user_id
  ON public.auth_security_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_security_events_event_type
  ON public.auth_security_events (event_type, created_at DESC);

ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own auth events" ON public.auth_security_events;
CREATE POLICY "Users can read own auth events" ON public.auth_security_events
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Service role manages auth events" ON public.auth_security_events;
CREATE POLICY "Service role manages auth events" ON public.auth_security_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_role public.profile_role;
BEGIN
  desired_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.profile_role, 'tenant'::public.profile_role);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    role,
    email_verified_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(lower(NEW.raw_user_meta_data ->> 'username'), ''),
    desired_role,
    NEW.email_confirmed_at,
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.profiles.email_verified_at),
    last_sign_in_at = NEW.last_sign_in_at,
    updated_at = timezone('utc', now());

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    email_verified_at = NEW.email_confirmed_at,
    last_sign_in_at = NEW.last_sign_in_at,
    updated_at = timezone('utc', now())
  WHERE id = NEW.id;

  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.auth_security_events (user_id, event_type, status, context)
    VALUES (NEW.id, 'email_verified', 'success', jsonb_build_object('email', NEW.email));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_auth_user_profile();

DROP TRIGGER IF EXISTS set_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
