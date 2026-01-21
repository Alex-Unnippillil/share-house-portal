-- Create tables for NPS and CSAT feedback collection
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment TEXT,
  survey_period TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS nps_responses_user_period_idx
  ON public.nps_responses (user_id, survey_period);

COMMENT ON TABLE public.nps_responses IS 'Quarterly Net Promoter Score responses keyed by survey period.';
COMMENT ON COLUMN public.nps_responses.survey_period IS 'Format: YYYY-Q#, e.g. 2025-Q1';

CREATE TABLE IF NOT EXISTS public.csat_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  flow TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS csat_responses_flow_idx
  ON public.csat_responses (flow, created_at DESC);

COMMENT ON TABLE public.csat_responses IS 'Lightweight post-flow CSAT responses (1-5 scale).';
