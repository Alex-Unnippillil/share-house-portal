-- Track UX support feedback and "stuck" reports for overnight visitor and notification flows
CREATE TABLE public.support_feedback_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'resolved', 'escalated')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_support_feedback_events_user_id ON public.support_feedback_events(user_id);
CREATE INDEX idx_support_feedback_events_status ON public.support_feedback_events(status);
CREATE INDEX idx_support_feedback_events_created_at ON public.support_feedback_events(created_at DESC);

ALTER TABLE public.support_feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their support feedback" ON public.support_feedback_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own support feedback" ON public.support_feedback_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view support feedback" ON public.support_feedback_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Managers can update support feedback" ON public.support_feedback_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE TRIGGER update_support_feedback_events_updated_at
  BEFORE UPDATE ON public.support_feedback_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
