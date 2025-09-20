-- Amenity catalog and reservation tables
set check_function_bodies = off;

create extension if not exists btree_gist with schema public;
create extension if not exists pgcrypto;

create type public.amenity_reservation_status as enum (
  'pending',
  'approved',
  'denied',
  'cancelled'
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  rules text,
  is_active boolean not null default true,
  constraint amenities_name_key unique (name)
);

create table public.amenity_reservations (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  lease_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.amenity_reservation_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  time_range tstzrange generated always as (tstzrange(start_at, end_at, '[)')) stored,
  constraint amenity_reservations_start_before_end check (start_at < end_at)
);

create index amenities_active_idx on public.amenities using btree (is_active) where is_active;
create index amenity_reservations_amenity_idx on public.amenity_reservations using btree (amenity_id);
create index amenity_reservations_lease_idx on public.amenity_reservations using btree (lease_id);
create index amenity_reservations_status_idx on public.amenity_reservations using btree (status);

alter table public.amenities enable row level security;
alter table public.amenity_reservations enable row level security;

create trigger handle_updated_at_amenities
before update on public.amenities
for each row execute function public.set_current_timestamp_updated_at();

create trigger handle_updated_at_amenity_reservations
before update on public.amenity_reservations
for each row execute function public.set_current_timestamp_updated_at();

alter table public.amenity_reservations
  add constraint amenity_reservations_no_overlap
  exclude using gist (
    amenity_id with =,
    time_range with &&
  ) where (status in ('pending', 'approved'));

create policy "Authenticated users can view amenities"
  on public.amenities
  for select
  to authenticated
  using (is_active);

create policy "Staff can manage amenities"
  on public.amenities
  for all
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  ));

create policy "Tenants can view their amenity reservations"
  on public.amenity_reservations
  for select
  to authenticated
  using (
    lease_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'staff')
    )
  );

create policy "Tenants can manage their amenity reservations"
  on public.amenity_reservations
  for insert
  to authenticated
  with check (lease_id = auth.uid());

create policy "Tenants can update their amenity reservations"
  on public.amenity_reservations
  for update
  to authenticated
  using (lease_id = auth.uid())
  with check (lease_id = auth.uid());

create policy "Tenants can cancel their amenity reservations"
  on public.amenity_reservations
  for delete
  to authenticated
  using (lease_id = auth.uid());

create policy "Staff can manage all amenity reservations"
  on public.amenity_reservations
  for all
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  ));

comment on table public.amenities is 'Catalog of reservable community amenities available to tenants.';
comment on table public.amenity_reservations is 'Tenant amenity reservations linked to a lease/user account.';
