-- Analytics event ingestion and daily aggregation pipeline

-- Ensure pg_cron extension is available for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create the analytics event type enum if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'analytics_event_type'
  ) THEN
    CREATE TYPE public.analytics_event_type AS ENUM (
      'rent_payment_submitted',
      'rent_payment_failed',
      'amenity_booking_created',
      'document_signed',
      'maintenance_request_filed',
      'message_posted'
    );
  END IF;
END;
$$;

-- Table to capture raw analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.analytics_event_type NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  actor_id UUID REFERENCES auth.users(id),
  unit_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type_occurred_at
  ON public.analytics_events(event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_unit_id_occurred_at
  ON public.analytics_events(unit_id, occurred_at DESC);

-- Aggregated daily rollups table
CREATE TABLE IF NOT EXISTS public.analytics_daily_rollups (
  rollup_date DATE NOT NULL,
  event_type public.analytics_event_type NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  event_count BIGINT NOT NULL DEFAULT 0,
  unique_actor_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT analytics_daily_rollups_pkey PRIMARY KEY (rollup_date, event_type, scope)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_rollups_event_type_date
  ON public.analytics_daily_rollups(event_type, rollup_date DESC);

-- Recreate the shared trigger helper with UTC semantics
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_analytics_daily_rollups_updated_at ON public.analytics_daily_rollups;
CREATE TRIGGER update_analytics_daily_rollups_updated_at
  BEFORE UPDATE ON public.analytics_daily_rollups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to refresh daily rollups for a specific date (defaults to yesterday)
CREATE OR REPLACE FUNCTION public.refresh_analytics_daily_rollups(target_date DATE DEFAULT (timezone('utc', now())::date - 1))
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  start_ts TIMESTAMP WITH TIME ZONE := timezone('utc', target_date::timestamp);
  end_ts TIMESTAMP WITH TIME ZONE := timezone('utc', (target_date + 1)::timestamp);
BEGIN
  WITH base_events AS (
    SELECT
      event_type,
      unit_id,
      actor_id,
      occurred_at
    FROM public.analytics_events
    WHERE occurred_at >= start_ts
      AND occurred_at < end_ts
  ),
  per_unit AS (
    SELECT
      target_date AS rollup_date,
      event_type,
      unit_id,
      COUNT(*)::BIGINT AS event_count,
      COUNT(DISTINCT actor_id)::INTEGER AS unique_actor_count,
      MIN(occurred_at) AS first_event_at,
      MAX(occurred_at) AS last_event_at
    FROM base_events
    WHERE unit_id IS NOT NULL
    GROUP BY event_type, unit_id
  ),
  global_totals AS (
    SELECT
      target_date AS rollup_date,
      event_type,
      NULL::UUID AS unit_id,
      COUNT(*)::BIGINT AS event_count,
      COUNT(DISTINCT actor_id)::INTEGER AS unique_actor_count,
      MIN(occurred_at) AS first_event_at,
      MAX(occurred_at) AS last_event_at
    FROM base_events
    GROUP BY event_type
  ),
  combined AS (
    SELECT * FROM per_unit
    UNION ALL
    SELECT * FROM global_totals
  )
  INSERT INTO public.analytics_daily_rollups AS rollups (
    rollup_date,
    event_type,
    scope,
    event_count,
    unique_actor_count,
    metadata,
    created_at,
    updated_at
  )
  SELECT
    c.rollup_date,
    c.event_type,
    CASE
      WHEN c.unit_id IS NULL THEN 'global'
      ELSE 'unit:' || c.unit_id::text
    END AS scope,
    c.event_count,
    COALESCE(c.unique_actor_count, 0),
    jsonb_build_object(
      'unit_id', c.unit_id,
      'first_event_at', c.first_event_at,
      'last_event_at', c.last_event_at
    ),
    timezone('utc', now()),
    timezone('utc', now())
  FROM combined c
  ON CONFLICT (rollup_date, event_type, scope)
  DO UPDATE SET
    event_count = EXCLUDED.event_count,
    unique_actor_count = EXCLUDED.unique_actor_count,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Schedule the rollup job to run nightly at 00:05 UTC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'analytics-daily-rollups'
  ) THEN
    PERFORM cron.schedule(
      'analytics-daily-rollups',
      '5 0 * * *',
      $$ SELECT public.refresh_analytics_daily_rollups((timezone('utc', now())::date) - 1); $$
    );
  END IF;
END;
$$;

-- Enable RLS and create policies
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert analytics events" ON public.analytics_events
  FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Privileged roles can read analytics events" ON public.analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Privileged roles can read analytics rollups" ON public.analytics_daily_rollups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );
