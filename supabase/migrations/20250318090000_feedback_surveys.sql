-- Create survey windows to coordinate quarterly NPS prompts
CREATE TABLE public.nps_survey_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_year INTEGER NOT NULL,
  survey_quarter INTEGER NOT NULL CHECK (survey_quarter BETWEEN 1 AND 4),
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT nps_survey_windows_year_quarter_unique UNIQUE (survey_year, survey_quarter)
);

CREATE INDEX idx_nps_survey_windows_active ON public.nps_survey_windows (start_at DESC, end_at DESC);

-- Capture individual NPS responses scoped to a survey window
CREATE TABLE public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id UUID NOT NULL REFERENCES public.nps_survey_windows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  feedback TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_nps_responses_user_window ON public.nps_responses (user_id, window_id);
CREATE INDEX idx_nps_responses_created_at ON public.nps_responses (created_at DESC);

-- Store transactional CSAT feedback for high-impact flows
CREATE TABLE public.csat_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('document_signed', 'maintenance_resolved')),
  context_id UUID,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_csat_responses_user_context ON public.csat_responses (user_id, context, context_id);
CREATE INDEX idx_csat_responses_context ON public.csat_responses (context);
CREATE INDEX idx_csat_responses_created_at ON public.csat_responses (created_at DESC);

-- Enable RLS and expose data appropriately
ALTER TABLE public.nps_survey_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active NPS windows"
  ON public.nps_survey_windows
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own NPS responses"
  ON public.nps_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own NPS responses"
  ON public.nps_responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Property staff can view all NPS responses"
  ON public.nps_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Users can insert their own CSAT responses"
  ON public.csat_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own CSAT responses"
  ON public.csat_responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Property staff can view all CSAT responses"
  ON public.csat_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

-- Function used by cron to ensure an active survey window exists each quarter
CREATE OR REPLACE FUNCTION public.activate_quarterly_nps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_start TIMESTAMP WITH TIME ZONE := date_trunc('quarter', now());
  current_end TIMESTAMP WITH TIME ZONE := (date_trunc('quarter', now()) + INTERVAL '3 months') - INTERVAL '1 second';
  current_year INTEGER := EXTRACT(YEAR FROM current_start);
  current_quarter INTEGER := EXTRACT(QUARTER FROM current_start);
BEGIN
  INSERT INTO public.nps_survey_windows (survey_year, survey_quarter, start_at, end_at, activated_at)
  VALUES (current_year, current_quarter, current_start, current_end, NOW())
  ON CONFLICT (survey_year, survey_quarter)
  DO UPDATE SET
    start_at = EXCLUDED.start_at,
    end_at = EXCLUDED.end_at,
    activated_at = NOW();
END;
$$;

-- Ensure the cron job exists to activate the survey window on the first business day of the quarter
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nps-quarterly-survey') THEN
    PERFORM cron.schedule(
      'nps-quarterly-survey',
      '0 9 1 JAN,APR,JUL,OCT *',
      $$select public.activate_quarterly_nps();$$
    );
  END IF;
END $$;

-- Seed the current quarter window immediately so clients can display prompts without waiting for cron
SELECT public.activate_quarterly_nps();
