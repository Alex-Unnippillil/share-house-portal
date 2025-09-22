-- Performance monitoring schema and scheduled alerting

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS vault;

-- Raw performance log storage (outlier samples)
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL CHECK (source IN ('supabase-client', 'api-middleware')),
  key TEXT NOT NULL,
  helper TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('server', 'browser', 'edge', 'worker')),
  duration_ms NUMERIC NOT NULL,
  threshold TEXT NOT NULL CHECK (threshold IN ('p95', 'p99')),
  calculated_p95_ms NUMERIC,
  calculated_p99_ms NUMERIC,
  sample_size INTEGER,
  status_code INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at
  ON public.performance_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_logs_key
  ON public.performance_logs (key);
CREATE INDEX IF NOT EXISTS idx_performance_logs_source
  ON public.performance_logs (source);

-- Threshold configuration describing alert windows and channels
CREATE TABLE IF NOT EXISTS public.performance_thresholds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  target TEXT NOT NULL UNIQUE,
  description TEXT,
  window_interval INTERVAL NOT NULL DEFAULT INTERVAL '15 minutes',
  max_p95_ms NUMERIC,
  max_p99_ms NUMERIC,
  max_p95_count INTEGER,
  max_p99_count INTEGER,
  slack_webhook_secret TEXT,
  email_webhook_secret TEXT,
  email_recipients TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_performance_thresholds_active
  ON public.performance_thresholds (active)
  WHERE active IS TRUE;

-- Historical alert records for auditing notifications
CREATE TABLE IF NOT EXISTS public.performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  target TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  p95_duration_ms NUMERIC,
  p99_duration_ms NUMERIC,
  p95_breach_count INTEGER DEFAULT 0,
  p99_breach_count INTEGER DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  notification_status TEXT NOT NULL CHECK (notification_status IN ('sent', 'failed', 'skipped')),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_target
  ON public.performance_alerts (target);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_created_at
  ON public.performance_alerts (created_at DESC);

ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;

-- Aggregation and notification routine
CREATE OR REPLACE FUNCTION public.process_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_metrics RECORD;
  v_slack_url TEXT;
  v_email_url TEXT;
  v_payload JSONB;
  v_status TEXT;
BEGIN
  FOR v_threshold IN
    SELECT *
    FROM public.performance_thresholds
    WHERE active IS TRUE
  LOOP
    v_window_start := v_now - COALESCE(v_threshold.window_interval, INTERVAL '15 minutes');

    SELECT
      COUNT(*)::INTEGER AS sample_size,
      COUNT(*) FILTER (WHERE threshold = 'p95')::INTEGER AS p95_breach_count,
      COUNT(*) FILTER (WHERE threshold = 'p99')::INTEGER AS p99_breach_count,
      MAX(calculated_p95_ms)::NUMERIC AS observed_p95_ms,
      MAX(calculated_p99_ms)::NUMERIC AS observed_p99_ms,
      MAX(duration_ms) FILTER (WHERE threshold = 'p95')::NUMERIC AS max_p95_duration_ms,
      MAX(duration_ms) FILTER (WHERE threshold = 'p99')::NUMERIC AS max_p99_duration_ms
    INTO v_metrics
    FROM public.performance_logs
    WHERE key = v_threshold.target
      AND created_at >= v_window_start
      AND created_at <= v_now;

    IF COALESCE(v_metrics.sample_size, 0) = 0 THEN
      CONTINUE;
    END IF;

    IF (v_threshold.max_p95_ms IS NOT NULL AND COALESCE(v_metrics.observed_p95_ms, 0) > v_threshold.max_p95_ms)
       OR (v_threshold.max_p99_ms IS NOT NULL AND COALESCE(v_metrics.observed_p99_ms, 0) > v_threshold.max_p99_ms)
       OR (v_threshold.max_p95_count IS NOT NULL AND v_metrics.p95_breach_count > v_threshold.max_p95_count)
       OR (v_threshold.max_p99_count IS NOT NULL AND v_metrics.p99_breach_count > v_threshold.max_p99_count)
    THEN
      v_payload := jsonb_build_object(
        'target', v_threshold.target,
        'window', jsonb_build_object('start', v_window_start, 'end', v_now),
        'metrics', jsonb_build_object(
          'sample_size', v_metrics.sample_size,
          'p95_count', v_metrics.p95_breach_count,
          'p99_count', v_metrics.p99_breach_count,
          'observed_p95_ms', v_metrics.observed_p95_ms,
          'observed_p99_ms', v_metrics.observed_p99_ms,
          'max_p95_duration_ms', v_metrics.max_p95_duration_ms,
          'max_p99_duration_ms', v_metrics.max_p99_duration_ms
        ),
        'thresholds', jsonb_build_object(
          'max_p95_ms', v_threshold.max_p95_ms,
          'max_p99_ms', v_threshold.max_p99_ms,
          'max_p95_count', v_threshold.max_p95_count,
          'max_p99_count', v_threshold.max_p99_count
        ),
        'metadata', COALESCE(v_threshold.metadata, '{}'::jsonb)
      );

      v_status := 'sent';

      IF v_threshold.slack_webhook_secret IS NOT NULL THEN
        BEGIN
          v_slack_url := vault.get_secret(v_threshold.slack_webhook_secret)::TEXT;
        EXCEPTION
          WHEN OTHERS THEN
            v_slack_url := NULL;
        END;

        IF v_slack_url IS NOT NULL THEN
          BEGIN
            PERFORM net.http_post(
              url := v_slack_url,
              headers := jsonb_build_object('Content-Type', 'application/json'),
              body := jsonb_build_object(
                'text',
                format(
                  ':rotating_light: Performance alert for %s\nWindow: %s → %s\nObserved p95: %s ms (limit %s)\nObserved p99: %s ms (limit %s)\nBreaches — p95: %s, p99: %s',
                  v_threshold.target,
                  v_window_start,
                  v_now,
                  COALESCE(v_metrics.observed_p95_ms, 0),
                  COALESCE(v_threshold.max_p95_ms, 0),
                  COALESCE(v_metrics.observed_p99_ms, 0),
                  COALESCE(v_threshold.max_p99_ms, 0),
                  COALESCE(v_metrics.p95_breach_count, 0),
                  COALESCE(v_metrics.p99_breach_count, 0)
                )
              )::TEXT
            );
          EXCEPTION
            WHEN OTHERS THEN
              v_status := 'failed';
          END;
        END IF;
      END IF;

      IF v_threshold.email_webhook_secret IS NOT NULL AND v_threshold.email_recipients IS NOT NULL THEN
        BEGIN
          v_email_url := vault.get_secret(v_threshold.email_webhook_secret)::TEXT;
        EXCEPTION
          WHEN OTHERS THEN
            v_email_url := NULL;
        END;

        IF v_email_url IS NOT NULL THEN
          BEGIN
            PERFORM net.http_post(
              url := v_email_url,
              headers := jsonb_build_object('Content-Type', 'application/json'),
              body := jsonb_build_object(
                'subject', COALESCE(v_threshold.metadata->>'email_subject', format('Performance alert for %s', v_threshold.target)),
                'recipients', v_threshold.email_recipients,
                'payload', v_payload
              )::TEXT
            );
          EXCEPTION
            WHEN OTHERS THEN
              v_status := 'failed';
          END;
        END IF;
      END IF;

      INSERT INTO public.performance_alerts (
        target,
        window_start,
        window_end,
        p95_duration_ms,
        p99_duration_ms,
        p95_breach_count,
        p99_breach_count,
        sample_size,
        notification_status,
        metadata
      )
      VALUES (
        v_threshold.target,
        v_window_start,
        v_now,
        v_metrics.observed_p95_ms,
        v_metrics.observed_p99_ms,
        COALESCE(v_metrics.p95_breach_count, 0),
        COALESCE(v_metrics.p99_breach_count, 0),
        COALESCE(v_metrics.sample_size, 0),
        v_status,
        v_payload
      );

      UPDATE public.performance_thresholds
      SET last_triggered_at = v_now
      WHERE id = v_threshold.id;
    END IF;
  END LOOP;
END;
$$;

-- Schedule aggregation to run every five minutes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'performance-metrics-aggregation'
  ) THEN
    PERFORM cron.schedule(
      'performance-metrics-aggregation',
      '*/5 * * * *',
      $$SELECT public.process_performance_metrics();$$
    );
  END IF;
END;
$$;
