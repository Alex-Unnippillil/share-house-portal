BEGIN;

-- Ensure visitor workflow parity for approval policies and audit history.
ALTER TABLE public.visitor_logs
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id),
  ADD COLUMN IF NOT EXISTS host_roommate_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS requires_manager_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS decision_notes text,
  ADD COLUMN IF NOT EXISTS policy_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS policy_violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS consecutive_nights integer,
  ADD COLUMN IF NOT EXISTS last_action_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz;

UPDATE public.visitor_logs
SET reason = COALESCE(reason, purpose)
WHERE reason IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'visitor_logs'
      AND column_name = 'reason'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.visitor_logs
      ALTER COLUMN reason SET NOT NULL;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.visitor_unit_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  max_consecutive_nights integer NOT NULL DEFAULT 3 CHECK (max_consecutive_nights > 0),
  requires_manager_approval boolean NOT NULL DEFAULT true,
  blackout_windows jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(unit_id)
);

CREATE TABLE IF NOT EXISTS public.visitor_log_audit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_log_id uuid NOT NULL REFERENCES public.visitor_logs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  notes text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_unit_id ON public.visitor_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_approval_status ON public.visitor_logs(approval_status);
CREATE INDEX IF NOT EXISTS idx_visitor_audit_log_id ON public.visitor_log_audit_entries(visitor_log_id);

ALTER TABLE public.visitor_unit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_log_audit_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view visitor unit policy for their unit" ON public.visitor_unit_policies;
CREATE POLICY "Users can view visitor unit policy for their unit" ON public.visitor_unit_policies
  FOR SELECT USING (public.can_access_unit(unit_id));

DROP POLICY IF EXISTS "Managers can manage visitor unit policies" ON public.visitor_unit_policies;
CREATE POLICY "Managers can manage visitor unit policies" ON public.visitor_unit_policies
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unit_id = visitor_unit_policies.unit_id
        AND p.role = 'property_manager'
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unit_id = visitor_unit_policies.unit_id
        AND p.role = 'property_manager'
    )
  );

DROP POLICY IF EXISTS "Users can view visitor audit trail for their unit" ON public.visitor_log_audit_entries;
CREATE POLICY "Users can view visitor audit trail for their unit" ON public.visitor_log_audit_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.visitor_logs vl
      WHERE vl.id = visitor_log_audit_entries.visitor_log_id
        AND vl.unit_id IS NOT NULL
        AND public.can_access_unit(vl.unit_id)
    )
  );

DROP POLICY IF EXISTS "System can insert visitor audit entries" ON public.visitor_log_audit_entries;
CREATE POLICY "System can insert visitor audit entries" ON public.visitor_log_audit_entries
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
    OR auth.role() = 'service_role'
    OR public.is_admin()
  );

DROP TRIGGER IF EXISTS set_visitor_unit_policies_updated_at ON public.visitor_unit_policies;
CREATE TRIGGER set_visitor_unit_policies_updated_at
  BEFORE UPDATE ON public.visitor_unit_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stripe recurring billing records used by webhook + account pages.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Property managers can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Property managers can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'property_manager'
    )
  );

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contact and communication tables required by app routes and realtime surfaces.
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_inquiries_email ON public.inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.inquiries;
CREATE POLICY "Anyone can create inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Property managers can view inquiries" ON public.inquiries;
CREATE POLICY "Property managers can view inquiries" ON public.inquiries
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'property_manager'
    )
  );

DROP TRIGGER IF EXISTS set_inquiries_updated_at ON public.inquiries;
CREATE TRIGGER set_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  action_url text,
  metadata jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  error_message text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON public.email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON public.email_notifications(sent_at DESC);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own email notifications" ON public.email_notifications;
CREATE POLICY "Users can view their own email notifications" ON public.email_notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Service role can manage email notifications" ON public.email_notifications;
CREATE POLICY "Service role can manage email notifications" ON public.email_notifications
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true,
      updated_at = timezone('utc', now())
  WHERE id = ANY(notification_ids)
    AND (user_id = auth.uid() OR public.is_admin());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM public.notifications
    WHERE user_id = user_uuid
      AND read = false
  );
END;
$$;

COMMIT;
