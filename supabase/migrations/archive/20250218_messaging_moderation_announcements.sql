-- Messaging moderation + announcements support

alter table if exists public.threads
  add column if not exists unit_id uuid,
  add column if not exists property_id uuid,
  add column if not exists thread_type text default 'discussion',
  add column if not exists scheduled_for timestamptz,
  add column if not exists announcement_visible_from timestamptz,
  add column if not exists announcement_visible_until timestamptz,
  add column if not exists locked boolean not null default false,
  add column if not exists flagged_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists threads_scope_idx on public.threads (property_id, unit_id, deleted_at, scheduled_for);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  property_id uuid,
  unit_id uuid,
  thread_id uuid references public.threads(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_event_created_idx on public.audit_logs (event_type, created_at desc);
create index if not exists audit_logs_scope_idx on public.audit_logs (property_id, unit_id);
