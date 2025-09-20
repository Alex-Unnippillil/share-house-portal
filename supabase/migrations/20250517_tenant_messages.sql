-- Replace legacy chat table with tenant message board schema
set check_function_bodies = off;

create extension if not exists "pgcrypto" with schema public;

drop table if exists public.chat cascade;

create table public.properties (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    name text not null,
    address text null,
    metadata jsonb not null default '{}'::jsonb
);

create table public.property_units (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    property_id uuid not null references public.properties(id) on delete cascade,
    label text not null,
    metadata jsonb not null default '{}'::jsonb
);

create table public.tenant_property_memberships (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    property_id uuid not null references public.properties(id) on delete cascade,
    unit_id uuid null references public.property_units(id) on delete set null,
    role text not null default 'tenant',
    constraint tenant_property_memberships_role_check check (
        role in ('tenant', 'staff', 'manager', 'admin')
    )
);

create table public.tenant_messages (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    property_id uuid not null references public.properties(id) on delete cascade,
    unit_id uuid null references public.property_units(id) on delete set null,
    author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
    body text not null,
    attachments jsonb not null default '[]'::jsonb,
    pinned boolean not null default false,
    pinned_at timestamptz null,
    pinned_by uuid null references public.profiles(id) on delete set null,
    removed boolean not null default false,
    removed_at timestamptz null,
    removed_by uuid null references public.profiles(id) on delete set null,
    moderation_note text null,
    updated_by uuid null references public.profiles(id) on delete set null
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger properties_set_updated_at
before update on public.properties
for each row execute procedure public.set_updated_at();

create trigger property_units_set_updated_at
before update on public.property_units
for each row execute procedure public.set_updated_at();

create trigger tenant_messages_set_updated_at
before update on public.tenant_messages
for each row execute procedure public.set_updated_at();

create index tenant_messages_property_created_idx
    on public.tenant_messages (property_id, created_at desc);

create index tenant_messages_unit_created_idx
    on public.tenant_messages (unit_id, created_at desc);

create index tenant_messages_pinned_idx
    on public.tenant_messages (pinned) where pinned is true;

alter table public.properties enable row level security;
alter table public.property_units enable row level security;
alter table public.tenant_property_memberships enable row level security;
alter table public.tenant_messages enable row level security;

create policy "Members can read their properties" on public.properties
for select using (
    exists (
        select 1
        from public.tenant_property_memberships tpm
        where tpm.profile_id = auth.uid()
          and tpm.property_id = properties.id
    )
    or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
);

create policy "Staff can manage properties" on public.properties
for all using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
) with check (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
);

create policy "Members can read their units" on public.property_units
for select using (
    exists (
        select 1
        from public.tenant_property_memberships tpm
        where tpm.profile_id = auth.uid()
          and tpm.property_id = property_units.property_id
    )
    or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
);

create policy "Staff can manage units" on public.property_units
for all using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
) with check (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
);

create policy "Members can read their memberships" on public.tenant_property_memberships
for select using (profile_id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
));

create policy "Staff can manage memberships" on public.tenant_property_memberships
for all using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
) with check (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
);

create policy "Tenants can read property messages" on public.tenant_messages
for select using (
    (
        exists (
            select 1
            from public.tenant_property_memberships tpm
            where tpm.profile_id = auth.uid()
              and tpm.property_id = tenant_messages.property_id
              and (tpm.unit_id is null or tenant_messages.unit_id is null or tpm.unit_id = tenant_messages.unit_id)
        )
        and not tenant_messages.removed
    )
    or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
);

create policy "Tenants can insert property messages" on public.tenant_messages
for insert with check (
    auth.uid() = author_id and (
        exists (
            select 1
            from public.tenant_property_memberships tpm
            where tpm.profile_id = auth.uid()
              and tpm.property_id = tenant_messages.property_id
              and (tpm.unit_id is null or tenant_messages.unit_id is null or tpm.unit_id = tenant_messages.unit_id)
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
        )
    )
);

create policy "Authors can update their messages" on public.tenant_messages
for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "Staff can moderate tenant messages" on public.tenant_messages
for update using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
) with check (true);

create policy "Staff can delete tenant messages" on public.tenant_messages
for delete using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'staff', 'manager')
    )
);
