create extension if not exists "pgcrypto";

create type public.portal_role as enum (
  'tenant',
  'roommate',
  'property_manager',
  'admin'
);

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.buildings enable row level security;

create table if not exists public.building_memberships (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  role public.portal_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, building_id)
);

alter table public.building_memberships enable row level security;

create index if not exists idx_building_memberships_user on public.building_memberships (user_id);
create index if not exists idx_building_memberships_building on public.building_memberships (building_id);

create view public.user_roles with (security_invoker=true) as
select
  bm.user_id,
  bm.building_id,
  b.slug as building_slug,
  b.name as building_name,
  bm.role,
  bm.created_at
from public.building_memberships bm
  join public.buildings b on b.id = bm.building_id;

create policy "Users can view their buildings" on public.buildings
for select
using (
  exists (
    select 1
    from public.building_memberships bm
    where bm.building_id = buildings.id
      and bm.user_id = auth.uid()
  )
);

create policy "Admins manage assigned buildings" on public.buildings
for all
using (
  exists (
    select 1
    from public.building_memberships bm
    where bm.building_id = buildings.id
      and bm.user_id = auth.uid()
      and bm.role in ('admin', 'property_manager')
  )
)
with check (
  exists (
    select 1
    from public.building_memberships bm
    where bm.building_id = buildings.id
      and bm.user_id = auth.uid()
      and bm.role in ('admin', 'property_manager')
  )
);

create policy "Users can view their memberships" on public.building_memberships
for select
using (auth.uid() = user_id);

create policy "Admins manage memberships" on public.building_memberships
for all
using (
  exists (
    select 1
    from public.building_memberships bm
    where bm.building_id = building_memberships.building_id
      and bm.user_id = auth.uid()
      and bm.role in ('admin', 'property_manager')
  )
)
with check (
  exists (
    select 1
    from public.building_memberships bm
    where bm.building_id = building_memberships.building_id
      and bm.user_id = auth.uid()
      and bm.role in ('admin', 'property_manager')
  )
);

with legacy_building as (
  insert into public.buildings (slug, name)
  values ('legacy-default', 'Legacy Building')
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into public.building_memberships (user_id, building_id, role)
select
  p.id,
  legacy_building.id,
  case lower(coalesce(nullif(p.role, ''), 'tenant'))
    when 'admin' then 'admin'
    when 'property_manager' then 'property_manager'
    when 'manager' then 'property_manager'
    when 'roommate' then 'roommate'
    when 'resident' then 'tenant'
    when 'tenant' then 'tenant'
    else 'tenant'
  end::public.portal_role
from public.profiles p
cross join legacy_building
on conflict (user_id, building_id) do nothing;

alter table public.profiles alter column role drop default;
update public.profiles set role = null where role is not null;
