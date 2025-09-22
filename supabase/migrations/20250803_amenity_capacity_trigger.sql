-- Amenity booking capacity enforcement via trigger-based concurrency guard.

create extension if not exists "pgcrypto";

-- Ensure amenities table exists with required columns.
create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text null,
  capacity integer not null check (capacity > 0)
);

alter table public.amenities enable row level security;

-- Ensure amenity_bookings table includes attendee tracking metadata.
create table if not exists public.amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  attendee_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  notes text null,
  constraint amenity_bookings_start_before_end check (start_time < end_time),
  constraint amenity_bookings_attendee_count_positive check (attendee_count > 0)
);

alter table public.amenity_bookings enable row level security;

-- Backfill attendee_count column if table pre-existed without it.
do
$$
begin
  if to_regclass('public.amenity_bookings') is not null then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'amenity_bookings'
        and column_name = 'attendee_count'
    ) then
      alter table public.amenity_bookings
        add column attendee_count integer not null default 1;
    end if;
  end if;
end;
$$;

-- Ensure updated_at column is present for optimistic updates.
do
$$
begin
  if to_regclass('public.amenity_bookings') is not null then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'amenity_bookings'
        and column_name = 'updated_at'
    ) then
      alter table public.amenity_bookings
        add column updated_at timestamptz not null default now();
    end if;
  end if;
end;
$$;

-- Maintain reference to profiles when table exists without the FK.
do
$$
begin
  if to_regclass('public.profiles') is not null
     and to_regclass('public.amenity_bookings') is not null then
    begin
      alter table public.amenity_bookings
        add constraint amenity_bookings_created_by_fkey
        foreign key (created_by)
        references public.profiles(id)
        on delete set null;
    exception
      when duplicate_object then
        null;
    end;
  end if;
end;
$$;

-- Drop legacy exclusion constraints so the trigger can manage capacity.
do
$$
declare
  constraint_record record;
begin
  if to_regclass('public.amenity_bookings') is not null then
    for constraint_record in
      select conname
      from pg_constraint
      where conrelid = 'public.amenity_bookings'::regclass
        and contype = 'x'
    loop
      execute format('alter table public.amenity_bookings drop constraint %I', constraint_record.conname);
    end loop;
  end if;
end;
$$;

create index if not exists amenity_bookings_amenity_time_idx
  on public.amenity_bookings (amenity_id, start_time, end_time);

create or replace function public.amenity_booking_capacity_guard()
returns trigger
language plpgsql
as
$$
declare
  v_capacity integer;
  v_used integer := 0;
  v_remaining integer;
  overlap record;
begin
  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  if NEW.attendee_count is null or NEW.attendee_count <= 0 then
    raise exception using
      errcode = '23514',
      message = 'attendee_count must be a positive integer';
  end if;

  if NEW.start_time >= NEW.end_time then
    raise exception using
      errcode = '22007',
      message = 'start_time must be earlier than end_time';
  end if;

  select capacity
  into v_capacity
  from public.amenities
  where id = NEW.amenity_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = format('Amenity %s does not exist', NEW.amenity_id);
  end if;

  for overlap in
    select attendee_count
    from public.amenity_bookings
    where amenity_id = NEW.amenity_id
      and id is distinct from NEW.id
      and tstzrange(start_time, end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
    for update
  loop
    v_used := v_used + overlap.attendee_count;
  end loop;

  if NEW.attendee_count > v_capacity then
    raise exception using
      errcode = 'P0001',
      message = format('Amenity capacity exceeded. Maximum attendees: %s', v_capacity);
  end if;

  v_remaining := v_capacity - v_used;

  if NEW.attendee_count > v_remaining then
    raise exception using
      errcode = 'P0001',
      message = format('Amenity capacity exceeded. Remaining slots: %s', greatest(v_remaining, 0));
  end if;

  if TG_OP = 'INSERT' then
    NEW.created_at := coalesce(NEW.created_at, now());
  end if;

  NEW.updated_at := now();

  return NEW;
end;
$$;

drop trigger if exists amenity_booking_capacity_guard on public.amenity_bookings;

create trigger amenity_booking_capacity_guard
before insert or update on public.amenity_bookings
for each row
execute function public.amenity_booking_capacity_guard();
