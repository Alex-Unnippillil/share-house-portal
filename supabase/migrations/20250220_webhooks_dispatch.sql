-- Webhook delivery infrastructure: subscriptions, queue, attempts, and dead letters

-- Create webhook_subscriptions table to store outbound webhook configuration
CREATE TABLE public.webhook_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL CHECK (target_url ~* '^https?://'),
  signing_secret TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_delivered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Store webhook events separately so that replays can be issued without mutating the original payload
CREATE TABLE public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_reference TEXT
);

-- Delivery queue entries for each subscription targeting a specific event
CREATE TABLE public.webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'retrying', 'succeeded', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  locked_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  response_status INTEGER,
  response_headers JSONB,
  duration_ms INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual attempt audit log rows for observability of each retry
CREATE TABLE public.webhook_delivery_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.webhook_deliveries(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_status INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  signature TEXT,
  request_headers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dead letter queue that captures payloads which exhausted all retries
CREATE TABLE public.webhook_dead_letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.webhook_events(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.webhook_subscriptions(id) ON DELETE SET NULL,
  delivery_id UUID REFERENCES public.webhook_deliveries(id) ON DELETE SET NULL,
  failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  subscription_name TEXT,
  target_url TEXT NOT NULL,
  last_error TEXT,
  response_status INTEGER,
  attempt_count INTEGER NOT NULL,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  replayed_at TIMESTAMP WITH TIME ZONE,
  replayed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  replay_delivery_id UUID REFERENCES public.webhook_deliveries(id) ON DELETE SET NULL
);

-- Helpful indexes
CREATE INDEX idx_webhook_subscriptions_active ON public.webhook_subscriptions(active);
CREATE INDEX idx_webhook_subscriptions_event_types ON public.webhook_subscriptions USING GIN(event_types);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_attempt_at ON public.webhook_deliveries(next_attempt_at);
CREATE INDEX idx_webhook_delivery_attempts_delivery_id ON public.webhook_delivery_attempts(delivery_id);
CREATE INDEX idx_webhook_dead_letters_failed_at ON public.webhook_dead_letters(failed_at DESC);

-- Ensure updated_at columns stay fresh
CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_deliveries_updated_at
  BEFORE UPDATE ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_dead_letters ENABLE ROW LEVEL SECURITY;

-- Webhook subscriptions should only be manageable by property staff
CREATE POLICY "Property staff manage webhook subscriptions" ON public.webhook_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Event rows are read-only to property staff for observability
CREATE POLICY "Property staff read webhook events" ON public.webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Delivery queue visibility for property staff
CREATE POLICY "Property staff read webhook deliveries" ON public.webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Delivery attempts audit log visibility
CREATE POLICY "Property staff read webhook attempts" ON public.webhook_delivery_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Dead letter queue viewing and replay controls
CREATE POLICY "Property staff manage webhook dead letters" ON public.webhook_dead_letters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

