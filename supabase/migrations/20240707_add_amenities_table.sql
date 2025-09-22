create table if not exists public.amenities (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  name text not null,
  slug text not null unique,
  description text,
  calcom_event_type_id integer,
  calcom_event_type_slug text,
  metadata jsonb null,
  active boolean not null default true
);

alter table public.amenities enable row level security;

create policy "Authenticated users can view amenities" on public.amenities
  for select
  to authenticated
  using (true);

insert into public.amenities (name, slug, description)
values
  ('Kitchen', 'kitchen', 'Shared kitchen for meal prep and cooking rotations.'),
  ('TV Room', 'tv-room', 'Common television area for shared entertainment.'),
  ('PlayStation Nook', 'playstation-nook', 'Dedicated gaming setup for roommates.'),
  ('Parking Spot', 'parking-spot', 'Shared driveway or garage parking spot.'),
  ('Shared Computer', 'shared-computer', 'Community workstation with desktop access.')
on conflict (slug) do nothing;
