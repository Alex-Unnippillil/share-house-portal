create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin is 'Returns true when the current authenticated user has the admin role.';

create table if not exists public.community_channels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  topic text,
  building text,
  created_by uuid references public.profiles(id) on delete set null,
  pinned_message_id uuid
);

alter table public.community_channels enable row level security;

create index if not exists community_channels_topic_idx on public.community_channels(topic);
create index if not exists community_channels_building_idx on public.community_channels(building);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  channel_id uuid not null references public.community_channels(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  parent_id uuid references public.community_messages(id) on delete cascade,
  title text,
  content text not null,
  is_deleted boolean not null default false,
  is_pinned boolean not null default false
);

alter table public.community_messages enable row level security;

alter table public.community_channels
  add constraint community_channels_pinned_message_id_fkey
  foreign key (pinned_message_id) references public.community_messages(id) on delete set null;

create index if not exists community_messages_channel_id_idx on public.community_messages(channel_id);
create index if not exists community_messages_parent_id_idx on public.community_messages(parent_id);
create index if not exists community_messages_created_at_idx on public.community_messages(created_at);

create policy "Authenticated users can view community channels" on public.community_channels
  for select to authenticated
  using (true);

create policy "Admins manage community channels" on public.community_channels
  for insert to authenticated
  with check (public.is_admin());

create policy "Admins update community channels" on public.community_channels
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete community channels" on public.community_channels
  for delete to authenticated
  using (public.is_admin());

create policy "Authenticated users can view community messages" on public.community_messages
  for select to authenticated
  using (true);

create policy "Residents can post community messages" on public.community_messages
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('resident', 'user', 'admin')
    )
  );

create policy "Authors can edit their community messages" on public.community_messages
  for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and coalesce(is_pinned, false) = false
  );

create policy "Admins moderate community messages" on public.community_messages
  for update to authenticated
  using (public.is_admin())
  with check (true);

create policy "Admins delete community messages" on public.community_messages
  for delete to authenticated
  using (public.is_admin());
