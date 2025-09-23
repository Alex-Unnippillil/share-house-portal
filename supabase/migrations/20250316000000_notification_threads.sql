-- Add thread metadata to notifications and introduce per-thread preferences
ALTER TABLE public.notifications
  ADD COLUMN thread_id TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN source TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN thread_label TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_thread_id ON public.notifications(thread_id);
CREATE INDEX IF NOT EXISTS idx_notifications_source ON public.notifications(source);

CREATE TABLE IF NOT EXISTS public.notification_thread_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  source TEXT NOT NULL,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  muted_at TIMESTAMP WITH TIME ZONE,
  thread_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notification_thread_preferences_user_thread
  ON public.notification_thread_preferences(user_id, thread_id);

ALTER TABLE public.notification_thread_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their thread preferences"
  ON public.notification_thread_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their thread preferences"
  ON public.notification_thread_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their thread preferences"
  ON public.notification_thread_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their thread preferences"
  ON public.notification_thread_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_notification_thread_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_thread_preferences_updated_at
  ON public.notification_thread_preferences;

CREATE TRIGGER update_notification_thread_preferences_updated_at
  BEFORE UPDATE ON public.notification_thread_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_thread_preferences_updated_at();
