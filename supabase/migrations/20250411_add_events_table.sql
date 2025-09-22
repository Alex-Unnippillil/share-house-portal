CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  household_id uuid NOT NULL,
  member_id uuid NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NULL,
  payload jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE INDEX events_household_id_idx ON public.events (household_id);
CREATE INDEX events_entity_type_idx ON public.events (entity_type);
CREATE INDEX events_created_at_idx ON public.events (created_at DESC);
