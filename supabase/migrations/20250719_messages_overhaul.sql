create extension if not exists "pgcrypto";

drop table if exists public.chat cascade;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tenant_role') then
    create type public.tenant_role as enum ('tenant', 'roommate', 'property_manager', 'admin');
  end if;
end $$;

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint units_unique_name_per_building unique (building_id, lower(name))
);

alter table public.profiles
  add column if not exists building_id uuid references public.buildings(id) on delete set null,
  add column if not exists unit_id uuid references public.units(id) on delete set null;

alter table public.profiles
  alter column role drop default;

update public.profiles set role = 'tenant' where role is null or role = 'user';

alter table public.profiles
  alter column role type public.tenant_role using (role::text::public.tenant_role),
  alter column role set default 'tenant';

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  pinned_message_id uuid,
  pinned_by uuid references public.profiles(id) on delete set null,
  pinned_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  parent_message_id uuid references public.messages(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_type text not null default 'text',
  metadata jsonb default '{}'::jsonb,
  status text not null default 'active',
  client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.messages add constraint messages_message_type_check check (message_type in ('text', 'poll', 'system'));
alter table public.messages add constraint messages_status_check check (status in ('active', 'flagged', 'deleted'));

alter table public.threads
  add constraint threads_pinned_message_fkey foreign key (pinned_message_id) references public.messages(id) on delete set null;

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  reaction text not null,
  created_at timestamptz not null default now(),
  constraint message_reactions_unique unique (message_id, profile_id, reaction)
);

create table public.message_moderation (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  action text not null,
  reason text,
  performed_by uuid references public.profiles(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint message_moderation_action_check check (action in ('pin', 'unpin', 'flag', 'unflag', 'delete', 'restore'))
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.messages_set_scope()
returns trigger as $$
declare
  thread_record record;
begin
  select building_id, unit_id into thread_record from public.threads where id = new.thread_id;
  if not found then
    raise exception 'Thread % does not exist', new.thread_id;
  end if;
  new.building_id := thread_record.building_id;
  if thread_record.unit_id is not null then
    if new.unit_id is not null and new.unit_id <> thread_record.unit_id then
      raise exception 'Message unit mismatch for thread %', new.thread_id;
    end if;
    new.unit_id := thread_record.unit_id;
  else
    new.unit_id := null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.message_reactions_set_scope()
returns trigger as $$
declare
  message_record record;
begin
  select building_id, unit_id into message_record from public.messages where id = new.message_id;
  if not found then
    raise exception 'Message % does not exist', new.message_id;
  end if;
  new.building_id := message_record.building_id;
  new.unit_id := message_record.unit_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.message_moderation_set_scope()
returns trigger as $$
declare
  message_record record;
begin
  select thread_id, building_id, unit_id into message_record from public.messages where id = new.message_id;
  if not found then
    raise exception 'Message % does not exist', new.message_id;
  end if;
  new.thread_id := coalesce(new.thread_id, message_record.thread_id);
  new.building_id := message_record.building_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.touch_thread_after_message()
returns trigger as $$
declare
  target uuid;
  reference_time timestamptz;
begin
  target := coalesce(new.thread_id, old.thread_id);
  reference_time := coalesce(new.created_at, old.created_at, now());
  update public.threads
     set last_message_at = greatest(reference_time, last_message_at),
         updated_at = now()
   where id = target;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create or replace function public.unpin_on_message_removal()
returns trigger as $$
declare
  message_id uuid;
begin
  message_id := coalesce(new.id, old.id);
  update public.threads
     set pinned_message_id = null,
         pinned_by = null,
         pinned_at = null
   where pinned_message_id = message_id
     and (tg_op = 'DELETE' or new.status = 'deleted');
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger set_timestamp_threads before update on public.threads
for each row execute function public.set_updated_at();

create trigger set_timestamp_messages before update on public.messages
for each row execute function public.set_updated_at();

create trigger messages_scope before insert on public.messages
for each row execute function public.messages_set_scope();

create trigger message_reactions_scope before insert on public.message_reactions
for each row execute function public.message_reactions_set_scope();

create trigger message_moderation_scope before insert on public.message_moderation
for each row execute function public.message_moderation_set_scope();

create trigger touch_thread_after_message_insert after insert on public.messages
for each row execute function public.touch_thread_after_message();

create trigger touch_thread_after_message_update after update on public.messages
for each row execute function public.touch_thread_after_message();

create trigger touch_thread_after_message_delete after delete on public.messages
for each row execute function public.touch_thread_after_message();

create trigger unpin_on_message_update after update on public.messages
for each row execute function public.unpin_on_message_removal();

create trigger unpin_on_message_delete after delete on public.messages
for each row execute function public.unpin_on_message_removal();

alter table public.buildings enable row level security;
alter table public.units enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_moderation enable row level security;

create policy "Tenants can read their building" on public.buildings
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = buildings.id
  )
);

create policy "Staff manage buildings" on public.buildings
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('property_manager', 'admin')
  )
);

create policy "Tenants can read their units" on public.units
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = units.building_id
      and (p.role in ('property_manager', 'admin') or p.unit_id = units.id)
  )
);

create policy "Staff manage units" on public.units
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('property_manager', 'admin')
  )
);

create policy "View threads in building" on public.threads
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = threads.building_id
      and (
        p.role in ('property_manager', 'admin')
        or threads.unit_id is null
        or p.unit_id = threads.unit_id
      )
  )
);

create policy "Create threads" on public.threads
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = threads.building_id
      and (
        p.role in ('property_manager', 'admin')
        or p.unit_id = threads.unit_id
        or threads.unit_id is null
      )
  )
);

create policy "Update threads" on public.threads
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = threads.building_id
      and (
        p.role in ('property_manager', 'admin')
        or threads.created_by = p.id
      )
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = threads.building_id
      and (
        p.role in ('property_manager', 'admin')
        or threads.created_by = p.id
      )
  )
);

create policy "Delete threads" on public.threads
for delete using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = threads.building_id
      and p.role in ('property_manager', 'admin')
  )
);

create policy "View messages" on public.messages
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = messages.building_id
      and (
        p.role in ('property_manager', 'admin')
        or messages.unit_id is null
        or p.unit_id = messages.unit_id
      )
  )
);

create policy "Create messages" on public.messages
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = messages.building_id
      and (
        p.role in ('property_manager', 'admin')
        or p.unit_id = messages.unit_id
        or messages.unit_id is null
      )
  )
);

create policy "Update messages" on public.messages
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = messages.building_id
      and (
        p.role in ('property_manager', 'admin')
        or messages.author_id = p.id
      )
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = messages.building_id
      and (
        p.role in ('property_manager', 'admin')
        or messages.author_id = p.id
      )
  )
);

create policy "Delete messages" on public.messages
for delete using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = messages.building_id
      and p.role in ('property_manager', 'admin')
  )
);

create policy "View reactions" on public.message_reactions
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = message_reactions.building_id
      and (
        p.role in ('property_manager', 'admin')
        or message_reactions.unit_id is null
        or p.unit_id = message_reactions.unit_id
      )
  )
);

create policy "React to messages" on public.message_reactions
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = message_reactions.building_id
      and (
        p.role in ('property_manager', 'admin')
        or message_reactions.unit_id is null
        or p.unit_id = message_reactions.unit_id
      )
  )
);

create policy "Remove reactions" on public.message_reactions
for delete using (
  message_reactions.profile_id = auth.uid()
);

create policy "View moderation" on public.message_moderation
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = message_moderation.building_id
  )
);

create policy "Moderate messages" on public.message_moderation
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.building_id = message_moderation.building_id
      and p.role in ('property_manager', 'admin')
  )
);

create index if not exists threads_building_idx on public.threads (building_id, unit_id, last_message_at desc);
create index if not exists threads_created_by_idx on public.threads (created_by);
create index if not exists messages_thread_idx on public.messages (thread_id, created_at);
create index if not exists messages_author_idx on public.messages (author_id);
create index if not exists message_reactions_message_idx on public.message_reactions (message_id);
create index if not exists message_moderation_message_idx on public.message_moderation (message_id);
