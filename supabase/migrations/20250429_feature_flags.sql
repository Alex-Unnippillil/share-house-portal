create table if not exists public.features (
  household_id uuid not null references public.households (id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  constraint features_pkey primary key (household_id, key)
);

create index if not exists features_key_idx on public.features using btree (key);
create index if not exists features_enabled_idx on public.features using btree (household_id, enabled);

alter table public.features enable row level security;
