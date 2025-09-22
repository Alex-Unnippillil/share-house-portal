-- Track chore participation outcomes so we can derive fairness metrics per member
CREATE TABLE IF NOT EXISTS public.chore_participation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chore_name TEXT NOT NULL,
  occurrence_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed')),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS chore_participation_logs_member_id_idx
  ON public.chore_participation_logs(member_id);

CREATE INDEX IF NOT EXISTS chore_participation_logs_occurrence_date_idx
  ON public.chore_participation_logs(occurrence_date DESC);

ALTER TABLE public.chore_participation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Members can manage their own chore participation logs"
  ON public.chore_participation_logs
  FOR ALL
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Property managers can view all chore participation logs"
  ON public.chore_participation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE OR REPLACE VIEW public.member_fairness_metrics AS
WITH member_counts AS (
  SELECT
    member_id,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'missed') AS missed_count,
    MAX(recorded_at) AS last_recorded_at
  FROM public.chore_participation_logs
  GROUP BY member_id
)
SELECT
  p.id AS member_id,
  p.full_name,
  p.email,
  p.role,
  p.avatar_url,
  COALESCE(mc.completed_count, 0)::int AS completed_count,
  COALESCE(mc.missed_count, 0)::int AS missed_count,
  (COALESCE(mc.completed_count, 0) - COALESCE(mc.missed_count, 0))::int AS fairness_score,
  mc.last_recorded_at
FROM public.profiles p
LEFT JOIN member_counts mc ON mc.member_id = p.id;
