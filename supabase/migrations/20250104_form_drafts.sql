-- Form drafts autosave storage
CREATE TABLE public.form_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_form_drafts_user_form_key ON public.form_drafts(user_id, form_key);
CREATE INDEX idx_form_drafts_expires_at ON public.form_drafts(expires_at);

ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own form drafts" ON public.form_drafts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_form_drafts_updated_at
  BEFORE UPDATE ON public.form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Schedule cleanup of stale drafts every day at 3 AM UTC
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup_form_drafts';

SELECT
  cron.schedule(
    'cleanup_form_drafts',
    '0 3 * * *',
    $$
      DELETE FROM public.form_drafts
      WHERE (expires_at IS NOT NULL AND expires_at < NOW())
         OR updated_at < NOW() - INTERVAL '30 days';
    $$
  );
