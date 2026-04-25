CREATE TABLE IF NOT EXISTS public.retention_execution_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  job_id text NOT NULL,
  entity text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('execute', 'dry-run')),
  candidates integer NOT NULL DEFAULT 0,
  affected integer NOT NULL DEFAULT 0,
  error text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_retention_execution_audit_logs_job_id
  ON public.retention_execution_audit_logs(job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_retention_execution_audit_logs_entity
  ON public.retention_execution_audit_logs(entity, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_retention_execution_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'retention_execution_audit_logs is append-only';
END;
$$;

DROP TRIGGER IF EXISTS retention_execution_audit_logs_prevent_update
  ON public.retention_execution_audit_logs;
CREATE TRIGGER retention_execution_audit_logs_prevent_update
BEFORE UPDATE ON public.retention_execution_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_retention_execution_audit_mutation();

DROP TRIGGER IF EXISTS retention_execution_audit_logs_prevent_delete
  ON public.retention_execution_audit_logs;
CREATE TRIGGER retention_execution_audit_logs_prevent_delete
BEFORE DELETE ON public.retention_execution_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_retention_execution_audit_mutation();
