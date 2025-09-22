-- Persist Stripe webhook delivery attempts and outcomes
CREATE TABLE public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  stripe_created_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  payload JSONB NOT NULL,
  alert_count INTEGER NOT NULL DEFAULT 0,
  last_alert_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stripe_webhook_events_status ON public.stripe_webhook_events(status);
CREATE INDEX idx_stripe_webhook_events_event_id ON public.stripe_webhook_events(event_id);
CREATE INDEX idx_stripe_webhook_events_created_at ON public.stripe_webhook_events(created_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_stripe_webhook_events_updated_at
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
