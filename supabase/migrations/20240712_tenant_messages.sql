create extension if not exists "pgcrypto";

-- Replace legacy chat table with scoped tenant messaging primitives
drop table if exists public.chat cascade;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_line text,
  city text,
  state text,
  postal_code text,
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  label text not null,
  bedrooms integer,
  bathrooms integer,
  square_feet integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_units_property_label_key unique (property_id, lower(label))
);

create table public.tenant_property_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  role text not null default 'tenant',
  created_at timestamptz not null default now(),
  constraint tenant_property_memberships_profile_property_unit_key unique (profile_id, property_id, unit_id)
);

create table public.tenant_messages (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_pinned boolean not null default false,
  pinned_at timestamptz,
  pinned_by uuid references public.profiles(id) on delete set null,
  is_removed boolean not null default false,
  removed_at timestamptz,
  removed_by uuid references public.profiles(id) on delete set null
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_properties_updated_at on public.properties;
create trigger set_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

drop trigger if exists set_property_units_updated_at on public.property_units;
create trigger set_property_units_updated_at
before update on public.property_units
for each row execute function public.set_updated_at();

drop trigger if exists set_tenant_messages_updated_at on public.tenant_messages;
create trigger set_tenant_messages_updated_at
before update on public.tenant_messages
for each row execute function public.set_updated_at();

create index if not exists idx_property_units_property on public.property_units(property_id);
create index if not exists idx_tenant_memberships_profile on public.tenant_property_memberships(profile_id);
create index if not exists idx_tenant_memberships_property on public.tenant_property_memberships(property_id);
create index if not exists idx_tenant_messages_property on public.tenant_messages(property_id, unit_id, created_at desc);
create index if not exists idx_tenant_messages_author on public.tenant_messages(author_id);

alter table public.properties enable row level security;
alter table public.property_units enable row level security;
alter table public.tenant_property_memberships enable row level security;
alter table public.tenant_messages enable row level security;

-- helper predicate for staff checks
create or replace view public.staff_profiles as
select id
from public.profiles
where lower(coalesce(role, '')) in ('staff', 'admin', 'manager', 'property_manager');

drop policy if exists "Members can view their memberships" on public.tenant_property_memberships;
create policy "Members can view their memberships"
  on public.tenant_property_memberships
  for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.staff_profiles sp where sp.id = auth.uid()
    )
  );

drop policy if exists "Staff manage memberships" on public.tenant_property_memberships;
create policy "Staff manage memberships"
  on public.tenant_property_memberships
  for all
  using (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  )
  with check (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  );

drop policy if exists "Tenants can view their properties" on public.properties;
create policy "Tenants can view their properties"
  on public.properties
  for select
  using (
    exists (
      select 1
      from public.tenant_property_memberships m
      where m.property_id = public.properties.id
        and (
          m.profile_id = auth.uid()
          or exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
        )
    )
  );

drop policy if exists "Staff manage properties" on public.properties;
create policy "Staff manage properties"
  on public.properties
  for all
  using (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  )
  with check (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  );

drop policy if exists "Tenants can view their units" on public.property_units;
create policy "Tenants can view their units"
  on public.property_units
  for select
  using (
    exists (
      select 1
      from public.tenant_property_memberships m
      where m.property_id = public.property_units.property_id
        and (
          m.profile_id = auth.uid()
          or exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
        )
    )
  );

drop policy if exists "Staff manage units" on public.property_units;
create policy "Staff manage units"
  on public.property_units
  for all
  using (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  )
  with check (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  );

drop policy if exists "Tenants can read thread messages" on public.tenant_messages;
create policy "Tenants can read thread messages"
  on public.tenant_messages
  for select
  using (
    exists (
      select 1
      from public.tenant_property_memberships m
      where m.profile_id = auth.uid()
        and m.property_id = public.tenant_messages.property_id
        and (
          public.tenant_messages.unit_id is null
          or m.unit_id is null
          or m.unit_id = public.tenant_messages.unit_id
        )
    )
    or exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  );

drop policy if exists "Tenants can post to their threads" on public.tenant_messages;
create policy "Tenants can post to their threads"
  on public.tenant_messages
  for insert
  with check (
    (
      exists (
        select 1
        from public.tenant_property_memberships m
        where m.profile_id = auth.uid()
          and m.property_id = public.tenant_messages.property_id
          and (
            public.tenant_messages.unit_id is null
            or m.unit_id is null
            or m.unit_id = public.tenant_messages.unit_id
          )
      )
      and auth.uid() = public.tenant_messages.author_id
    )
    or exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  );

drop policy if exists "Authors can edit their messages" on public.tenant_messages;
create policy "Authors can edit their messages"
  on public.tenant_messages
  for update
  using (auth.uid() = public.tenant_messages.author_id)
  with check (
    exists (
      select 1
      from public.tenant_property_memberships m
      where m.profile_id = auth.uid()
        and m.property_id = public.tenant_messages.property_id
        and (
          public.tenant_messages.unit_id is null
          or m.unit_id is null
          or m.unit_id = public.tenant_messages.unit_id
        )
    )
  );

drop policy if exists "Staff can moderate tenant messages" on public.tenant_messages;
create policy "Staff can moderate tenant messages"
  on public.tenant_messages
  for all
  using (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  )
  with check (
    exists (select 1 from public.staff_profiles sp where sp.id = auth.uid())
  );
