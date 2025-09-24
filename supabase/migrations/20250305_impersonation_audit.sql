-- Create audit_logs table to capture admin impersonation activity
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_under_impersonation BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_target_user_id ON public.audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role can manage audit logs" ON public.audit_logs
  FOR ALL USING (
    auth.role() = 'service_role'
  ) WITH CHECK (
    auth.role() = 'service_role'
  );
