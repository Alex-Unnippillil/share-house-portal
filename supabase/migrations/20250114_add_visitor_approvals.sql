-- Create visitor_approvals table to track roommate approvals for overnight guests
CREATE TABLE public.visitor_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_log_id UUID NOT NULL REFERENCES public.visitor_logs(id) ON DELETE CASCADE,
  roommate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  responded_at TIMESTAMP WITH TIME ZONE,
  response_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_visitor_approvals_log_roommate
  ON public.visitor_approvals(visitor_log_id, roommate_id);
CREATE INDEX idx_visitor_approvals_roommate_id
  ON public.visitor_approvals(roommate_id);
CREATE INDEX idx_visitor_approvals_status
  ON public.visitor_approvals(status);

ALTER TABLE public.visitor_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roommates can view their approvals" ON public.visitor_approvals
  FOR SELECT USING (roommate_id = auth.uid());

CREATE POLICY "Hosts can view approvals for their visitors" ON public.visitor_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs vl
      WHERE vl.id = visitor_approvals.visitor_log_id
        AND vl.host_id = auth.uid()
    )
  );

CREATE POLICY "Property managers can view visitor approvals" ON public.visitor_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs vl
      JOIN public.profiles host_profile ON host_profile.id = vl.host_id
      JOIN public.profiles manager_profile ON manager_profile.id = auth.uid()
      WHERE vl.id = visitor_approvals.visitor_log_id
        AND manager_profile.role = 'property_manager'
        AND manager_profile.unit_id IS NOT NULL
        AND manager_profile.unit_id = host_profile.unit_id
    )
  );

CREATE POLICY "Hosts can create visitor approvals" ON public.visitor_approvals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs vl
      WHERE vl.id = visitor_approvals.visitor_log_id
        AND vl.host_id = auth.uid()
    )
  );

CREATE POLICY "Roommates can update their approvals" ON public.visitor_approvals
  FOR UPDATE USING (roommate_id = auth.uid())
  WITH CHECK (roommate_id = auth.uid());

CREATE POLICY "Property managers can update visitor approvals" ON public.visitor_approvals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs vl
      JOIN public.profiles host_profile ON host_profile.id = vl.host_id
      JOIN public.profiles manager_profile ON manager_profile.id = auth.uid()
      WHERE vl.id = visitor_approvals.visitor_log_id
        AND manager_profile.role = 'property_manager'
        AND manager_profile.unit_id IS NOT NULL
        AND manager_profile.unit_id = host_profile.unit_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs vl
      JOIN public.profiles host_profile ON host_profile.id = vl.host_id
      JOIN public.profiles manager_profile ON manager_profile.id = auth.uid()
      WHERE vl.id = visitor_approvals.visitor_log_id
        AND manager_profile.role = 'property_manager'
        AND manager_profile.unit_id IS NOT NULL
        AND manager_profile.unit_id = host_profile.unit_id
    )
  );

CREATE TRIGGER update_visitor_approvals_updated_at
  BEFORE UPDATE ON public.visitor_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
