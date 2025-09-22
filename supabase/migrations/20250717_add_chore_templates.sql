create table if not exists public.chores (
  id bigserial primary key,
  title text not null,
  cadence text not null default 'weekly',
  point_value integer not null default 0,
  requires_proof boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table public.chores
  add column if not exists title text;

alter table public.chores
  alter column title set not null;

alter table public.chores
  add column if not exists cadence text default 'weekly';

alter table public.chores
  alter column cadence set not null;

alter table public.chores
  add column if not exists point_value integer default 0;

alter table public.chores
  alter column point_value set not null;

alter table public.chores
  add column if not exists requires_proof boolean default false;

alter table public.chores
  alter column requires_proof set not null;

alter table public.chores
  add column if not exists created_at timestamp with time zone default now();

alter table public.chores
  alter column created_at set not null;

create unique index if not exists chores_title_key on public.chores (title);

alter table public.chores enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chores'
      and policyname = 'Authenticated users manage chore templates'
  ) then
    create policy "Authenticated users manage chore templates"
      on public.chores
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end
$$;

insert into public.chores (title, cadence, point_value, requires_proof)
values
  ('Take out trash & recycling', 'daily', 10, false),
  ('Sanitize kitchen surfaces', 'weekly', 25, true),
  ('Deep clean shared bathroom', 'weekly', 30, true),
  ('Vacuum and mop common areas', 'weekly', 20, false),
  ('Restock household supplies', 'biweekly', 15, false),
  ('Coordinate shared grocery run', 'biweekly', 20, true),
  ('Water shared plants', 'weekly', 10, false)
on conflict (title) do update set
  cadence = excluded.cadence,
  point_value = excluded.point_value,
  requires_proof = excluded.requires_proof;
