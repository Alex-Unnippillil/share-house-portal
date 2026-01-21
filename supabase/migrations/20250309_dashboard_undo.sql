create table if not exists public.dashboard_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('admin', 'user')),
  status text not null check (status in ('active', 'resigned')),
  created_at timestamptz not null default now()
);

create table if not exists public.dashboard_todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_by text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.deletion_events (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  record_id text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists deletion_events_entity_idx on public.deletion_events(entity, record_id);
create index if not exists deletion_events_expires_at_idx on public.deletion_events(expires_at);
