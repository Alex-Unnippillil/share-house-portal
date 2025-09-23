-- Capture resident feedback via quarterly NPS and flow-specific CSAT prompts
CREATE TABLE public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  quarter_start DATE NOT NULL,
  quarter_end DATE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX nps_responses_user_quarter_idx
  ON public.nps_responses(user_id, quarter_start);
CREATE INDEX nps_responses_quarter_idx
  ON public.nps_responses(quarter_start);
CREATE INDEX nps_responses_submitted_at_idx
  ON public.nps_responses(submitted_at DESC);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own NPS responses"
  ON public.nps_responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can read resident NPS responses"
  ON public.nps_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Users can create their quarterly NPS response"
  ON public.nps_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE public.csat_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow TEXT NOT NULL CHECK (char_length(flow) >= 3),
  context_identifier TEXT NOT NULL CHECK (char_length(context_identifier) >= 3),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX csat_responses_user_context_idx
  ON public.csat_responses(user_id, flow, context_identifier);
CREATE INDEX csat_responses_flow_idx
  ON public.csat_responses(flow);
CREATE INDEX csat_responses_submitted_at_idx
  ON public.csat_responses(submitted_at DESC);

ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own CSAT responses"
  ON public.csat_responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can review CSAT responses"
  ON public.csat_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Users can submit CSAT feedback"
  ON public.csat_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
