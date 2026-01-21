-- Create table for Real User Monitoring samples
CREATE TABLE public.perf_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  pathname TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  locale TEXT,
  timezone TEXT,
  navigation_type TEXT,
  connection JSONB,
  viewport JSONB,
  metrics JSONB NOT NULL,
  budget_status JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_perf_metrics_created_at ON public.perf_metrics(created_at DESC);
CREATE INDEX idx_perf_metrics_session_id ON public.perf_metrics(session_id);
CREATE INDEX idx_perf_metrics_user_id ON public.perf_metrics(user_id);

ALTER TABLE public.perf_metrics ENABLE ROW LEVEL SECURITY;

-- Only service role should be able to insert/update/delete samples.
CREATE POLICY "Service role manage perf metrics" ON public.perf_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow admins and property managers to query samples for dashboards.
CREATE POLICY "Admin access to perf metrics" ON public.perf_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );
