create type if not exists public.amenity_booking_status as enum ('pending', 'confirmed', 'cancelled');

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  description text,
  calcom_event_slug text not null unique,
  calcom_event_type_id integer not null unique,
  building_id uuid,
  unit_id uuid
);

create table if not exists public.amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  tenant_id uuid references auth.users(id),
  calcom_booking_id text not null unique,
  calcom_event_type_id integer not null,
  status public.amenity_booking_status not null default 'confirmed',
  start_time timestamptz not null,
  end_time timestamptz not null,
  building_id uuid,
  unit_id uuid,
  notes text
);

create index if not exists idx_amenity_bookings_tenant on public.amenity_bookings (tenant_id);
create index if not exists idx_amenity_bookings_amenity_time on public.amenity_bookings (amenity_id, start_time);

create unique index if not exists amenity_bookings_no_double_book on public.amenity_bookings (amenity_id, start_time, end_time)
  where status in ('pending', 'confirmed');

alter table public.amenities enable row level security;
alter table public.amenity_bookings enable row level security;

create policy if not exists "All authenticated users can view amenities"
  on public.amenities for select
  to authenticated
  using (true);

create policy if not exists "Tenants manage own amenity bookings"
  on public.amenity_bookings
  for select
  to authenticated
  using (tenant_id = auth.uid() or tenant_id is null);

create policy if not exists "Tenants can create amenity bookings"
  on public.amenity_bookings
  for insert
  to authenticated
  with check (tenant_id = auth.uid());

create policy if not exists "Tenants can update own bookings"
  on public.amenity_bookings
  for update
  to authenticated
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

create policy if not exists "Tenants can cancel own bookings"
  on public.amenity_bookings
  for delete
  to authenticated
  using (tenant_id = auth.uid());

insert into public.amenities (name, slug, description, calcom_event_slug, calcom_event_type_id)
values
  ('Kitchen', 'kitchen', 'Book shared kitchen time for meal prep.', 'share-house/kitchen', 1001),
  ('TV Lounge', 'tv-lounge', 'Reserve the TV room for movie nights.', 'share-house/tv-lounge', 1002),
  ('PlayStation Nook', 'playstation', 'Lock in a gaming session on the shared console.', 'share-house/playstation', 1003),
  ('Parking Space', 'parking', 'Secure a parking slot for your vehicle.', 'share-house/parking', 1004),
  ('Shared Computer', 'shared-computer', 'Schedule time on the communal workstation.', 'share-house/shared-computer', 1005)
on conflict (slug) do nothing;
