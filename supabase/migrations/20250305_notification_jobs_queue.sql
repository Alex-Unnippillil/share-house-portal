-- Notification job queue infrastructure for asynchronous notification processing
CREATE TABLE public.notification_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('email', 'in_app', 'bulk', 'payment_receipt')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX notification_jobs_status_scheduled_idx
  ON public.notification_jobs (status, scheduled_at);

CREATE INDEX notification_jobs_scheduled_idx
  ON public.notification_jobs (scheduled_at);

CREATE TABLE public.notification_dead_letters (
  id UUID PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL,
  error TEXT,
  correlation_id TEXT,
  failed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_jobs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_dead_letters
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notification jobs" ON public.notification_jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage notification dead letters" ON public.notification_dead_letters
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_notification_jobs_updated_at
  BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
