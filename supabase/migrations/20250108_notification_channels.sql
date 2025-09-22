-- Notification channel enhancements

-- Table to store per-user notification channel preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sms_phone_number TEXT,
  push_subscription JSONB,
  quiet_hours JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to keep an audit log of SMS notifications
CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped', 'queued')),
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to keep an audit log of web push notifications
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at
  ON public.notification_preferences(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_user_id
  ON public.sms_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at
  ON public.sms_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id
  ON public.push_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at
  ON public.push_notifications(created_at DESC);

-- Ensure RLS is enabled
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY IF NOT EXISTS "Users view their notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users insert their notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users update their notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for sms_notifications
CREATE POLICY IF NOT EXISTS "Users view their SMS notifications"
  ON public.sms_notifications
  FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- RLS policies for push_notifications
CREATE POLICY IF NOT EXISTS "Users view their push notifications"
  ON public.push_notifications
  FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- Reuse the shared updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_sms_notifications_updated_at
  BEFORE UPDATE ON public.sms_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_push_notifications_updated_at
  BEFORE UPDATE ON public.push_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
