-- Create drafts table for autosaving maintenance requests
CREATE TABLE public.maintenance_request_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX maintenance_request_drafts_user_id_key
  ON public.maintenance_request_drafts(user_id);

ALTER TABLE public.maintenance_request_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their maintenance request drafts" ON public.maintenance_request_drafts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_maintenance_request_drafts_updated_at
  BEFORE UPDATE ON public.maintenance_request_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
