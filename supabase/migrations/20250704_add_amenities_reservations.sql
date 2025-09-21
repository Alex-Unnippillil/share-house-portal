-- Amenity reservation tables for Cal.com integration
set check_function_bodies = off;

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  cal_event_type text not null,
  approval_required boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.amenity_reservations (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cal_booking_id text not null unique,
  cal_booking_url text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.overnight_visits (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references auth.users(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  notes text,
  approval_notes text,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  decided_at timestamptz
);

insert into public.amenities (slug, name, description, cal_event_type, approval_required)
values
  ('kitchen', 'Kitchen', 'Reserve the shared kitchen for meal prep or events.', 'share-house/kitchen', false),
  ('tv-lounge', 'TV Lounge', 'Book the living room TV for movie nights or sports.', 'share-house/tv-lounge', false),
  ('playstation', 'PlayStation', 'Schedule PlayStation time to avoid conflicts.', 'share-house/playstation', false),
  ('parking', 'Parking Spot', 'Reserve the driveway/parking spot for guests or deliveries.', 'share-house/parking', false),
  ('shared-computer', 'Shared Computer', 'Block time on the communal workstation.', 'share-house/shared-computer', false),
  ('overnight-visitor', 'Overnight Visitor', 'Request approval for overnight guests.', 'share-house/overnight-visitor', true)
on conflict (slug)
  do update set
    name = excluded.name,
    description = excluded.description,
    cal_event_type = excluded.cal_event_type,
    approval_required = excluded.approval_required;

create index if not exists amenity_reservations_amenity_time_idx on public.amenity_reservations (amenity_id, start_time, end_time);
create index if not exists amenity_reservations_user_idx on public.amenity_reservations (user_id, created_at desc);
create index if not exists amenity_reservations_status_idx on public.amenity_reservations (status);
create index if not exists overnight_visits_resident_idx on public.overnight_visits (resident_id, start_date, end_date);
create index if not exists overnight_visits_status_idx on public.overnight_visits (status);

alter table public.amenities enable row level security;
alter table public.amenity_reservations enable row level security;
alter table public.overnight_visits enable row level security;

create policy if not exists "Authenticated users can read amenities"
  on public.amenities for select
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy if not exists "Service role manages amenities"
  on public.amenities for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Users can insert own reservations"
  on public.amenity_reservations for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can view own reservations"
  on public.amenity_reservations for select
  using (auth.uid() = user_id);

create policy if not exists "Users can update own reservations"
  on public.amenity_reservations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Service role manages reservations"
  on public.amenity_reservations for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Residents manage their overnight requests"
  on public.overnight_visits for insert
  with check (auth.uid() = resident_id);

create policy if not exists "Residents can view their overnight requests"
  on public.overnight_visits for select
  using (auth.uid() = resident_id);

create policy if not exists "Residents can update their pending overnight requests"
  on public.overnight_visits for update
  using (auth.uid() = resident_id and status = 'pending')
  with check (auth.uid() = resident_id);

create policy if not exists "Service role manages overnight visits"
  on public.overnight_visits for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
