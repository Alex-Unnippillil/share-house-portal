create extension if not exists "pgcrypto";

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  household_id uuid not null,
  thread_id uuid not null,
  author_id uuid not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb
);

alter table public.messages enable row level security;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_messages_updated_at
before update on public.messages
for each row
execute function public.set_updated_at_timestamp();

create index if not exists idx_messages_thread_created
  on public.messages (thread_id, created_at);

create index if not exists idx_messages_household_created
  on public.messages (household_id, created_at);

create policy "Authenticated users can read messages"
  on public.messages
  for select
  to authenticated
  using (true);

create policy "Users can insert their own messages"
  on public.messages
  for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Users can update their own messages"
  on public.messages
  for update
  to authenticated
  using (auth.uid() = author_id);

create policy "Users can delete their own messages"
  on public.messages
  for delete
  to authenticated
  using (auth.uid() = author_id);
