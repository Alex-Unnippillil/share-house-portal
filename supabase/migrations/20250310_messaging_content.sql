create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content_html text not null,
  content_markdown text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists messages_thread_id_idx on public.messages (thread_id);
create index if not exists messages_thread_created_at_idx on public.messages (thread_id, created_at desc);

create trigger set_public_messages_updated_at
  before update on public.messages
  for each row
  execute procedure public.update_updated_at_column();
