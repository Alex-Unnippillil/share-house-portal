CREATE TABLE IF NOT EXISTS public.garbage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  address text NOT NULL,
  address_normalized text NOT NULL,
  event_date date NOT NULL,
  summary text NOT NULL,
  description text NULL,
  materials text[] NOT NULL DEFAULT '{}'::text[],
  source_url text NOT NULL,
  ics_uid text NULL,
  ics_dtstart_raw text NOT NULL,
  ics_tzid text NULL,
  all_day boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.garbage_events IS 'Normalized waste collection pickups sourced from the City of Toronto ICS feed.';

CREATE UNIQUE INDEX IF NOT EXISTS garbage_events_address_date_summary_idx
  ON public.garbage_events (address_normalized, event_date, summary);

CREATE INDEX IF NOT EXISTS garbage_events_address_date_lookup_idx
  ON public.garbage_events (address_normalized, event_date);

CREATE INDEX IF NOT EXISTS garbage_events_uid_idx
  ON public.garbage_events (ics_uid)
  WHERE ics_uid IS NOT NULL;
