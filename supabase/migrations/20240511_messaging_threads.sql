create extension if not exists "pgcrypto" with schema public;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  parent_thread_id uuid null references public.threads(id) on delete cascade,
  title text not null,
  topic text not null,
  summary text null,
  metadata jsonb null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threads_household_id_created_at_idx on public.threads(household_id, created_at desc);
create index if not exists threads_parent_thread_id_idx on public.threads(parent_thread_id);

alter table public.threads enable row level security;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  parent_message_id uuid null references public.messages(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messages_thread_id_created_at_idx on public.messages(thread_id, created_at);
create index if not exists messages_parent_message_id_idx on public.messages(parent_message_id);

alter table public.messages enable row level security;

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  bucket_id text not null default 'docs',
  file_name text not null,
  file_size bigint null,
  content_type text null,
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_message_id_idx on public.message_attachments(message_id);
create index if not exists message_attachments_storage_path_idx on public.message_attachments(storage_path);

alter table public.message_attachments enable row level security;

alter table public.profiles
  add column if not exists household_id uuid references public.households(id) on delete set null;

create index if not exists profiles_household_id_idx on public.profiles(household_id);

create policy "Members can view their households" on public.households
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = households.id
    )
  );

create policy "Members can insert households" on public.households
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
    )
  );

create policy "Members can update their households" on public.households
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = households.id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = households.id
    )
  );

create policy "Members can read threads" on public.threads
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = threads.household_id
    )
  );

create policy "Members can insert threads" on public.threads
  for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id = threads.household_id
    )
  );

create policy "Thread creators can update threads" on public.threads
  for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Thread creators can delete threads" on public.threads
  for delete
  using (auth.uid() = created_by);

create policy "Members can read messages" on public.messages
  for select
  using (
    exists (
      select 1
      from public.threads t
      join public.profiles p on p.id = auth.uid()
      where t.id = messages.thread_id
        and p.household_id = t.household_id
    )
  );

create policy "Members can insert messages" on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.threads t
      join public.profiles p on p.id = auth.uid()
      where t.id = messages.thread_id
        and p.household_id = t.household_id
    )
  );

create policy "Senders can update their messages" on public.messages
  for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy "Senders can delete their messages" on public.messages
  for delete
  using (auth.uid() = sender_id);

create policy "Members can read message attachments" on public.message_attachments
  for select
  using (
    exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.profiles p on p.id = auth.uid()
      where m.id = message_attachments.message_id
        and p.household_id = t.household_id
    )
  );

create policy "Senders can insert message attachments" on public.message_attachments
  for insert
  with check (
    exists (
      select 1
      from public.messages m
      join public.threads t on t.id = m.thread_id
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.household_id = t.household_id
        )
    )
  );

create policy "Senders can delete message attachments" on public.message_attachments
  for delete
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
    )
  );

create policy "Household docs read" on storage.objects
  for select
  using (
    bucket_id = 'docs'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id is not null
        and p.household_id::text = split_part(name, '/', 1)
    )
  );

create policy "Household docs insert" on storage.objects
  for insert
  with check (
    bucket_id = 'docs'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id is not null
        and p.household_id::text = split_part(name, '/', 1)
    )
  );

create policy "Household docs delete" on storage.objects
  for delete
  using (
    bucket_id = 'docs'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id is not null
        and p.household_id::text = split_part(name, '/', 1)
    )
  );
