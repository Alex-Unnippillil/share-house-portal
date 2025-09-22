create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  household_id uuid not null,
  title text not null,
  description text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  assigned_member_id uuid null references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  reported_by uuid null references public.profiles (id) on delete set null,
  landlord_notified_at timestamp with time zone null
);

create index idx_incidents_household_id on public.incidents (household_id);
create index idx_incidents_status on public.incidents (status);

alter table public.incidents enable row level security;

create table public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  message text not null,
  created_at timestamp with time zone not null default now(),
  author_id uuid null references public.profiles (id) on delete set null,
  status text not null check (status in ('open','in_progress','resolved','closed')),
  severity text not null check (severity in ('low','medium','high','critical'))
);

create index idx_incident_updates_incident_id on public.incident_updates (incident_id);
create index idx_incident_updates_created_at on public.incident_updates (created_at desc);

alter table public.incident_updates enable row level security;

comment on table public.incidents is 'Tracks household maintenance and safety incidents.';
comment on table public.incident_updates is 'Stores message board updates associated with incidents.';

-- Remember to configure appropriate RLS policies for production use.
