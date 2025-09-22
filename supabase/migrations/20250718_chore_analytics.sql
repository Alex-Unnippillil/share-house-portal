create table public.chore_assignments (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  chore_title text not null,
  due_date date not null,
  completed_at timestamptz null,
  notes text,
  inserted_by uuid not null default auth.uid(),
  constraint chore_assignments_due_date_check check (due_date >= date '2000-01-01')
);

alter table public.chore_assignments
  add constraint chore_assignments_inserted_by_fkey foreign key (inserted_by) references public.profiles(id) on delete cascade;

create index idx_chore_assignments_member on public.chore_assignments(member_id);
create index idx_chore_assignments_due_date on public.chore_assignments(due_date);
create index idx_chore_assignments_completed on public.chore_assignments(completed_at);

create or replace function public.set_chore_assignment_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_chore_assignment_updated_at
before update on public.chore_assignments
for each row
execute function public.set_chore_assignment_updated_at();

alter table public.chore_assignments enable row level security;

create policy "Members can manage their chore assignments"
  on public.chore_assignments
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

create table public.chore_member_streaks (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date,
  total_completed integer not null default 0,
  total_assignments integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.chore_member_streaks enable row level security;

create policy "Members can view their streaks"
  on public.chore_member_streaks
  for select
  using (member_id = auth.uid());

create table public.chore_streak_snapshots (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null,
  current_streak integer not null,
  longest_streak integer not null,
  total_completed integer not null,
  total_assignments integer not null,
  created_at timestamptz not null default now(),
  constraint chore_streak_snapshots_snapshot_unique unique (member_id, snapshot_date)
);

create index idx_chore_streak_snapshots_member_date on public.chore_streak_snapshots(member_id, snapshot_date);

alter table public.chore_streak_snapshots enable row level security;

create policy "Members can view their streak history"
  on public.chore_streak_snapshots
  for select
  using (member_id = auth.uid());

create table public.tenant_notifications (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id bigint references public.chore_assignments(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  metadata jsonb,
  scheduled_for timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index tenant_notifications_assignment_type_idx on public.tenant_notifications (assignment_id, notification_type);

alter table public.tenant_notifications enable row level security;

create policy "Members can view their notifications"
  on public.tenant_notifications
  for select
  using (member_id = auth.uid());

create policy "Members can acknowledge their notifications"
  on public.tenant_notifications
  for update
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

create or replace function public.refresh_chore_member_streaks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  run_at timestamptz := now();
begin
  with assignment_members as (
    select distinct member_id from public.chore_assignments
  ),
  completions as (
    select
      member_id,
      (completed_at at time zone 'utc')::date as completed_date
    from public.chore_assignments
    where completed_at is not null
    group by member_id, (completed_at at time zone 'utc')::date
  ),
  ordered as (
    select
      member_id,
      completed_date,
      row_number() over (partition by member_id order by completed_date) as rn
    from completions
  ),
  grouped as (
    select
      member_id,
      completed_date,
      completed_date - (rn::int * interval '1 day') as grp
    from ordered
  ),
  streaks as (
    select
      member_id,
      max(completed_date) as last_completed_date,
      count(*)::int as streak_length
    from grouped
    group by member_id, grp
  ),
  latest as (
    select
      member_id,
      last_completed_date,
      streak_length,
      row_number() over (partition by member_id order by last_completed_date desc) as rn
    from streaks
  ),
  aggregates as (
    select
      am.member_id,
      coalesce(
        max(
          case
            when l.rn = 1 and l.last_completed_date >= (run_at::date - 1)
            then l.streak_length
            else 0
          end
        ),
        0
      ) as current_streak,
      coalesce(max(s.streak_length), 0) as longest_streak,
      max(case when l.rn = 1 then l.last_completed_date end) as last_completed_date,
      count(ca.*) filter (where ca.completed_at is not null) as total_completed,
      count(ca.*) as total_assignments
    from assignment_members am
    left join latest l on am.member_id = l.member_id
    left join streaks s on am.member_id = s.member_id
    left join public.chore_assignments ca on ca.member_id = am.member_id
    group by am.member_id
  )
  insert into public.chore_member_streaks as cms (
    member_id,
    current_streak,
    longest_streak,
    last_completed_date,
    total_completed,
    total_assignments,
    updated_at
  )
  select
    ag.member_id,
    ag.current_streak,
    ag.longest_streak,
    ag.last_completed_date,
    ag.total_completed,
    ag.total_assignments,
    run_at
  from aggregates ag
  on conflict (member_id) do update
  set
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    last_completed_date = excluded.last_completed_date,
    total_completed = excluded.total_completed,
    total_assignments = excluded.total_assignments,
    updated_at = excluded.updated_at;

  insert into public.chore_streak_snapshots as snap (
    member_id,
    snapshot_date,
    current_streak,
    longest_streak,
    total_completed,
    total_assignments,
    created_at
  )
  select
    ag.member_id,
    run_at::date,
    ag.current_streak,
    ag.longest_streak,
    ag.total_completed,
    ag.total_assignments,
    run_at
  from aggregates ag
  on conflict (member_id, snapshot_date) do update
  set
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    total_completed = excluded.total_completed,
    total_assignments = excluded.total_assignments,
    created_at = excluded.created_at;

  insert into public.tenant_notifications (
    member_id,
    assignment_id,
    notification_type,
    title,
    body,
    metadata,
    scheduled_for,
    created_at
  )
  select
    ca.member_id,
    ca.id,
    'chore_deadline',
    'Upcoming chore deadline',
    format('"%s" is due on %s. Keep your streak alive!', ca.chore_title, to_char(ca.due_date, 'FMMon DD, YYYY')),
    jsonb_build_object(
      'assignment_id', ca.id,
      'chore_title', ca.chore_title,
      'due_date', ca.due_date
    ),
    run_at,
    run_at
  from public.chore_assignments ca
  where ca.completed_at is null
    and ca.due_date = run_at::date + 2
    and not exists (
      select 1
      from public.tenant_notifications tn
      where tn.assignment_id = ca.id
        and tn.notification_type = 'chore_deadline'
    );
end;
$$;

grant execute on function public.refresh_chore_member_streaks() to anon;
grant execute on function public.refresh_chore_member_streaks() to authenticated;
grant execute on function public.refresh_chore_member_streaks() to service_role;

create or replace view public.chore_member_streak_overview as
select
  cms.member_id,
  cms.current_streak,
  cms.longest_streak,
  cms.last_completed_date,
  cms.total_completed,
  cms.total_assignments,
  case
    when cms.total_assignments = 0 then 0::numeric
    else round((cms.total_completed::numeric / cms.total_assignments::numeric) * 100, 2)
  end as completion_percent,
  cms.updated_at
from public.chore_member_streaks cms;
