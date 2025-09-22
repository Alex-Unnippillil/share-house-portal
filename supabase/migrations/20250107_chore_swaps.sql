-- Chore assignments and swap workflow

-- Create chore_assignments table
CREATE TABLE public.chore_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  unit_id UUID,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'skipped')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chore_swaps table to manage swap proposals
CREATE TABLE public.chore_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.chore_assignments(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Household messages channel for swap notifications
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'household',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'system' CHECK (message_type IN ('system', 'user', 'alert')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_chore_assignments_unit_id ON public.chore_assignments(unit_id);
CREATE INDEX idx_chore_assignments_assigned_to ON public.chore_assignments(assigned_to);
CREATE INDEX idx_chore_assignments_scheduled_for ON public.chore_assignments(scheduled_for DESC);

CREATE INDEX idx_chore_swaps_assignment_id ON public.chore_swaps(assignment_id);
CREATE INDEX idx_chore_swaps_requester_id ON public.chore_swaps(requester_id);
CREATE INDEX idx_chore_swaps_responder_id ON public.chore_swaps(responder_id);
CREATE INDEX idx_chore_swaps_status ON public.chore_swaps(status);

CREATE INDEX idx_messages_unit_channel ON public.messages(unit_id, channel);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Updated at triggers
CREATE TRIGGER update_chore_assignments_updated_at
  BEFORE UPDATE ON public.chore_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chore_swaps_updated_at
  BEFORE UPDATE ON public.chore_swaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable row level security
ALTER TABLE public.chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Chore assignments policies
CREATE POLICY "Roommates can view unit chore assignments" ON public.chore_assignments
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles requester
      JOIN public.profiles viewer ON requester.unit_id = viewer.unit_id
      WHERE requester.id = chore_assignments.assigned_to
        AND viewer.id = auth.uid()
    )
  );

CREATE POLICY "Swap responders can update chore assignments" ON public.chore_assignments
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chore_swaps cs
      WHERE cs.assignment_id = chore_assignments.id
        AND cs.responder_id = auth.uid()
        AND cs.status = 'pending'
    )
  ) WITH CHECK (TRUE);

-- Chore swap policies
CREATE POLICY "Participants can view chore swaps" ON public.chore_swaps
  FOR SELECT USING (
    requester_id = auth.uid()
    OR responder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chore_assignments ca
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      JOIN public.profiles assignee ON assignee.id = ca.assigned_to
      WHERE ca.id = chore_swaps.assignment_id
        AND viewer.unit_id = assignee.unit_id
    )
  );

CREATE POLICY "Assignees can propose chore swaps" ON public.chore_swaps
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Responders can update chore swaps" ON public.chore_swaps
  FOR UPDATE USING (responder_id = auth.uid()) WITH CHECK (responder_id = auth.uid());

-- Messaging policies scoped to unit
CREATE POLICY "Roommates can read unit messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.unit_id = messages.unit_id
    )
  );

CREATE POLICY "Roommates can post unit messages" ON public.messages
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.unit_id = messages.unit_id
    )
  );
