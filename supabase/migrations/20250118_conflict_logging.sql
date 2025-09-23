-- Add optimistic locking support and conflict resolution logging

-- Ensure maintenance requests track optimistic version numbers
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

UPDATE public.maintenance_requests
SET version = COALESCE(version, 1)
WHERE version IS NULL;

-- Conflict resolution audit table
CREATE TABLE public.conflict_resolution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  resolution TEXT NOT NULL,
  local_version INTEGER,
  remote_version INTEGER,
  merged_fields JSONB DEFAULT '{}'::jsonb,
  resolved_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.conflict_resolution_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to review their own logs and give property staff broader visibility
CREATE POLICY "Users can view their conflict logs" ON public.conflict_resolution_logs
  FOR SELECT USING (resolved_by = auth.uid());

CREATE POLICY "Staff can view all conflict logs" ON public.conflict_resolution_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Upsert helper for recording conflict outcomes
CREATE OR REPLACE FUNCTION log_conflict_resolution(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_resolution TEXT,
  p_local_version INTEGER,
  p_remote_version INTEGER,
  p_merged_fields JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.conflict_resolution_logs (
    entity_type,
    entity_id,
    resolution,
    local_version,
    remote_version,
    merged_fields,
    resolved_by
  )
  VALUES (
    p_entity_type,
    p_entity_id,
    p_resolution,
    p_local_version,
    p_remote_version,
    COALESCE(p_merged_fields, '{}'::jsonb),
    auth.uid()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX IF NOT EXISTS idx_conflict_resolution_logs_entity
  ON public.conflict_resolution_logs(entity_type, entity_id, created_at DESC);

CREATE TRIGGER update_conflict_resolution_logs_updated_at
  BEFORE UPDATE ON public.conflict_resolution_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
