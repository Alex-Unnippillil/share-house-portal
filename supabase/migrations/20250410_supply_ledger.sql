create type if not exists public.supply_split_mode as enum ('even', 'weighted');

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_split public.supply_split_mode not null default 'even',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  weighting_factor numeric(10, 2) not null default 1,
  role text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (household_id, profile_id)
);

create index if not exists household_memberships_household_id_idx
  on public.household_memberships (household_id);

create index if not exists household_memberships_profile_id_idx
  on public.household_memberships (profile_id);

create table if not exists public.supply_purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  purchaser_id uuid not null references public.profiles(id) on delete restrict,
  description text not null,
  total_cost numeric(12, 2) not null,
  purchased_at timestamptz not null default timezone('utc', now()),
  default_split public.supply_split_mode not null default 'even',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists supply_purchases_household_id_idx
  on public.supply_purchases (household_id);
