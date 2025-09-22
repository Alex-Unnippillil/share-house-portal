-- Create maintenance_requests table for maintenance issues
CREATE TABLE public.maintenance_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  category TEXT,
  location TEXT,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  unit_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  metadata JSONB
);

-- Create visitor_logs table for overnight visitor bookings
CREATE TABLE public.visitor_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_date TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose TEXT NOT NULL,
  emergency_contact TEXT,
  special_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  action_url TEXT,
  metadata JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for household realtime conversations
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_notifications table for tracking sent emails
CREATE TABLE public.email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_maintenance_requests_requested_by ON public.maintenance_requests(requested_by);
CREATE INDEX idx_maintenance_requests_assigned_to ON public.maintenance_requests(assigned_to);
CREATE INDEX idx_maintenance_requests_unit_id ON public.maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_priority ON public.maintenance_requests(priority);
CREATE INDEX idx_maintenance_requests_created_at ON public.maintenance_requests(created_at DESC);

CREATE INDEX idx_visitor_logs_host_id ON public.visitor_logs(host_id);
CREATE INDEX idx_visitor_logs_status ON public.visitor_logs(status);
CREATE INDEX idx_visitor_logs_check_in_date ON public.visitor_logs(check_in_date);
CREATE INDEX idx_visitor_logs_created_at ON public.visitor_logs(created_at DESC);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_messages_household_created_at ON public.messages(household_id, created_at DESC);
CREATE INDEX idx_email_notifications_user_id ON public.email_notifications(user_id);
CREATE INDEX idx_email_notifications_sent_at ON public.email_notifications(sent_at DESC);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_requests
CREATE POLICY "Users can view maintenance requests for their unit" ON public.maintenance_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.unit_id = p2.unit_id
      WHERE p1.id = auth.uid() AND p2.id = maintenance_requests.requested_by
    )
  );

CREATE POLICY "Users can create maintenance requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Property managers can update maintenance requests" ON public.maintenance_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'property_manager'
    )
  );

-- RLS Policies for visitor_logs
CREATE POLICY "Users can view visitor logs for their unit" ON public.visitor_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.unit_id = p2.unit_id
      WHERE p1.id = auth.uid() AND p2.id = visitor_logs.host_id
    )
  );

CREATE POLICY "Users can create visitor logs" ON public.visitor_logs
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Property managers can update visitor logs" ON public.visitor_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'property_manager'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Household members can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.unit_id = messages.household_id
    )
  );

CREATE POLICY "Household members can post messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.unit_id = messages.household_id
    )
  );

CREATE POLICY "Authors can edit their messages" ON public.messages
  FOR UPDATE USING (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.unit_id = messages.household_id
    )
  ) WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.unit_id = messages.household_id
    )
  );

CREATE POLICY "Authors can delete their messages" ON public.messages
  FOR DELETE USING (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.unit_id = messages.household_id
    )
  );

-- RLS Policies for email notifications
CREATE POLICY "Users can view their own email notifications" ON public.email_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET read = TRUE, updated_at = NOW()
  WHERE id = ANY(notification_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.notifications
    WHERE user_id = user_uuid AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitor_logs_updated_at
  BEFORE UPDATE ON public.visitor_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed demo messages for realtime testing (idempotent on empty message table)
WITH target_household AS (
  SELECT unit_id AS household_id
  FROM public.profiles
  WHERE unit_id IS NOT NULL
  GROUP BY unit_id
  ORDER BY MIN(created_at)
  LIMIT 1
),
household_members AS (
  SELECT
    p.id AS author_id,
    p.unit_id AS household_id,
    ROW_NUMBER() OVER (PARTITION BY p.unit_id ORDER BY p.id) AS rn
  FROM public.profiles p
  JOIN target_household th ON th.household_id = p.unit_id
),
demo_messages AS (
  SELECT 1 AS rn, '👋 Welcome to your roommate channel! Use this space for reminders and updates.' AS body
  UNION ALL
  SELECT 2, '🧹 Don''t forget to check the cleaning roster before the weekend guests arrive.'
  UNION ALL
  SELECT 3, '📦 Package run tonight at 7 PM—reply if you have deliveries to grab.'
)
INSERT INTO public.messages (household_id, author_id, body, created_at)
SELECT
  hm.household_id,
  hm.author_id,
  dm.body,
  NOW() - ((hm.rn - 1) || ' hours')::INTERVAL
FROM household_members hm
JOIN demo_messages dm ON dm.rn = hm.rn
WHERE hm.rn <= 3
  AND NOT EXISTS (SELECT 1 FROM public.messages);
