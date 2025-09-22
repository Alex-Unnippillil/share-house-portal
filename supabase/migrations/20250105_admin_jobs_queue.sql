-- Create table to manage asynchronous admin jobs for bulk operations
create table if not exists public.admin_jobs (
    id uuid primary key default gen_random_uuid(),
    type text not null check (type in ('status_update', 'notification')),
    status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
    payload jsonb not null,
    result jsonb,
    total_tasks integer not null default 0,
    processed_tasks integer not null default 0,
    error text,
    requested_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    cancelled_at timestamptz,
    last_progress_at timestamptz
);

create index if not exists admin_jobs_status_idx on public.admin_jobs (status);
create index if not exists admin_jobs_created_at_idx on public.admin_jobs (created_at desc);

create or replace function public.update_admin_jobs_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_update_admin_jobs_updated_at
before update on public.admin_jobs
for each row
execute function public.update_admin_jobs_updated_at();

alter table public.profiles
    add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'invited', 'suspended'));
