-- Messaging threads and moderation queue schema with RLS enforcement

-- Threads represent roommate discussions that can be escalated for moderation
CREATE TABLE public.messaging_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  summary TEXT,
  category TEXT,
  unit_label TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Queue entries capture live moderation workflows for threads
CREATE TABLE public.messaging_moderation_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.messaging_threads(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('needs_review', 'monitoring', 'escalated', 'resolved', 'archived')),
  flags INTEGER NOT NULL DEFAULT 0 CHECK (flags >= 0),
  flagged_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  flagged_by_display TEXT NOT NULL,
  flagged_reason TEXT,
  next_step TEXT,
  watchers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messaging_moderation_queue
  ADD CONSTRAINT messaging_moderation_queue_thread_unique UNIQUE (thread_id);

-- Message snapshots provide context for why the thread was flagged
CREATE TABLE public.messaging_moderation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID NOT NULL REFERENCES public.messaging_moderation_queue(id) ON DELETE CASCADE,
  sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  content TEXT NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE
);

-- Workflow events outline the steps taken by property teams
CREATE TABLE public.messaging_moderation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID NOT NULL REFERENCES public.messaging_moderation_queue(id) ON DELETE CASCADE,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT NOT NULL,
  recorded_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Helpful indexes for dashboard queries
CREATE INDEX idx_messaging_threads_last_message_at ON public.messaging_threads(last_message_at DESC NULLS LAST);
CREATE INDEX idx_messaging_queue_thread_id ON public.messaging_moderation_queue(thread_id);
CREATE INDEX idx_messaging_queue_status ON public.messaging_moderation_queue(status);
CREATE INDEX idx_messaging_queue_severity ON public.messaging_moderation_queue(severity);
CREATE INDEX idx_messaging_messages_queue_id ON public.messaging_moderation_messages(queue_id);
CREATE INDEX idx_messaging_events_queue_id ON public.messaging_moderation_events(queue_id);

-- Updated at triggers reuse the shared helper if present
DO $$
BEGIN
  IF to_regclass('public.update_updated_at_column') IS NOT NULL THEN
    EXECUTE 'CREATE TRIGGER update_messaging_threads_updated_at
      BEFORE UPDATE ON public.messaging_threads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';

    EXECUTE 'CREATE TRIGGER update_messaging_queue_updated_at
      BEFORE UPDATE ON public.messaging_moderation_queue
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- Enable Row Level Security so Supabase enforces RBAC rules
ALTER TABLE public.messaging_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_moderation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_moderation_events ENABLE ROW LEVEL SECURITY;

-- Shared predicate: property managers and admins are allowed to moderate
CREATE POLICY "Property teams manage messaging threads" ON public.messaging_threads
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Property teams manage moderation queue" ON public.messaging_moderation_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Property teams manage moderation messages" ON public.messaging_moderation_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Property teams manage moderation events" ON public.messaging_moderation_events
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );
