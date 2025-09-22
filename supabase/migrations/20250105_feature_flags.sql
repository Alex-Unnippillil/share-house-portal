-- Feature flag table to coordinate progressive delivery across environments
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'preview', 'production')),
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage SMALLINT CHECK (rollout_percentage BETWEEN 0 AND 100),
  targeting JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (slug, environment)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON public.feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_slug ON public.feature_flags(slug);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feature flags" ON public.feature_flags
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
