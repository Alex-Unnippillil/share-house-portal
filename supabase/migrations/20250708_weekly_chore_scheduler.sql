create table if not exists public.chore_assignments (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  week_start date not null,
  chore_name text not null,
  assigned_to uuid not null references public.profiles (id) on delete cascade,
  weight integer not null default 1,
  missed_count integer not null default 0,
  load_before integer not null default 0,
  fairness_score double precision not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  constraint chore_assignments_unique_week_chore unique (week_start, chore_name)
);

create index if not exists idx_chore_assignments_week on public.chore_assignments (week_start);
create index if not exists idx_chore_assignments_assignee on public.chore_assignments (assigned_to);

alter table public.chore_assignments enable row level security;

create policy if not exists "roommates can view their own assignments" on public.chore_assignments
  for select to authenticated
  using (
    assigned_to = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, '') in ('property_manager', 'admin')
    )
  );

create policy if not exists "roommates can update completion of their assignments" on public.chore_assignments
  for update to authenticated
  using (
    assigned_to = auth.uid()
  )
  with check (
    assigned_to = auth.uid()
  );

create table if not exists public.member_vacations (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint member_vacations_valid_range check (starts_on <= ends_on)
);

create index if not exists idx_member_vacations_profile on public.member_vacations (profile_id);
create index if not exists idx_member_vacations_period on public.member_vacations (starts_on, ends_on);

alter table public.member_vacations enable row level security;

create policy if not exists "roommates manage their vacations" on public.member_vacations
  for all to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, '') in ('property_manager', 'admin')
    )
  )
  with check (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, '') in ('property_manager', 'admin')
    )
  );

create or replace function public.publish_chore_rotation(assignments jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_notify('chore_assignments', assignments::text);
end;
$$;

grant execute on function public.publish_chore_rotation(jsonb) to authenticated;

grant execute on function public.publish_chore_rotation(jsonb) to service_role;
