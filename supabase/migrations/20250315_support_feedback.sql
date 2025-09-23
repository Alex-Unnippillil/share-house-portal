-- Create a table for collecting diagnostics from the in-app feedback widget
CREATE TABLE public.support_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  page_url TEXT,
  user_agent TEXT,
  timezone TEXT,
  console_logs JSONB DEFAULT '[]'::jsonb,
  network_har JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ensure RLS is enforced
ALTER TABLE public.support_feedback ENABLE ROW LEVEL SECURITY;

-- Allow residents to submit feedback (even anonymously)
CREATE POLICY "Residents can submit feedback" ON public.support_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = submitted_by OR submitted_by IS NULL);

-- Permit property managers and admins to review submissions
CREATE POLICY "Support staff can review feedback" ON public.support_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('property_manager', 'admin')
    )
  );
