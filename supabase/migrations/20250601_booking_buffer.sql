create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

create table if not exists public.amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  amenity_slug text not null,
  tenant_id uuid not null default auth.uid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  slot tsrange not null,
  buffer_minutes integer not null default 0,
  note text null,
  constraint amenity_bookings_start_before_end check (starts_at < ends_at),
  constraint amenity_bookings_buffer_positive check (buffer_minutes >= 0)
);

alter table public.amenity_bookings
  add constraint amenity_bookings_tenant_id_fkey foreign key (tenant_id) references auth.users (id) on delete cascade;

create index if not exists amenity_bookings_amenity_idx on public.amenity_bookings (amenity_slug);
create index if not exists amenity_bookings_slot_idx on public.amenity_bookings using gist (amenity_slug, slot);

alter table public.amenity_bookings enable row level security;

create policy "Users can view their amenity bookings" on public.amenity_bookings
  for select
  using (auth.uid() = tenant_id);

create policy "Users can insert their amenity bookings" on public.amenity_bookings
  for insert
  with check (auth.uid() = tenant_id);

create policy "Users can update their amenity bookings" on public.amenity_bookings
  for update
  using (auth.uid() = tenant_id)
  with check (auth.uid() = tenant_id);

create policy "Users can delete their amenity bookings" on public.amenity_bookings
  for delete
  using (auth.uid() = tenant_id);
