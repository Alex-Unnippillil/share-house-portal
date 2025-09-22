create extension if not exists "pgcrypto";

create type if not exists public.chore_assignment_status as enum (
  'pending',
  'completed',
  'approved',
  'rejected'
);

create table if not exists public.chore_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tenant_id uuid not null,
  chore_title text not null,
  description text,
  due_date timestamptz,
  status public.chore_assignment_status not null default 'pending',
  proof_url text,
  completed_at timestamptz,
  point_awarded boolean not null default false,
  points integer not null default 0,
  assigned_by uuid,
  constraint chore_assignments_tenant_id_fkey foreign key (tenant_id) references public.profiles (id) on delete cascade,
  constraint chore_assignments_assigned_by_fkey foreign key (assigned_by) references public.profiles (id) on delete set null
);

alter table if exists public.chore_assignments
  add column if not exists status public.chore_assignment_status not null default 'pending';

alter table if exists public.chore_assignments
  alter column status set default 'pending';

update public.chore_assignments
set status = 'pending'
where status is null;

alter table if exists public.chore_assignments
  add column if not exists proof_url text;

alter table if exists public.chore_assignments
  add column if not exists completed_at timestamptz;

alter table if exists public.chore_assignments
  add column if not exists point_awarded boolean not null default false;

alter table if exists public.chore_assignments
  alter column point_awarded set default false;

alter table if exists public.chore_assignments
  add column if not exists points integer not null default 0;

alter table if exists public.chore_assignments
  add column if not exists description text;

alter table if exists public.chore_assignments
  add column if not exists due_date timestamptz;

alter table if exists public.chore_assignments
  add column if not exists assigned_by uuid;

alter table if exists public.chore_assignments
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.chore_assignments
  alter column created_at set default now();

alter table if exists public.chore_assignments
  add column if not exists chore_title text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chore_assignments_tenant_id_fkey'
  ) then
    alter table public.chore_assignments
      add constraint chore_assignments_tenant_id_fkey foreign key (tenant_id)
      references public.profiles (id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chore_assignments_assigned_by_fkey'
  ) then
    alter table public.chore_assignments
      add constraint chore_assignments_assigned_by_fkey foreign key (assigned_by)
      references public.profiles (id)
      on delete set null;
  end if;
end $$;

alter table if exists public.chore_assignments enable row level security;

drop policy if exists "Chore assignments tenants select" on public.chore_assignments;
create policy "Chore assignments tenants select"
  on public.chore_assignments
  for select
  using (auth.uid() = tenant_id or auth.uid() = assigned_by);

drop policy if exists "Chore assignments tenants update" on public.chore_assignments;
create policy "Chore assignments tenants update"
  on public.chore_assignments
  for update
  using (auth.uid() = tenant_id or auth.uid() = assigned_by)
  with check (auth.uid() = tenant_id or auth.uid() = assigned_by);

drop policy if exists "Chore assignments tenants insert" on public.chore_assignments;
create policy "Chore assignments tenants insert"
  on public.chore_assignments
  for insert
  with check (auth.uid() = tenant_id or auth.uid() = assigned_by);
