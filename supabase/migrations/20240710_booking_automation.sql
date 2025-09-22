create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid,
  amenity_name text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  member_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  member_name text,
  status text not null default 'confirmed',
  reminder_sent_at timestamptz,
  check_in_at timestamptz,
  cancelled_at timestamptz,
  no_show_processed_at timestamptz,
  waitlist_notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bookings_end_after_start check (end_time > start_time),
  constraint bookings_status_check check (status in ('confirmed', 'checked_in', 'cancelled', 'no_show_cancelled'))
);

create index if not exists bookings_start_time_idx on public.bookings (start_time);
create index if not exists bookings_status_idx on public.bookings (status);

alter table public.bookings enable row level security;

create table if not exists public.booking_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  member_name text,
  position integer not null,
  notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint booking_waitlist_entries_position_check check (position > 0)
);

create unique index if not exists booking_waitlist_entries_unique on public.booking_waitlist_entries (booking_id, member_id);
create index if not exists booking_waitlist_entries_position_idx on public.booking_waitlist_entries (booking_id, position);

alter table public.booking_waitlist_entries enable row level security;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  event_type text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  member_id uuid references auth.users(id) on delete set null,
  metadata jsonb
);

create index if not exists events_event_type_idx on public.events (event_type);
create index if not exists events_booking_id_idx on public.events (booking_id);

alter table public.events enable row level security;
