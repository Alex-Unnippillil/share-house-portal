-- Messaging moderation schema for message board
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID,
  unit_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  flagged_count INTEGER NOT NULL DEFAULT 0 CHECK (flagged_count >= 0),
  last_flagged_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.message_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'hidden', 'escalated', 'resolved')),
  reason TEXT NOT NULL,
  resolution_notes TEXT,
  escalation_notes TEXT,
  escalated_at TIMESTAMP WITH TIME ZONE,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_unit_id ON public.messages(unit_id);
CREATE INDEX idx_messages_visible ON public.messages(visible);
CREATE INDEX idx_messages_last_flagged_at ON public.messages(last_flagged_at DESC);

CREATE INDEX idx_message_flags_message_id ON public.message_flags(message_id);
CREATE INDEX idx_message_flags_status ON public.message_flags(status);
CREATE INDEX idx_message_flags_flagged_by ON public.message_flags(flagged_by);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role IN ('admin', 'property_manager')
          OR profiles.unit_id = messages.unit_id
        )
    )
  );

CREATE POLICY "Participants can create messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role IN ('admin', 'property_manager')
          OR profiles.unit_id = messages.unit_id
        )
    )
  );

CREATE POLICY "Authors can update their messages" ON public.messages
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Moderators can manage messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'property_manager')
    )
  );

CREATE POLICY "Flag authors and moderators can view flags" ON public.message_flags
  FOR SELECT USING (
    flagged_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'property_manager')
    )
  );

CREATE POLICY "Household members can flag messages" ON public.message_flags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.profiles ON profiles.unit_id = messages.unit_id
      WHERE messages.id = message_flags.message_id AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Moderators can update flags" ON public.message_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'property_manager')
    )
  );

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_flags_updated_at
  BEFORE UPDATE ON public.message_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

