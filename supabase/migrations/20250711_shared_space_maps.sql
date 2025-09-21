create extension if not exists "pgcrypto";

create table if not exists public.shared_space_maps (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    tenant_id uuid not null references public.profiles(id) on delete cascade,
    lease_id uuid not null,
    unit_id uuid,
    bucket_id text not null default 'shared-space-maps',
    file_path text not null,
    title text not null,
    description text,
    room_labels jsonb not null default '[]'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    diagram_updated_at timestamptz not null default now(),
    constraint shared_space_maps_lease_file_key unique (tenant_id, lease_id, file_path)
);

comment on column public.shared_space_maps.room_labels is
    'Array of labels with normalized x/y positions and optional descriptions for overlay rendering.';

create index if not exists shared_space_maps_tenant_idx on public.shared_space_maps (tenant_id);
create index if not exists shared_space_maps_lease_idx on public.shared_space_maps (lease_id);

create or replace function public.handle_shared_space_maps_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_shared_space_maps_updated_at
before update on public.shared_space_maps
for each row
execute function public.handle_shared_space_maps_updated_at();

alter table public.shared_space_maps enable row level security;

create policy "Tenants can view their shared space maps"
    on public.shared_space_maps
    for select
    to authenticated
    using (
        tenant_id = auth.uid()
    );

create policy "Admins can manage shared space maps"
    on public.shared_space_maps
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and coalesce(p.role, 'user') = 'admin'
        )
    )
    with check (
        exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and coalesce(p.role, 'user') = 'admin'
        )
    );
