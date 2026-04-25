BEGIN;

ALTER TABLE public.webhook_events
  DROP CONSTRAINT IF EXISTS webhook_events_provider_check;

ALTER TABLE public.webhook_events
  ADD CONSTRAINT webhook_events_provider_check
  CHECK (provider IN ('stripe', 'calcom', 'documenso'));

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS payload_hash text;

CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_hash
  ON public.webhook_events(provider, payload_hash)
  WHERE payload_hash IS NOT NULL;

COMMIT;
