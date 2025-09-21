create extension if not exists "pgcrypto" with schema public;
create extension if not exists "btree_gist" with schema public;

drop table if exists public.meetings cascade;

create or replace function public.set_updated_at()
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
  slug text not null unique,
  description text,
  building_id uuid,
  unit_id uuid,
  calcom_event_type_id text not null,
  calcom_host text not null,
  calcom_event_slug text not null
);

alter table public.amenities enable row level security;

create policy "Amenities are viewable by authenticated users" on public.amenities
for select using (auth.role() = 'authenticated');

create trigger set_amenities_updated_at
before update on public.amenities
for each row
execute function public.set_updated_at();

create table public.amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  user_id uuid references auth.users(id),
  calcom_event_id text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'pending',
  building_id uuid,
  unit_id uuid,
  constraint amenity_bookings_status_check check (status in ('pending','confirmed','cancelled','conflict')),
  constraint amenity_bookings_calcom_event_id_key unique (calcom_event_id)
);

alter table public.amenity_bookings enable row level security;

create policy "Users view their amenity bookings" on public.amenity_bookings
for select using (auth.uid() = user_id);

create policy "Users insert their amenity bookings" on public.amenity_bookings
for insert with check (auth.uid() = user_id);

create policy "Users update their amenity bookings" on public.amenity_bookings
for update using (auth.uid() = user_id);

create index amenity_bookings_amenity_time_idx on public.amenity_bookings (amenity_id, start_time);

alter table public.amenity_bookings
  add constraint amenity_bookings_no_overlap
  exclude using gist (
    amenity_id with =,
    tstzrange(start_time, end_time) with &&
  )
  where (status in ('pending','confirmed'));

create trigger set_amenity_bookings_updated_at
before update on public.amenity_bookings
for each row
execute function public.set_updated_at();

insert into public.amenities (name, slug, description, calcom_event_type_id, calcom_host, calcom_event_slug)
values
  ('Kitchen', 'kitchen', 'Reserve shared kitchen time for meal prep and group dinners.', 'kitchen', 'share-house', 'kitchen'),
  ('TV Lounge', 'tv-lounge', 'Schedule movie nights or big games in the shared TV room.', 'tv-lounge', 'share-house', 'tv-lounge'),
  ('PlayStation Nook', 'playstation', 'Book the PlayStation station for gaming sessions.', 'playstation', 'share-house', 'playstation'),
  ('Parking Spot', 'parking', 'Reserve parking for your vehicle or guests.', 'parking', 'share-house', 'parking'),
  ('Shared Computer', 'shared-computer', 'Lock in time with the shared workstation.', 'shared-computer', 'share-house', 'shared-computer')
on conflict (slug) do nothing;
