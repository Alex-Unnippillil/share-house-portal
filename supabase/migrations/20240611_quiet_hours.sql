-- Quiet hours and visitor request infrastructure
create extension if not exists "pgcrypto";

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.profiles(id)
);

alter table public.households enable row level security;

alter table public.profiles
  add column if not exists household_id uuid references public.households(id);

create table if not exists public.household_settings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  quiet_hours_start time without time zone not null,
  quiet_hours_end time without time zone not null,
  timezone text not null default 'UTC',
  policy_message text not null default 'Quiet hours are in effect. Please plan visitor arrivals and departures outside this window.',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint household_settings_household_unique unique (household_id),
  constraint household_settings_quiet_hours_valid check (quiet_hours_start <> quiet_hours_end)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_household_settings_updated_at
before update on public.household_settings
for each row execute procedure public.set_updated_at();

create table if not exists public.visitor_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  visitor_name text not null,
  arrival_at timestamp with time zone not null,
  departure_at timestamp with time zone not null,
  reason text null,
  status text not null default 'pending',
  created_at timestamp with time zone not null default now(),
  constraint visitor_requests_chronology check (arrival_at < departure_at)
);

alter table public.household_settings enable row level security;
alter table public.visitor_requests enable row level security;

create or replace function public.create_default_household_settings()
returns trigger as $$
begin
  insert into public.household_settings (household_id, quiet_hours_start, quiet_hours_end, timezone, policy_message)
  values (new.id, time '22:00', time '07:00', 'UTC', 'Quiet hours are 10:00 PM – 7:00 AM. Please schedule visitor arrivals and departures outside this window.')
  on conflict (household_id) do nothing;
  return new;
end;
$$ language plpgsql;

create trigger create_household_settings_after_insert
after insert on public.households
for each row execute procedure public.create_default_household_settings();

create policy "Residents can create households" on public.households
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "Residents can view their household" on public.households
  for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = households.id
    )
    or created_by = auth.uid()
  );

create policy "Residents can update their household" on public.households
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Residents can read settings" on public.household_settings
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = household_settings.household_id
    )
  );

create policy "Residents manage settings" on public.household_settings
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = household_settings.household_id
    )
  );

create policy "Residents update settings" on public.household_settings
  for update to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = household_settings.household_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = household_settings.household_id
    )
  );

create policy "Residents view visitor requests" on public.visitor_requests
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = visitor_requests.household_id
    )
  );

create policy "Residents create visitor requests" on public.visitor_requests
  for insert to authenticated
  with check (
    host_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = visitor_requests.household_id
    )
  );

create policy "Residents manage their visitor requests" on public.visitor_requests
  for update to authenticated
  using (host_profile_id = auth.uid());
