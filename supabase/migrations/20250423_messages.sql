-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Drop the legacy chat table when present.
drop table if exists public.chat cascade;

drop type if exists public.moderation_action cascade;

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.buildings enable row level security;

create table public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.units enable row level security;

create table public.tenant_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  role text not null check (role in ('tenant','roommate','property_manager','admin')),
  created_at timestamptz not null default now()
);

create unique index tenant_assignments_unit_unique
  on public.tenant_assignments(profile_id, unit_id, role)
  where unit_id is not null;

create unique index tenant_assignments_building_unique
  on public.tenant_assignments(profile_id, building_id, role)
  where unit_id is null;

alter table public.tenant_assignments enable row level security;

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  metadata jsonb not null default '{}'::jsonb,
  pinned_message_id uuid,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.threads enable row level security;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  parent_message_id uuid references public.messages(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  body text,
  message_type text not null default 'text',
  metadata jsonb not null default '{}'::jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (message_id, profile_id, reaction_type)
);

alter table public.message_reactions enable row level security;

create type public.moderation_action as enum (
  'pin',
  'unpin',
  'delete',
  'restore',
  'flag',
  'resolve_flag'
);

create table public.message_moderation (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id) on delete cascade,
  action public.moderation_action not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.message_moderation enable row level security;

-- Helper view for policy reuse
create view public.v_tenant_scoped_roles as
select
  ta.profile_id,
  ta.role,
  ta.building_id,
  ta.unit_id
from public.tenant_assignments ta;

-- Building visibility
create policy "Managers see building" on public.buildings
  for select using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = buildings.id
    )
  );

create policy "Managers insert building" on public.buildings
  for insert with check (false);

create policy "Managers update building" on public.buildings
  for update using (false) with check (false);

create policy "Managers delete building" on public.buildings
  for delete using (false);

-- Units inherit building access
create policy "Members read units" on public.units
  for select using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = units.building_id
    )
  );

create policy "Members insert units" on public.units
  for insert with check (false);

create policy "Members update units" on public.units
  for update using (false) with check (false);

create policy "Members delete units" on public.units
  for delete using (false);

-- Tenant assignments are only visible to authenticated members of a building
create policy "Assignments readable by members" on public.tenant_assignments
  for select using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = tenant_assignments.building_id
        and (r.unit_id = tenant_assignments.unit_id or r.role in ('property_manager','admin'))
    )
  );

create policy "Assignments managed by admins" on public.tenant_assignments
  for insert with check (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = tenant_assignments.building_id
        and r.role in ('property_manager','admin')
    )
  );

create policy "Assignments update by admins" on public.tenant_assignments
  for update using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = tenant_assignments.building_id
        and r.role in ('property_manager','admin')
    )
  ) with check (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = tenant_assignments.building_id
        and r.role in ('property_manager','admin')
    )
  );

create policy "Assignments delete by admins" on public.tenant_assignments
  for delete using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = tenant_assignments.building_id
        and r.role in ('property_manager','admin')
    )
  );

-- Thread policies
create policy "Members read threads" on public.threads
  for select using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = threads.building_id
        and (
          threads.unit_id is null
          or r.unit_id = threads.unit_id
          or r.role in ('property_manager','admin')
        )
    )
  );

create policy "Members create threads" on public.threads
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = threads.building_id
        and (
          threads.unit_id is null
          or r.unit_id = threads.unit_id
          or r.role in ('property_manager','admin')
        )
    )
  );

create policy "Members update threads" on public.threads
  for update using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = threads.building_id
        and r.role in ('property_manager','admin')
    )
  ) with check (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = threads.building_id
        and r.role in ('property_manager','admin')
    )
  );

create policy "Members delete threads" on public.threads
  for delete using (
    exists (
      select 1
      from public.v_tenant_scoped_roles r
      where r.profile_id = auth.uid()
        and r.building_id = threads.building_id
        and r.role in ('property_manager','admin')
    )
  );

-- Message policies
create policy "Members read messages" on public.messages
  for select using (
    exists (
      select 1
      from public.threads t
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where t.id = messages.thread_id
        and r.profile_id = auth.uid()
        and (
          t.unit_id is null
          or r.unit_id = t.unit_id
          or r.role in ('property_manager','admin')
        )
    )
  );

create policy "Members create messages" on public.messages
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.threads t
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where t.id = messages.thread_id
        and r.profile_id = auth.uid()
        and (
          t.unit_id is null
          or r.unit_id = t.unit_id
          or r.role in ('property_manager','admin')
        )
    )
  );

create policy "Members update own messages" on public.messages
  for update using (
    created_by = auth.uid()
  ) with check (
    created_by = auth.uid()
  );

create policy "Managers moderate messages" on public.messages
  for update using (
    exists (
      select 1
      from public.threads t
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where t.id = messages.thread_id
        and r.profile_id = auth.uid()
        and r.role in ('property_manager','admin')
    )
  ) with check (
    exists (
      select 1
      from public.threads t
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where t.id = messages.thread_id
        and r.profile_id = auth.uid()
        and r.role in ('property_manager','admin')
    )
  );

create policy "Managers delete messages" on public.messages
  for delete using (
    exists (
      select 1
      from public.threads t
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where t.id = messages.thread_id
        and r.profile_id = auth.uid()
        and r.role in ('property_manager','admin')
    )
  );

-- Reaction policies
create policy "Members read reactions" on public.message_reactions
  for select using (
    exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where m.id = message_reactions.message_id
        and r.profile_id = auth.uid()
        and (
          t.unit_id is null
          or r.unit_id = t.unit_id
          or r.role in ('property_manager','admin')
        )
    )
  );

create policy "Members create reactions" on public.message_reactions
  for insert with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where m.id = message_reactions.message_id
        and r.profile_id = auth.uid()
        and (
          t.unit_id is null
          or r.unit_id = t.unit_id
          or r.role in ('property_manager','admin')
        )
    )
  );

create policy "Members delete own reactions" on public.message_reactions
  for delete using (
    profile_id = auth.uid()
  );

create policy "Managers delete reactions" on public.message_reactions
  for delete using (
    exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where m.id = message_reactions.message_id
        and r.profile_id = auth.uid()
        and r.role in ('property_manager','admin')
    )
  );

-- Moderation audit policies
create policy "Members read moderation" on public.message_moderation
  for select using (
    exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where m.id = message_moderation.message_id
        and r.profile_id = auth.uid()
        and (
          t.unit_id is null
          or r.unit_id = t.unit_id
          or r.role in ('property_manager','admin')
        )
    )
  );

create policy "Managers write moderation" on public.message_moderation
  for insert with check (
    moderator_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where m.id = message_moderation.message_id
        and r.profile_id = auth.uid()
        and r.role in ('property_manager','admin')
    )
  );

create policy "Managers delete moderation" on public.message_moderation
  for delete using (
    exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.v_tenant_scoped_roles r on r.building_id = t.building_id
      where m.id = message_moderation.message_id
        and r.profile_id = auth.uid()
        and r.role in ('property_manager','admin')
    )
  );
