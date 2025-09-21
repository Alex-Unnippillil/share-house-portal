create extension if not exists "pgcrypto";

create type public.building_role as enum (
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

create table public.building_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  role public.building_role not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, building_id, role)
);

alter table public.building_memberships enable row level security;

create unique index if not exists idx_building_memberships_primary
  on public.building_memberships(user_id)
  where is_primary;

insert into public.buildings (slug, name)
select 'default-building', 'Legacy Default Building'
where not exists (
  select 1 from public.buildings where slug = 'default-building'
);

with default_building as (
  select id from public.buildings where slug = 'default-building' limit 1
)
insert into public.building_memberships (user_id, building_id, role, is_primary)
select
  p.id,
  db.id,
  coalesce(
    case p.role
      when 'admin' then 'admin'
      when 'property_manager' then 'property_manager'
      when 'tenant' then 'tenant'
      when 'roommate' then 'roommate'
      when 'manager' then 'property_manager'
      when 'user' then 'tenant'
      else null
    end,
    'tenant'
  )::public.building_role,
  true
from public.profiles p
cross join default_building db
on conflict (user_id, building_id, role)
  do update set is_primary = true;

drop index if exists idx_profiles_role;
alter table public.profiles drop column if exists role;

create or replace view public.user_roles
with (security_invoker = on)
as
select
  bm.user_id,
  bm.building_id,
  bm.role,
  bm.is_primary,
  bm.created_at
from public.building_memberships bm;

create policy "Members can read their buildings" on public.buildings
  for select using (
    exists (
      select 1
      from public.building_memberships m
      where m.building_id = id
        and m.user_id = auth.uid()
    )
  );

create policy "Managers can manage buildings" on public.buildings
  for all using (
    exists (
      select 1
      from public.building_memberships m
      where m.building_id = id
        and m.user_id = auth.uid()
        and m.role in ('property_manager', 'admin')
    )
  );

create policy "Members can view their memberships" on public.building_memberships
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.building_memberships m
      where m.building_id = building_memberships.building_id
        and m.user_id = auth.uid()
        and m.role in ('property_manager', 'admin')
    )
  );

create policy "Managers can manage memberships" on public.building_memberships
  for insert with check (
    exists (
      select 1
      from public.building_memberships m
      where m.building_id = building_memberships.building_id
        and m.user_id = auth.uid()
        and m.role in ('property_manager', 'admin')
    )
  );

create policy "Managers can update memberships" on public.building_memberships
  for update using (
    exists (
      select 1
      from public.building_memberships m
      where m.building_id = building_memberships.building_id
        and m.user_id = auth.uid()
        and m.role in ('property_manager', 'admin')
    )
  ) with check (
    exists (
      select 1
      from public.building_memberships m
      where m.building_id = building_memberships.building_id
        and m.user_id = auth.uid()
        and m.role in ('property_manager', 'admin')
    )
  );

create policy "Managers can delete memberships" on public.building_memberships
  for delete using (
    exists (
      select 1
      from public.building_memberships m
      where m.building_id = building_memberships.building_id
        and m.user_id = auth.uid()
        and m.role in ('property_manager', 'admin')
    )
  );
